'use strict'

// Talking to notes-api.
//
// This is the file that knows the shape of the API, and it is the file that
// has to change when the API does. Keeping it apart from anything that touches
// the DOM is what makes it testable in node, with a fake `fetch`, rather than
// only in a browser against a running server.

// Every response goes through here, so there is one place that decides what an
// error from the API looks like to the rest of the UI.
//
// A failed request arrives as one of two very different things: the server
// answered and said no, or nothing answered at all. They need different words
// on screen -- "that note is gone" and "the server is not running" -- so they
// are told apart here rather than collapsed into "something went wrong".
class ApiError extends Error {
  constructor (message, { status = 0, offline = false } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.offline = offline
  }
}

function createApi ({ base, fetch: doFetch = globalThis.fetch }) {
  // A trailing slash on the base would produce `//notes`, which some servers
  // treat as a different path. Cheaper to strip it once than to explain it.
  const root = String(base).replace(/\/+$/, '')

  async function call (method, path, body) {
    let res
    try {
      res = await doFetch(root + path, {
        method,
        headers: body === undefined ? undefined : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
      })
    } catch (cause) {
      // fetch only rejects when the request never completed -- DNS, refused
      // connection, the server stopped. Not for a 4xx or 5xx.
      throw new ApiError(`cannot reach the notes server at ${root}`, { offline: true })
    }

    if (res.status === 204) return null

    // An error body is meant to be `{ error }`, but a server that has fallen
    // over answers with html or nothing at all, and the UI should say the
    // status rather than crash on a parse.
    let payload = null
    try {
      payload = await res.json()
    } catch {
      payload = null
    }

    if (!res.ok) {
      const message = payload && payload.error ? payload.error : `the server answered ${res.status}`
      throw new ApiError(message, { status: res.status })
    }

    return payload
  }

  return {
    health: () => call('GET', '/health'),
    list: () => call('GET', '/notes'),
    get: id => call('GET', `/notes/${id}`),
    create: ({ title, body }) => call('POST', '/notes', { title, body }),
    update: (id, changes) => call('PATCH', `/notes/${id}`, changes),
    remove: id => call('DELETE', `/notes/${id}`)
  }
}

// Loaded two ways and there is no build step: `require`d by the tests in node,
// and dropped in a `<script>` tag by the page. A bundler would remove the need
// for these four lines and add a toolchain to install, provision and keep
// current, which for two files is the worse trade.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createApi, ApiError }
} else {
  globalThis.NotesApi = { createApi, ApiError }
}
