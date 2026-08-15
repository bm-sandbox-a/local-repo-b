#!/bin/sh
# Everything a fresh checkout needs before `npm test` will work.
#
# Same shape as local-repo-a's, on purpose: a person moving between the two
# repositories should not have to read a second script to find out that this
# one is different.
set -eu

cd "$(dirname "$0")"

echo "notes-ui: checking node"
if ! command -v node >/dev/null 2>&1; then
  echo "node is not installed. install node 20 or newer and run this again." >&2
  exit 1
fi

major=$(node -p 'process.versions.node.split(".")[0]')
if [ "$major" -lt 20 ]; then
  echo "node $(node -v) is too old. this needs node 20 or newer." >&2
  exit 1
fi
echo "notes-ui: node $(node -v)"

echo "notes-ui: installing"
npm install --no-audit --no-fund

echo "notes-ui: running the suite"
npm test

echo
echo "notes-ui: ready. start it with:  npm start"
echo "notes-ui: it needs local-repo-a running as well -- npm start in there too."
