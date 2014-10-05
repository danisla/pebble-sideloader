/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');
var Vector2 = require('vector2');
var libpebble = require('libpebble.js');

var main = new UI.Card({
  title: 'Pebble.js',
  icon: 'images/menu_icon.png',
  subtitle: 'Hello World!',
  body: 'Press any button.'
});

main.show();

console.log("libpebble", libpebble);

main.on('click', 'up', function(e) {
  var menu = new UI.Menu({
    sections: [{
      items: [{
        title: 'Pebble.js',
        icon: 'images/menu_icon.png',
        subtitle: 'Can do Menus'
      }, {
        title: 'Second Item',
        subtitle: 'Subtitle Text'
      }]
    }]
  });
  menu.on('select', function(e) {
    console.log('Selected item #' + e.itemIndex + ' of section #' + e.sectionIndex);
    console.log('The item is titled "' + e.item.title + '"');
  });
  menu.show();
});

main.on('click', 'select', function(e) {
  var wind = new UI.Window();
  var textfield = new UI.Text({
    position: new Vector2(0, 50),
    size: new Vector2(144, 30),
    font: 'gothic-24-bold',
    text: 'Installing PBW',
    textAlign: 'center'
  });
  wind.add(textfield);
  wind.show();

  var ip = "localhost";
  var mPebble;
  try {
	mPebble = new libpebble.Pebble(ip);
  } catch (_error) {
	console.log(_error);
  }
  mPebble.on('open', function() {
	var url = "http://www.wgab.org/pebble-deployer/PoolHelper.pbw";
	mPebble.install_app(url);
  });
  mPebble.on('status', function(code) {
	if (code === 0) {
		console.log("Install success");
	} else {
		console.log("Install error");
	}
	mPebble.close();
  });
  mPebble.on('error', function(_error) {
	console.log("Pebble connection error", _error);
  });
});

main.on('click', 'down', function(e) {
  var card = new UI.Card();
  card.title('A Card');
  card.subtitle('Is a Window');
  card.body('The simplest window type in Pebble.js.');
  card.show();
});
