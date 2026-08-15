'use strict'

const test = require('node:test')
const assert = require('node:assert')

const { escapeHtml, renderNote, renderNotes, renderCount, renderStatus } = require('../src/render')

test('the five characters that matter are escaped', () => {
  assert.strictEqual(escapeHtml('<&>"\''), '&lt;&amp;&gt;&quot;&#39;')
})

test('ampersands are not escaped twice', () => {
  // The order of the replacements is the whole point: `&` first, then the
  // rest. Reversed, this comes out as `&amp;lt;`.
  assert.strictEqual(escapeHtml('<'), '&lt;')
  assert.strictEqual(escapeHtml('&lt;'), '&amp;lt;')
})

test('a title that is markup does not become markup', () => {
  const html = renderNote({ id: 1, title: '<script>alert(1)</script>', body: '' })
  assert.ok(!html.includes('<script>'), 'the tag must not survive into the page')
  assert.ok(html.includes('&lt;script&gt;'))
})

test('a body that is markup does not become markup either', () => {
  const html = renderNote({ id: 1, title: 'ok', body: '<img onerror=x>' })
  assert.ok(!html.includes('<img'))
  assert.ok(html.includes('&lt;img'))
})

test('a note carries its id where the click handler can find it', () => {
  const html = renderNote({ id: 7, title: 'seven', body: '' })
  assert.ok(html.includes('data-id="7"'))
})

test('an empty body leaves out the paragraph rather than adding a blank one', () => {
  assert.ok(!renderNote({ id: 1, title: 't', body: '' }).includes('class="body"'))
  assert.ok(!renderNote({ id: 1, title: 't', body: '   ' }).includes('class="body"'))
  assert.ok(renderNote({ id: 1, title: 't', body: 'x' }).includes('class="body"'))
})

test('an empty list says so instead of rendering nothing', () => {
  assert.match(renderNotes([]), /No notes yet/)
  assert.match(renderNotes(null), /No notes yet/)
})

test('the newest note is first', () => {
  const html = renderNotes([
    { id: 1, title: 'oldest', body: '' },
    { id: 2, title: 'newest', body: '' }
  ])
  assert.ok(html.indexOf('newest') < html.indexOf('oldest'))
})

test('rendering does not reorder the list it was given', () => {
  const notes = [{ id: 1, title: 'a', body: '' }, { id: 2, title: 'b', body: '' }]
  renderNotes(notes)
  assert.deepStrictEqual(notes.map(n => n.id), [1, 2], 'the caller still owns this array')
})

test('the count reads correctly at zero, one and more', () => {
  assert.strictEqual(renderCount([]), 'nothing yet')
  assert.strictEqual(renderCount([{}]), '1 note')
  assert.strictEqual(renderCount([{}, {}]), '2 notes')
})

test('no error is an empty status', () => {
  assert.deepStrictEqual(renderStatus(null), { text: '', kind: 'ok' })
})

test('an unreachable server is told apart from a refused request', () => {
  const offline = renderStatus({ message: 'cannot reach the notes server', offline: true })
  assert.strictEqual(offline.kind, 'offline')
  assert.match(offline.text, /is notes-api running/)

  const refused = renderStatus({ message: 'a note needs a title', offline: false })
  assert.strictEqual(refused.kind, 'error')
  assert.strictEqual(refused.text, 'a note needs a title')
})
