function sendMessage() {
	Pebble.sendAppMessage({"status": 0});
}

Pebble.addEventListener("ready",
							function(e) {
							});

Pebble.addEventListener("showConfiguration", function() {
  console.log("showing configuration");
  Pebble.openURL('http://www.wgab.org/pebble-deployer/');
});

Pebble.addEventListener("appmessage",
							function(e) {
								console.log("Received Status: " + e.payload.status);
								sendMessage();
							});