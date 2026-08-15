'use strict'

// Wiring the page to the API. Everything worth testing lives in `src/api.js`
// and `src/render.js`; what is left here is the part that only means anything
// with a document in front of it.

;(function () {
  const { createApi } = globalThis.NotesApi
  const { renderNotes, renderCount, renderStatus } = globalThis.NotesRender

  // Where notes-api is. The default matches its default, so opening the page
  // after `npm start` in both repositories just works; the query string is for
  // pointing at one running somewhere else without editing a file.
  const base = new URL(location.href).searchParams.get('api') || 'http://localhost:8081'
  const api = createApi({ base })

  const els = {
    notes: document.getElementById('notes'),
    count: document.getElementById('count'),
    status: document.getElementById('status'),
    form: document.getElementById('new-note'),
    title: document.getElementById('title'),
    body: document.getElementById('body')
  }

  function showError (err) {
    const { text, kind } = renderStatus(err)
    els.status.textContent = text
    els.status.className = `status ${kind}`
  }

  async function refresh () {
    try {
      const notes = await api.list()
      els.notes.innerHTML = renderNotes(notes)
      els.count.textContent = renderCount(notes)
      showError(null)
    } catch (err) {
      // The list is left alone on a failure. Blanking it would suggest the
      // notes are gone, when what actually happened is that we could not ask.
      els.count.textContent = ''
      showError(err)
    }
  }

  els.form.addEventListener('submit', async event => {
    event.preventDefault()

    const title = els.title.value.trim()
    if (title === '') return

    // Disabled while it is in flight. Without this a double-click on a slow
    // connection posts the note twice, and the second one is not a duplicate
    // the server can spot -- it is a legitimate second note with the same text.
    const button = els.form.querySelector('button')
    button.disabled = true

    try {
      await api.create({ title, body: els.body.value })
      els.form.reset()
      els.title.focus()
      await refresh()
    } catch (err) {
      showError(err)
    } finally {
      button.disabled = false
    }
  })

  // One listener on the list rather than one per button, because the buttons
  // are replaced every time the list is rendered and listeners attached to the
  // old ones would go with them.
  els.notes.addEventListener('click', async event => {
    const button = event.target.closest('.delete')
    if (!button) return

    try {
      await api.remove(Number(button.dataset.id))
      await refresh()
    } catch (err) {
      showError(err)
    }
  })

  refresh()
})()
