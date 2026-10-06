#!/bin/sh
# Regenerates ../three-engine.js from the pinned three.js release. Run from anywhere:  sh build.sh
# Needs Node and network access; installs into a throw-away temp directory and does not touch the repo's dependencies.
set -eu
THREE_VERSION=0.186.1
ESBUILD_VERSION=0.28.2
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"
printf '{"name":"three-engine-build","private":true,"type":"module"}\n' > package.json
npm install --no-audit --no-fund --save-exact "three@$THREE_VERSION" "esbuild@$ESBUILD_VERSION" >/dev/null
cp "$HERE/entry.js" entry.js
./node_modules/.bin/esbuild entry.js --bundle --format=esm --minify --target=es2020 --legal-comments=eof --outfile="$HERE/../three-engine.js"
cp node_modules/three/LICENSE "$HERE/../LICENSE-three.txt"
wc -c "$HERE/../three-engine.js"
