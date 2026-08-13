notes-ui
========

A browser UI for `local-repo-a`'s notes API. No dependencies, no build step.

The two are separate repositories on purpose. A change that has to land in both
-- a field added to a note, a route renamed -- is the case worth having in a
workspace, and it does not exist if everything is in one place.


Running it
----------

Both halves, in two terminals:

    cd ../local-repo-a && ./setup.sh && npm start   # the API, on 8081
    ./setup.sh && npm start                         # this, on 8080

Then open <http://localhost:8080>.

If the API is somewhere else, say so in the query string rather than editing a
file: <http://localhost:8080/?api=http://192.168.1.20:8081>


How it is laid out
------------------

    src/api.js        every call to notes-api, and what an error means
    src/render.js     notes in, html out. Nothing touches the document
    public/app.js     the part that only means anything with a document
    public/index.html
    public/style.css
    serve.js          static files, so the page is not on file://
    test/             node --test

**`src/` is where the logic is, and it is why there is a suite at all.** Those
two files are pure -- one takes a `fetch` and the other takes notes -- so they
run in node with a fake `fetch` and no browser. `public/app.js` is the
leftovers: listeners, and reading values out of inputs.

They are loaded twice over, by `require` in the tests and by a `<script>` tag
in the page, which is what the four-line footer at the bottom of each is for. A
bundler would remove those lines and add a toolchain; for two files that is the
worse trade.


Why `serve.js` serves the root and not `public/`
------------------------------------------------

The page loads `../src/api.js`. Serving `public/` alone would put those outside
the tree, and the alternative -- copying them in at start-up -- is a build step.

Opening `public/index.html` as a `file://` url does not work either: the browser
gives it a null origin, and a null origin fails CORS against the API no matter
what the API allows.


What is deliberately not here
-----------------------------

No editing in place (the API has `PATCH`; nothing calls it yet), no search, no
framework. `PATCH` being reachable and unused is left as it is -- it is a real
loose end of the kind a first task can be pointed at.
