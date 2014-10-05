var UI = require('ui');
var ajax = require('ajax');
var Vector2 = require('vector2');
var Settings = require('settings');

var parseFeed = function(data, quantity) {
  var items = [];
  for(var i = 0; i < quantity; i++) {
    // Always upper case the description string
    var title = data[i].name;
    var time = data[i].pbwfile;
    title = title.charAt(0).toUpperCase() + title.substring(1);
    
    // Add to menu items array
    items.push({
      title:title,
      subtitle:time
    });
  }

  // Finally return whole array
  return items;
};

// Show splash screen while waiting for data
var splashWindow = new UI.Window({
  backgroundColor:'white'
});

// Text element to inform user
var text = new UI.Text({
  position: new Vector2(0, 30),
  size: new Vector2(144, 40),
  text:'Downloading PBW Files',
  font:'GOTHIC_28_BOLD',
  color:'black',
  textOverflow:'wrap',
  textAlign:'center'
});

// Add to splashWindow and show
splashWindow.add(text);
splashWindow.show();

ajax(
  {
    url:'http://www.wgab.org/pebble-deployer/config/pebbleapps.json',
    type:'json'
  },
  function(data) {
    // Create an array of Menu items
    var menuItems = parseFeed(data, data.length);

    // Construct Menu to show to user
    var resultsMenu = new UI.Menu({
      sections: [{
        title: 'PBW Files',
        items: menuItems
      }]
    });

    // Add an action for SELECT
    resultsMenu.on('select', function(e) {
      var app = data[e.itemIndex];
      console.log(app.name, app.path);
    });

    // Show the Menu, hide the splash
    resultsMenu.show();
    splashWindow.hide();
  },
  function(error) {
    console.log('Download failed: ' + error);
  }
);


// Set a configurable with the open callback
Settings.config(
  { url: 'http://www.wgab.org/pebble-deployer/config' },
  function(e) {
    console.log('opening configurable');

    // Reset color to red before opening the webview
    //Settings.option('color', 'red');
  },
  function(e) {
    console.log('closed configurable');
  }
);

