(function() {
  var PebbleInstall,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  PebbleInstall = (function() {
    function PebbleInstall(pbw_url) {
      this.startInstall = __bind(this.startInstall, this);
      this.pbw_url = pbw_url;
      this.messages = [];
      window.output_feedback = (function(_this) {
        return function(msg) {
          return _this.messages.push(msg);
        };
      })(this);
    }

    PebbleInstall.prototype.startInstall = function(ip) {
      var dfd, e, mPebble;
      dfd = $.Deferred();
      console.log("Installing " + this.pbw_url + " on target device: " + ip);
      mPebble = null;
      try {
        mPebble = new Pebble(ip);
      } catch (_error) {
        e = _error;
        console.log(e);
        dfd.reject("Error connecting to phone at: " + ip);
        throw(e);
        return dfd.promise();
      }
      mPebble.on('open', (function(_this) {
        return function() {
          return mPebble.install_app(_this.pbw_url);
        };
      })(this));
      mPebble.on('status', function(code) {
        if (code === 0) {
          dfd.resolve();
        } else {
          dfd.reject("Installation failed with error code " + code + ". Make sure you have enough slots free and check your phone for details.");
        }
        mPebble.close();
        return mPebble = null;
      });
      mPebble.on('error', (function(_this) {
        return function(e) {
          console.log(_this.messages.join(','));
          dfd.reject("Installation failed: Verify Developer Mode is enabled.");
          return mPebble = null;
        };
      })(this));
      return dfd.promise();
    };

    return PebbleInstall;

  })();

  // Export
  this.PebbleInstall = PebbleInstall
}).call(this);
