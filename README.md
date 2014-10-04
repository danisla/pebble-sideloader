# Pebble Sideloader

Load JS apps to iOS through developer mode from browser.

Uses libraries from [CloudPebble](https://github.com/pebble/cloudpebble/tree/master/ide/static/ide/js/libpebble)

## Usage

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

## License

[MIT](LICENSE)
