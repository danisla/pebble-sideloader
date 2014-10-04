$(document).ready((function(_this) {
  var setup = function() {
    var last_ip;
    var pbw_installer;
    var iphone;
    var app_title;
    var pbw_url;
    var pbw_src;

    iphone = navigator.userAgent.match("iPhone") != null;

    $('.pbw-install').on('click', function(e) {
      pbw_src = $(e.currentTarget).data('pbwSrc');
      pbw_url = "" + window.location.protocol + "//" + window.location.host + pbw_src;
      app_title = $(e.currentTarget).text();

      pbw_installer = new PebbleInstall(pbw_src);

      $('#ios_install_panel').hide();
      $('#install_form .alert').hide();
      $('#modal_pebble_install').modal('show');
      $('.modal-header .modal-title').text(app_title);
      $('#android_install_link').attr('href', pbw_url);
      if (iphone) {
        return $('#iphone_install_image').click();
      }
      //e.preventDefault();
    });

    $('#iphone_install_image').on('click', function(e) {
      e.preventDefault();
      $("#device_install_links").show();
      if (iphone) {
        $("#device_install_links").hide();
      }
      return $('#ios_install_panel').fadeIn(function() {
        $("#phone-ip").focus();
      });
    });

    $('#install-on-phone-btn').on('click', function(e) {
      var ip;
      e.preventDefault();
      window.scrollTo(0, 0);
      ip = $("#phone-ip").val();
      if (!ip) {
        return $('#install_warning').text("No IP address given.").stop().fadeIn();
      } else {
        $('#install_form .alert').hide();
        $('#install_info').text("Installing " + app_title + " on Pebble...").fadeIn();
        return pbw_installer.startInstall(ip).done(function() {
          $('#install_form .alert').hide();
          return $('#install_success').text("Done!").fadeIn();
        }).fail(function(e) {
          $('#install_form .alert').hide();
          return $('#install_warning').text(e).stop().fadeIn();
        });
      }
    });

    $('#modal_pebble_install').on('hidden.bs.modal', function () {
      window.location.hash = "";
    })

    var parse_hash = function() {
      var hash = unescape(window.location.hash)
      return hash.replace("#","");
    };

    var hash_change = function(app_name) {
      if (typeof(app_name) == "undefined" || !app_name) {
        $('#modal_pebble_install').modal('hide');
        return;
      }

      // Check for app name in hash, if so start the installer.
      var app_el = $('a[data-pbw-src*="'+app_name+'"]');

      if (app_el.length > 0) {
        var app_title = app_el.text();
        if (!$('#modal_pebble_install').hasClass('in')) {
          console.log("Triggering install for: "+app_title+", per URL hash.");
          app_el.click();
        }
      } else {
        console.log("WARN: App in hash url not found: ", app_name);
      }
    };

    $(window).on('popstate', function(e) {
      hash_change(parse_hash());
    });

    // First trigger.
    hash_change(parse_hash());

    return null;
  };

  $.ajax("/apps.json").done(function(data) {
    console.log("Loading "+data.length+" apps from apps.json");

    $.each(data, function(i) {
      var app = this;
      var basename = app.path.replace(/^.*\/|\.[^.]*$/g, '');
      var list_el = $('#app_list');

      // Add each app to the menu.
      var li_el = '<li class="list-group-item"><a data-pbw-src="'+app.path+'" class="pbw-install" href="#'+basename+'"><img class="icon-pebble"></img>'+app.name+'</a></li>'
      list_el.append(li_el);
    });

    setup();

  }).fail(function(e, reason) {
    alert("Error reading apps.json: "+reason.toString());
  });
})(this));
