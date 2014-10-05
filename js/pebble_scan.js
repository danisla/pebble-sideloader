(function() {
  var PebbleScanner;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  PebbleScanner = (function() {
    function PebbleScanner(start_address, end_address) {
      this.startScan = __bind(this.startScan, this);
      this.start_address;
      this.end_address;
    }

    PebbleScanner.prototype.testIp = function(ip) {
      var dfd, mPebble, timeout;
      this.mPebble = mPebble;

      dfd = $.Deferred();
      mPebble = null;
      try {
        mPebble = new Pebble(ip);

        mPebble.on('open', (function(_this) {
          return function() {
            console.log("Opened", ip);
            mPebble.close();
            clearTimeout(timeout);
            dfd.notify(true,ip);
            dfd.resolve(ip);
          };
        })(this));

        mPebble.on('error', (function(_this) {
          return function() {
            console.log("Error", ip);
            dfd.resolve(null);
            mPebble.close();
          };
        })(this));

        timeout = setTimeout(function() {
          console.log("Timeout:",ip);
          try {
            mPebble.close();
          } catch (e) { }
          dfd.resolve(null);
        }, 10000);

      } catch (_error) {
        console.log("Failed Open: ",ip);
        dfd.reject("Failed to connect to: " + ip);
        dfd.resolve(null);
      }
      return dfd.promise();
    };

    PebbleScanner.prototype.startScan = function() {
      var dfd, mPebble;
      dfd = $.Deferred();

      var dfds = [];

      var found_ips = [];
      this.found_ips = found_ips;

      var notify_handler = function(status, ip) {
        console.log("Notifiy ip:",ip);
        if (status)
          found_ips.push(ip)
      };

      for (var i=20; i < 100; i++) {
        this.testIp("172.20.1."+i).progress(notify_handler);
      }

      for (var i=20; i < 100; i++) {
        this.testIp("172.20.2."+i).progress(notify_handler);
      }

      $.when.apply(null, dfds).done(function() {
        console.log("All Done");
      });

      return dfd.promise();
    };

    return PebbleScanner;

  })();

  // Export
  this.PebbleScanner = PebbleScanner
}).call(this);
