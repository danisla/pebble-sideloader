function ga() {
  return;
}
Pebble = function(proxy, token) {
    var self = this;
    var mProxy = proxy;
    var mToken = token;
    var mSocket;
    var mAppLogEnabled = false;
    var mHasConnected = false;
    var mIncomingImage = null;

    _.extend(this, Backbone.Events);

    PebbleProtocolParser = function() {
        var mReassemblyBuffer = new Uint8Array(0);

        this.addBytes = function(bytes) {
            // Buffers cannot grow, so we have to do this:
            var newBuffer = new Uint8Array(mReassemblyBuffer.length + bytes.length);
            newBuffer.set(mReassemblyBuffer, 0);
            newBuffer.set(bytes, mReassemblyBuffer.length);
            mReassemblyBuffer = newBuffer;
        };

        this.readMessage = function() {
            if(mReassemblyBuffer.length < 4) {
                return null;
            }
            var parts = unpack("HH", mReassemblyBuffer.subarray(0, 4));
            var size = parts[0];
            var command = parts[1];
            // If we don't have enough data, try again the next time we get some.
            if(size > mReassemblyBuffer.length) {
                return null;
            }
            var message = mReassemblyBuffer.subarray(4, 4 + size);
            // Leave the remainder of the message in place for our next call.
            mReassemblyBuffer = mReassemblyBuffer.subarray(4 + size);
            return {
                command: command,
                size: size,
                message: message
            }
        }
    };

    var init = function() {
        //mSocket = new PebbleProxySocket(mProxy, mToken);
        //mSocket = new PebbleProxySocket(mProxy, mToken);
        //mSocket = new WebSocket("ws://"+mProxy+":9000");
        mSocket = new PebbleMixedContent(mProxy, 9000);
        mSocket.on('error', handle_socket_error);
        mSocket.on('close', handle_socket_close);
        mSocket.on('open', handle_socket_open);
        mSocket.on('message', handle_socket_message);
        mSocket.on('all', handle_proxysocket_event); // special message
        console.log("Starting connection");
        mSocket.connect();
    };

    this.ping = function() {
        send_message("PING", pack("bL", [0, 0xDEADBEEF]));
    };

    var mIsInstalling = false;
    this.install_app = function(url) {
        console.log("Starting install process.");
        var request = new XMLHttpRequest();
        request.open('get', url, true);
        request.responseType = "arraybuffer";
        putbytes_sent = 0;
        request.onload = function(event) {
            var buffer = request.response;
            if(buffer) {
                buffer = new Uint8Array(buffer);
                var final_buffer = new Uint8Array(buffer.length + 1);
                final_buffer.set(buffer, 1);
                final_buffer.set([4]);
                mSocket.send(final_buffer);
                mIsInstalling = true;
                console.log("Sent install message.");
            }
        };
        request.send();
    };

    this.enable_app_logs = function() {
        enable_app_logs();
    };

    this.disable_app_logs = function() {
        disable_app_logs();
    };

    this.set_time = function(time) {
        time = (time / 1000) | 0;
        send_message("TIME", pack("bI", [0x02, time]));
    };

    this.close = function() {
        console.error('closing');
        try {
            disable_app_logs();
        } catch(e) {
            // pass.
        }
        if(mSocket)
            mSocket.close();
        mSocket = null;
    };

    this.is_connected = function() {
        return mSocket && mSocket.isOpen();
    };

    var enable_app_logs = function() {
        if(!mAppLogEnabled) {
            console.log("Enabling app logs.");
            send_message("APP_LOGS", [1]);
            mAppLogEnabled = true;
        }
    };

    var disable_app_logs = function() {
        if(mAppLogEnabled) {
            console.log("Disabling app logs.");
            send_message("APP_LOGS", [0]);
            mAppLogEnabled = false;
        }
    };

    var handle_socket_error = function(e) {
        console.log("Socket error: " + e);
        self.trigger('error', e);
        ga('send', 'event', 'phone-error');
    };

    var handle_socket_open = function(e) {
        console.log("Socket open");
        mHasConnected = true;
        ga('send', 'event', 'phone-connect', 'success');
        self.trigger('open');
    };

    var handle_socket_close = function(e) {
        console.log("Socked closed.");
        if(!e.wasClean) {
            console.log("Close was unexpected.");
            if(!mHasConnected) {
                self.trigger("error", "Connection to the phone failed. Check the IP and that developer mode is active.");
                ga('send', 'event', 'phone-connect', 'failed');
            } else {
                self.trigger("error", "Connection to the phone was interrupted.");
                ga('send', 'event', 'phone-disconnect', 'dirty');
            }
        } else {
            ga('send', 'event', 'phone-disconnect', 'clean');
        }
        self.trigger('close');
    };

    var handle_socket_message = function(data) {
        var origin = data[0];
        if(origin == 5) {
            var result = unpack("I", data.subarray(1, 5));
            console.log("Received status update: ", result);
            mIsInstalling = false;
            self.trigger("status", result[0]);
        } else if(origin == 2) {
            var decoder = new TextDecoder('utf-8');
            var phone_log = decoder.decode(data.subarray(1));
            self.trigger('phone_log', phone_log);
        } else if(origin == 1) {
            handle_message_to_watch(data.subarray(1));
        } else if(origin === 0) {
            handle_message_from_watch(data.subarray(1));
        } else if(origin == 0x0a) {
            handle_config_message(data.subarray(1));
        }
    };

    var mInboundParser = new PebbleProtocolParser();
    var mOutboundParser = new PebbleProtocolParser();

    var handle_message_from_watch = function(pdata) {
        mInboundParser.addBytes(pdata);
        while((data = mInboundParser.readMessage())) {
            var command = data.command;
            var message = data.message;
            try {
                if (command == ENDPOINTS.APP_LOGS) {
                    handle_app_log(message);
                } else if (command == ENDPOINTS.SCREENSHOT) {
                    handle_screenshot(message);
                } else if (command == ENDPOINTS.VERSION) {
                    handle_version(message);
                } else if (command == ENDPOINTS.FACTORY_SETTINGS) {
                    handle_factory_setting(message);
                } else if (command == ENDPOINTS.PUTBYTES) {
                    handle_receive_putbytes(message);
                }
            }
            catch (e) {
                console.error("Exception handling message!", data.command);
                console.error(e);
            }
        }
    };

    var handle_message_to_watch = function(data) {
        mOutboundParser.addBytes(data);
        while((data = mOutboundParser.readMessage())) {
            if (data.command == ENDPOINTS.PUTBYTES) {
                handle_send_putbytes(data.message);
            }
        }
    };

    var handle_proxysocket_event = function(event) {
        if(event.substr(0, 6) == "proxy:") {
            self.trigger(event);
        }
    };

    var handle_config_message = function(data) {
        var command = data[0];
        if(command == 0x01) {
            console.log(data);
            var length = unpack("I", data.subarray(1))[0];
            console.log(length);
            var url = unpack("S" + length, data.subarray(5))[0];
            console.log("opening url: " + url);
            var hash_parts = url.split('#');
            var query_parts = url.split('?');
            console.log(hash_parts, query_parts);
            if(query_parts.length == 1) {
                query_parts.push('');
            }
            if(query_parts[1] != '') {
                query_parts[1] += '&';
            }
            query_parts[1] += 'return_to=' + escape(location.protocol + '//' + location.host + '/ide/emulator/config?');
            var new_url = query_parts.join('?');
            if(hash_parts.length > 1) {
                new_url += '#' + hash_parts[1];
            }
            console.log("new url: " + new_url);

            var configWindow = window.open(new_url, "emu_config", "width=375,height=567");
            function poll() {
                var spamInterval = setInterval(function () {
                    if (configWindow.location && configWindow.location.host) {
                        $(configWindow).off();
                        clearInterval(spamInterval);
                        console.log("there!");
                        configWindow.postMessage('hi', '*');
                        $(window).one('message', function (event) {
                            var config = event.originalEvent.data;
                            console.log('got config data: ', config);
                            var data = new Uint8Array(pack("BBIS", [0x0a, 0x02, config.length, config]));
                            console.log(data);
                            mSocket.send(data);
                            configWindow.close();
                        });
                    } else if (configWindow.closed) {
                        console.log('it closed.');
                        clearInterval(spamInterval);
                        $(window).off('message');
                        var data = new Uint8Array(pack("BB", [0x0a, 0x03]));
                        mSocket.send(data);
                    }
                }, 1000);
            }
            if(!configWindow) {
                CloudPebble.Prompts.Confirm("Config page", "It looks like you have a popup blocker enabled. Click continue to open the config page.", function() {
                    configWindow = window.open(new_url, "emu_config", "width=375,height=567");
                    poll();
                });
            } else {
                poll();
            }
        }
    };

    var putbytes_sent = 0;
    var putbytes_pending_ack = 0;
    var putbytes_cookie = null;
    var handle_send_putbytes = function(message) {
        var command = unpack("B", [message[0]]);
        if(command == 0x02) { // put
            var parts = unpack("II", message.subarray(1, 9));
            putbytes_cookie = parts[0];
            putbytes_pending_ack = parts[1];
        }
    };
    var handle_receive_putbytes = function(message) {
        var parts = unpack("BI", message);
        if(parts[1] === putbytes_cookie) {
            if(parts[0] == 0x01) { // ACK
                putbytes_sent += putbytes_pending_ack;
                if(mIsInstalling) {
                    console.log("Install progress: " + putbytes_sent + " bytes.");
                    self.trigger('install:progress', putbytes_sent);
                }
            }
            putbytes_pending_ack = 0;
            putbytes_cookie = null;
        }
    };

    var handle_app_log = function(data) {
        console.log("Received app log.");
        var decoder = new TextDecoder('utf-8');
        var metadata = unpack("IBBH", data.subarray(16, 24));
        var filename = bytes_to_string(data.subarray(24, 40));
        var message = decoder.decode(data.subarray(40, 40+metadata[2]));
        var level = metadata[1];
        var line = metadata[3];
        self.trigger("app_log", level, filename, line, message);
    };

    var string_to_bytes = function(string) {
        var bytes = [];
        for(var i = 0; i < string.length; ++i) {
            bytes.push(string.charCodeAt(i));
        }
        return bytes;
    };

    var bytes_to_string = function(bytes) {
        var end = null;
        for(var i = 0; i  < bytes.length; ++i) {
            if(bytes[i] == 0) {
                end = i;
                break;
            }
        }
        if(end !== null) {
            bytes = bytes.subarray(0, end);
        }
        var decoder = new TextDecoder('utf-8');
        return decoder.decode(bytes);
    };

    this.request_version = function() {
        console.log("Requesting watch version.");
        send_message('VERSION', pack("B", 0x00));
    };

    var hexify = function(list) {
        var result = '';
        _.each(list, function(number) {
            var hex = number.toString(16);
            while(hex.length < 2) hex = '0' + hex;
            result += hex;
        });
        return result;
    };

    var handle_version = function(message) {
        console.log("Received watch version.");
        var result = unpack("BIS32S8BBBIS32S8BBBIS9S12BBBBBBIIS16", message);
        if(result[0] != 1) return;
        self.trigger('version', {
            running: {
                timestamp: result[1],
                version: result[2],
                git: result[3],
                is_recovery: !!result[4],
                platform_version: result[5],
                metadata_version: result[6]
            },
            recovery: {
                timestamp: result[7],
                version: result[8],
                git: result[9],
                is_recovery: !!result[10],
                platform_version: result[11],
                metadata_version: result[12]
            },
            bootloader_version: result[13],
            board_revision: result[14],
            serial_number: result[15],
            device_address: hexify(result.slice(16, 22).reverse()),
            resources: {
                crc: result[22],
                timestamp: result[23],
                XXXXXXXXXXXXXXX: result[24]
            }
        });
    };

    var request_factory_setting = function(key) {
        console.log("Requesting factory settings.");
        send_message('FACTORY_SETTINGS', pack('BB', [0x00, key.length]).concat(string_to_bytes(key)));
    };

    this.request_colour = function() {
        console.log("Requesting colour");
        request_factory_setting('mfg_color');

        var colour_mapping = {
            1: 'tintin-black',
            2: 'tintin-white',
            3: 'tintin-red',
            4: 'tintin-orange',
            5: 'tintin-grey',
            6: 'bianca-silver',
            7: 'bianca-black',
            8: 'tintin-blue',
            9: 'tintin-green',
            10: 'tintin-pink'
        };

        var handle_colour = function(data) {
            self.off('factory_setting:result', handle_colour);
            var colour_id = unpack('I', data)[0];
            var colour_name = colour_mapping[colour_id] || 'unknown';
            self.trigger('colour', colour_name);
        };

        var handle_failure = function() {
            self.off('factory_setting:error', handle_failure);
            console.log("The attached watch has no concept of colour! So, red.");
            self.trigger('colour', 'tintin-red');
        };

        self.on('factory_setting:result', handle_colour);
        self.on('factory_setting:error', handle_failure);
    };


    var handle_factory_setting = function(data) {
        console.log("Received factory settings.");
        if(data.length < 2) {
            self.trigger('factory_setting:error');
            return;
        }
        var result = unpack('BB', data);
        var command_id = result[0];
        if(command_id == 0x01) {
            var strlen = result[1];
            var value = data.subarray(2, 2 + strlen);
            self.trigger('factory_setting:result', value);
        }
    };

    this.request_screenshot = function() {
        console.log("Requesting screenshot.");
        if(mIncomingImage !== null) {
            self.trigger('screenshot:error', "Cannot take a screenshot while a previous screenshot is processing.");
            return;
        }
        send_message("SCREENSHOT", "\x00");
    };

    this.request_config_page = function() {
        if(!self.is_connected()) {
            throw new Error("Cannot send on non-open socket.");
        }
        var data = new Uint8Array([0x0a, 0x01]);
        mSocket.send(data);
    };

    this.emu_set_battery_state = function(percent, charging) {
        send_qemu_command(QEmu.Battery, pack("bb", [percent, charging|0]));
    };

    var mButtonState = 0;
    var mButtonStateQueue = [];
    var mButtonStateTimer = null;

    this.emu_press_button = function(button, down) {
        var bit = 1 << button;
        if(down) {
            mButtonState |= bit;
        } else {
            mButtonState &= ~bit;
        }
        mButtonStateQueue.push(mButtonState);
        if(mButtonStateTimer === null) {
            handle_queue();
        }
    };

    var handle_queue = function() {
        mButtonStateTimer = null;
        if(mButtonStateQueue.length === 0) {
            return;
        }
        var state = mButtonStateQueue.shift();
        console.log(state);
        send_qemu_command(QEmu.Button, [state]);
        mButtonStateTimer = setTimeout(handle_queue, 100);
    };

    this.emu_tap = function(axis, direction) {
        send_qemu_command(QEmu.Tap, [axis, direction]);
    };

    this.emu_bluetooth = function(connected) {
        send_qemu_command(QEmu.BluetoothConnection, [connected]);
    };

    this.emu_set_accel = function(samples) {
        var message = [samples.length];
        _.each(samples, function(sample) {
            message = message.concat(pack("hhh", _.map(sample, function(x) { return (x / 0.00981)|0 })));
        });
        send_qemu_command(QEmu.Accel, message);
    };

    this.emu_set_compass = function(heading, calibration) {
        send_qemu_command(QEmu.Compass, pack("Ib", [(65536 - heading * 182.044)|0, calibration]));
    };

    var handle_screenshot = function(data) {
        console.log("Received screenshot fragment.");
        if(mIncomingImage === null) {
            data = read_screenshot_header(data);
            if(data === null) {
                mIncomingImage = null;
                return;
            }
        }
        mIncomingImage.data.set(data, mIncomingImage.received);
        mIncomingImage.received += data.length;
        self.trigger('screenshot:progress', mIncomingImage.received, mIncomingImage.length);
        if(mIncomingImage.received >= mIncomingImage.length) {
            self.trigger('screenshot:complete', decode_image(mIncomingImage));
            mIncomingImage = null;
        }
    };

    var decode_image = function(incoming_image) {
        var canvas = document.createElement('canvas');
        canvas.setAttribute('width', String(incoming_image.width));
        canvas.setAttribute('height', String(incoming_image.height));
        var context = canvas.getContext('2d');

        var image_data = context.createImageData(incoming_image.width, incoming_image.height);

        var expanded_data = new Uint8Array(incoming_image.width * incoming_image.height * 4);
        for(var i = 0; i < incoming_image.data.length; ++i) {
            for(var j = 0; j < 8; ++j) {
                var pixel = (incoming_image.data[i] >> j) & 1;
                var colour = pixel * 255;
                var pos = ((i*8)+j)*4;
                expanded_data[pos+0] = colour;
                expanded_data[pos+1] = colour;
                expanded_data[pos+2] = colour;
                expanded_data[pos+3] = 255; // always fully opaque.
            }
        }

        image_data.data.set(expanded_data);
        context.putImageData(image_data, 0, 0);
        var image = document.createElement('img');
        image.src = canvas.toDataURL();
        return image;
    };

    var read_screenshot_header = function(data) {
        var header_data = unpack("BIII", data.subarray(0, 13));
        var data = data.subarray(13);
        var response_code = header_data[0];
        var version = header_data[1];
        var width = header_data[2];
        var height = header_data[3];
        if(response_code !== 0) {
            self.trigger('screenshot:failed', "Internal watch error.");
            data = null;
        }
        if(version !== 1) {
            self.trigger('screenshot:failed', "Unrecognised image format.");
            data = null;
        }
        mIncomingImage = {
            data: new Uint8Array(width*height / 8),
            version: version,
            width: width,
            height: height,
            length: width * height / 8,
            received: 0
        };
        return data;
    };

    var ENDPOINTS = {
        "TIME": 11,
        "VERSION": 16,
        "PHONE_VERSION": 17,
        "SYSTEM_MESSAGE": 18,
        "MUSIC_CONTROL": 32,
        "PHONE_CONTROL": 33,
        "APPLICATION_MESSAGE": 48,
        "LAUNCHER": 49,
        "LOGS": 2000,
        "PING": 2001,
        "LOG_DUMP": 2002,
        "RESET": 2003,
        "APP": 2004,
        "APP_LOGS": 2006,
        "NOTIFICATION": 3000,
        "RESOURCE": 4000,
        "FACTORY_SETTINGS": 5001,
        "APP_MANAGER": 6000,
        "SCREENSHOT": 8000,
        "PUTBYTES": 48879
    };

    var QEmu = {
        SPP: 1,
        Tap: 2,
        BluetoothConnection: 3,
        Compass: 4,
        Battery: 5,
        Accel: 6,
        VibrationNotification: 7,
        Button: 8
    };

    var send_message = function(endpoint, message) {
        console.log("Sending message to " + endpoint + "(" + ENDPOINTS[endpoint] + ")");
        var data = new Uint8Array([1].concat(build_message(ENDPOINTS[endpoint], message)));
        if(!self.is_connected()) {
            throw new Error("Cannot send on non-open socket.");
        }
        mSocket.send(data);
    };

    var build_message = function(endpoint, data) {
        return pack('HH', [data.length, endpoint]).concat(data);
    };

    var send_qemu_command = function(protocol, message) {
        mSocket.send(new Uint8Array([0xb, protocol].concat(message)))
    };

    // Handy utility function to pack data.
    var pack = function(format, data) {
        var pointer = 0;
        var bytes = [];
        var encoder = new TextEncoder('utf-8');
        for(var i = 0; i < format.length; ++i) {
            if(pointer >= data.length) {
                throw new Error("Expected more data.");
            }
            var chr = format.charAt(i);
            switch(chr) {
            case "b":
            case "B":
                bytes.push(data[pointer++]);
                break;
            case "h":
            case "H":
                bytes.push((data[pointer] >> 8) & 0xFF);
                bytes.push(data[pointer] & 0xFF);
                ++pointer;
                break;
            case "l":
            case "L":
            case "i":
            case "I":
                bytes.push((data[pointer] >> 24) & 0xFF);
                bytes.push((data[pointer] >> 16) & 0xFF);
                bytes.push((data[pointer] >> 8) & 0xFF);
                bytes.push(data[pointer] & 0xFF);
                ++pointer;
                break;
            case "S":
                bytes = bytes.concat(Array.prototype.slice.call(encoder.encode(data[pointer])));
                ++pointer;
                break;
            }
        }
        return bytes;
    };

    var unpack = function(format, bytes) {
        var pointer = 0;
        var data = [];
        var decoder = new TextDecoder('utf-8');
        for(var i = 0; i < format.length; ++i) {
            if(pointer >= bytes.length) {
                console.error("ran out of bytes.", format, bytes);
                throw new Error("Expected more bytes");
            }
            var chr = format.charAt(i);
            switch(chr) {
            case "b":
            case "B":
                data.push(bytes[pointer++]);
                break;
            case "h":
            case "H":
                data.push((bytes[pointer] << 8) | bytes[pointer+1]);
                pointer += 2;
                break;
            case "l":
            case "L":
            case "i":
            case "I":
                data.push((bytes[pointer] << 24) | (bytes[pointer+1] << 16) | (bytes[pointer+2] << 8) | bytes[pointer+3]);
                pointer += 4;
                break;
            case "S":
                var len = '';
                while(format.charAt(i+1).match(/\d/)) {
                    len += format.charAt(++i);
                }
                len = parseInt(len, 10);
                var start = pointer;
                var end = pointer + len;
                while(pointer < end) {
                    if(bytes[pointer] === 0) break; // assume null-terminated strings.
                    ++pointer;
                }
                var stop = pointer;
                var stringBytes = bytes.subarray(start, stop);
                var output = decoder.decode(stringBytes);
                pointer = end;
                data.push(output);
                break;
            }
        }
        return data;
    };

    init();
};

Pebble.Button = {
    Back: 0,
    Up: 1,
    Select: 2,
    Down: 3
};

Pebble.version_to_platform = function(version) {
    var mapping = {
        0: 'aplite',
        1: 'aplite',
        2: 'aplite',
        3: 'aplite',
        4: 'aplite',
        5: 'aplite',
        6: 'aplite',
        7: 'basalt',
        8: 'basalt',
        0xFF: 'aplite',
        0xFE: 'aplite',
        0xFD: 'basalt',
        0xFC: 'basalt'
    };
    return mapping[version.running.platform_version];
};
