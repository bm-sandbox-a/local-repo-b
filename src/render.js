'use strict'

// Turning notes into the html that shows them.
//
// Every function here is pure: notes in, a string out, no document touched.
// That is what lets the suite run in node with no browser, and it is also what
// keeps the escaping in one place instead of at every point a value reaches
// the page.

// A note's title comes from whoever typed it and goes straight into markup, so
// it goes through here first. `&` is replaced first -- doing it later would
// re-escape the ampersands the other replacements had just introduced, and
// `<` would come out as `&amp;lt;`.
function escapeHtml (value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// What the list says when there is nothing in it. A blank panel reads as
// broken; this reads as empty, which is a different thing.
function renderEmpty () {
  return '<li class="empty">No notes yet. Write one above.</li>'
}

function renderNote (note) {
  const body = note.body && note.body.trim() !== ''
    ? `<p class="body">${escapeHtml(note.body)}</p>`
    : ''

  return [
    `<li class="note" data-id="${note.id}">`,
    '  <div class="note-text">',
    `    <h3 class="title">${escapeHtml(note.title)}</h3>`,
    body ? `    ${body}` : '',
    '  </div>',
    `  <button class="delete" data-id="${note.id}" aria-label="Delete ${escapeHtml(note.title)}">×</button>`,
    '</li>'
  ].filter(Boolean).join('\n')
}

function renderNotes (notes) {
  if (!notes || notes.length === 0) return renderEmpty()
  // Newest first. The API returns them in the order they were created, and the
  // note somebody just wrote is the one they are looking for.
  return notes.slice().reverse().map(renderNote).join('\n')
}

// The line under the heading. Singular and plural, because "1 notes" is the
// sort of thing that makes the rest look careless.
function renderCount (notes) {
  const n = notes ? notes.length : 0
  if (n === 0) return 'nothing yet'
  return n === 1 ? '1 note' : `${n} notes`
}

// The status line. An unreachable server and a rejected request are different
// problems and get different words -- the first is about the server, the
// second is about what was asked of it.
function renderStatus (error) {
  if (!error) return { text: '', kind: 'ok' }
  if (error.offline) {
    return { text: `${error.message} -- is notes-api running?`, kind: 'offline' }
  }
  return { text: error.message, kind: 'error' }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { escapeHtml, renderNote, renderNotes, renderEmpty, renderCount, renderStatus }
} else {
  globalThis.NotesRender = { escapeHtml, renderNote, renderNotes, renderEmpty, renderCount, renderStatus }
}
