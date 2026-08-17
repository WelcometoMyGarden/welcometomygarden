#!/usr/bin/env bash
set -e

# The point of the feature-detect script is that it works in old browsers
# Therefore, we must use minification that produces results compatible
# with old browsers.
#
# The common library Terser is only able to generate ES5 compatbile code,
# while Uglify 2.x can generate IE6+ compatible code.
# See https://www.npmjs.com/package/uglify-js/v/2.8.29
#
# The UglifyJS version is pinned to 2.8.29, which still runs fine on current
# Node (verified on Node 24), so no separate toolchain is needed.

ABSOLUTE_SRC="$(cd "$(dirname "$0")/../src" && pwd)"
INPUT_FILE="$ABSOLUTE_SRC/browser-support.js"
OUTPUT_FILE="$ABSOLUTE_SRC/browser-support.min.js"

yarn dlx uglify-js@2.8.29 "$INPUT_FILE" \
  --compress \
  --mangle \
  --ie \
  --output "$OUTPUT_FILE"

echo "Done"
