'use strict'

// A static file server, so the page can be opened over http rather than as a
// `file://` url -- which a browser gives a null origin, and a null origin is
// refused by every CORS rule notes-api could reasonably have.
//
// It serves the repository root, not `public/`, because the page loads the two
// shared modules out of `src/` and those are the same files the tests require.
// Copying them into `public/` at start-up would be a build step, and the point
// of this repository is not having one.

const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')

const root = __dirname
const port = Number(process.env.PORT || 8080)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')

  // A REDIRECT, not `/` quietly serving `public/index.html`.
  //
  // Serving it in place looks identical in the response and breaks the page:
  // the browser resolves `style.css` and `app.js` against `/`, so both come
  // back 404 and what renders is unstyled html with no javascript. Sending the
  // browser to `/public/` first means relative paths in the document resolve
  // where the document actually lives.
  if (url.pathname === '/') {
    res.writeHead(302, { location: '/public/' + url.search })
    return res.end()
  }

  const wanted = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname

  // Resolved and then checked against the root. A path is not safe because it
  // has no `..` in it -- it is safe because where it landed is still inside
  // the directory being served, and that is a question only the resolved path
  // can answer.
  const file = path.resolve(root, '.' + decodeURIComponent(wanted))
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.writeHead(403, { 'content-type': 'text/plain' })
    return res.end('outside the served directory\n')
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain' })
      return res.end('not found\n')
    }
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
      // A fixture that is edited constantly. A cached copy of the file you
      // just changed is a debugging session about nothing.
      'cache-control': 'no-store'
    })
    res.end(data)
  })
}).listen(port, () => {
  console.log(`notes-ui on http://localhost:${port}`)
  console.log('it expects notes-api on http://localhost:8081 -- override with ?api=')
})
