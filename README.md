# Pebble Sideloader

Load JS apps to iOS through developer mode from browser.

Uses libraries from [CloudPebble](https://github.com/pebble/cloudpebble/tree/master/ide/static/ide/js/libpebble)

## Usage

Clone the repo:

    git clone https://github.com/danisla/pebble-sideloader.git

Edit [apps.json](apps.json) with names and paths to your apps. You can add as many as you want.

    [
      {
        "name": "App 1",
        "path": "/app1.pbw"
      },
      {
        "name": "App 2",
        "path": "/app2.pbw"
      }
    ]

Run it locally with the command below or copy the source tree to your webserver.

    python -m SimpleHTTPServer
    
    open http://localhost:8000
    
## Demo

![pebble-sideloader-anim](https://cloud.githubusercontent.com/assets/323725/4515125/cdc841c0-4ba9-11e4-887d-44cfc52b7a1f.gif)

## Contributing

If you find this useful and want to make it better, please fork and create a pull request. Thanks!

## License

[MIT](LICENSE)
