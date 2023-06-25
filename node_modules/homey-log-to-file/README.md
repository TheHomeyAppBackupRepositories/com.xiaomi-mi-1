# homey-log-to-file

Capture stdout/stderr of a Homey app and write it to a logfile (default: `/userdata/std.log`).

The logfile can be retrieved through an HTTP request to your Homey (default port: 8008)

## Installation

Add the package to your Homey app.
```
npm i robertklep/homey-log-to-file
```

## Usage

```
const LogToFile = require('homey-log-to-file');
...

class MyApp extends Homey.App {

  async onInit() {
    await LogToFile();
    ...
  }
}
```

Make sure to remove the call (and optionally the package itself) from your app before publishing to the app store.

## Configuration

```
async LogToFile(logfile = '/userdata/std.log', port = 8008, flags = 'w')
```

* `logfile`: file to write log statements to (`/userdata` is where apps can write persistent data to, and it's highly recommended to use this directory for the logfile)
* `port`: port on which the HTTP server will listen
* `flags`: [file system flags](https://nodejs.org/api/fs.html#file-system-flags) to use for the logfile (the default, `w`, will create or truncate the file; if you want to keep the logfile contents across restarts of your app, use `a`) 

## Retrieving the logfile contents

The contents of the logfile can be downloaded by making an HTTP request to `http://IP.OF.YOUR.HOMEY:PORT/`

```shell
curl http://192.168.1.8:8008/
```

