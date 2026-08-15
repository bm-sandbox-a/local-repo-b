'use strict'

const test = require('node:test')
const assert = require('node:assert')

const { createApi, ApiError } = require('../src/api')

// A stand-in for fetch. It records what it was asked and answers with whatever
// the test wants, so these run with no server and no network.
function fakeFetch (reply) {
  const calls = []
  const doFetch = async (url, options = {}) => {
    calls.push({ url, method: options.method, body: options.body, headers: options.headers })
    if (typeof reply === 'function') return reply(url, options)
    return reply
  }
  doFetch.calls = calls
  return doFetch
}

const json = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body
})

test('list asks for /notes and returns what came back', async () => {
  const doFetch = fakeFetch(json(200, [{ id: 1, title: 'one', body: '' }]))
  const api = createApi({ base: 'http://localhost:8081', fetch: doFetch })

  const notes = await api.list()
  assert.strictEqual(doFetch.calls[0].url, 'http://localhost:8081/notes')
  assert.strictEqual(doFetch.calls[0].method, 'GET')
  assert.strictEqual(notes.length, 1)
})

test('a trailing slash on the base does not double up', async () => {
  const doFetch = fakeFetch(json(200, []))
  const api = createApi({ base: 'http://localhost:8081/', fetch: doFetch })

  await api.list()
  assert.strictEqual(doFetch.calls[0].url, 'http://localhost:8081/notes')
})

test('create sends the note as json', async () => {
  const doFetch = fakeFetch(json(201, { id: 1, title: 'new', body: 'b' }))
  const api = createApi({ base: 'http://localhost:8081', fetch: doFetch })

  await api.create({ title: 'new', body: 'b' })
  const sent = doFetch.calls[0]
  assert.strictEqual(sent.method, 'POST')
  assert.strictEqual(sent.headers['content-type'], 'application/json')
  assert.deepStrictEqual(JSON.parse(sent.body), { title: 'new', body: 'b' })
})

test('a 204 comes back as null rather than a parse error', async () => {
  const doFetch = fakeFetch({
    status: 204,
    ok: true,
    json: async () => { throw new Error('there is no body to parse') }
  })
  const api = createApi({ base: 'http://localhost:8081', fetch: doFetch })

  assert.strictEqual(await api.remove(1), null)
})

test("the server's error message is the one that is raised", async () => {
  const doFetch = fakeFetch(json(404, { error: 'no such note' }))
  const api = createApi({ base: 'http://localhost:8081', fetch: doFetch })

  await assert.rejects(api.get(9), err => {
    assert.ok(err instanceof ApiError)
    assert.strictEqual(err.message, 'no such note')
    assert.strictEqual(err.status, 404)
    assert.strictEqual(err.offline, false)
    return true
  })
})

test('an error with no readable body still names the status', async () => {
  const doFetch = fakeFetch({
    status: 500,
    ok: false,
    json: async () => { throw new Error('this is html, not json') }
  })
  const api = createApi({ base: 'http://localhost:8081', fetch: doFetch })

  await assert.rejects(api.list(), /answered 500/)
})

test('a server that is not running is an offline error, not a status', async () => {
  const doFetch = async () => { throw new TypeError('fetch failed') }
  const api = createApi({ base: 'http://localhost:8081', fetch: doFetch })

  await assert.rejects(api.list(), err => {
    assert.strictEqual(err.offline, true)
    assert.strictEqual(err.status, 0)
    assert.match(err.message, /cannot reach the notes server/)
    return true
  })
})

test('update sends only the fields it was given', async () => {
  const doFetch = fakeFetch(json(200, { id: 1, title: 'after', body: 'kept' }))
  const api = createApi({ base: 'http://localhost:8081', fetch: doFetch })

  await api.update(1, { title: 'after' })
  assert.strictEqual(doFetch.calls[0].method, 'PATCH')
  assert.deepStrictEqual(JSON.parse(doFetch.calls[0].body), { title: 'after' })
})
