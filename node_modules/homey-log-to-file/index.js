const fs                   = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const http                 = require('http');

module.exports = async (logfile = '/userdata/std.log', port = 8008, flags = 'w') => {
  const { hookStd } = await import('hook-std');
  const fh          = await fs.open(logfile, flags);

  // Create HTTP server that will serve the file
  http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; ; charset=utf-8' });
    createReadStream(logfile).pipe(res);
  }).listen(port);

  // Capture stdout/stderr and write to file
  hookStd({ silent : false }, output => { fh.write(output) });
}
