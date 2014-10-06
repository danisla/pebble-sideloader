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

## Screenshots

![sideloader_screenshot_1](https://cloud.githubusercontent.com/assets/323725/4528062/33240c66-4d6c-11e4-9165-351b3ec23b91.png)

![sideloader_screenshot_2](https://cloud.githubusercontent.com/assets/323725/4528061/331e1a68-4d6c-11e4-9ab8-d7b1e83f102b.png)

## Contributing

If you find this useful and want to make it better, please fork and create a pull request. Thanks!

## License

[MIT](LICENSE)
