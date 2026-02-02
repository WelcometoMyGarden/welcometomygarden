#!/usr/bin/env bash
# Optional argument: "build", to force a rebuild of the UglifyJS container
set -e

# The point of the feature-detect script is that it works in old browsers
# Therefore, we must use minification that produces results compatible
# with old browsers.
#
# Terser is only able to generate ES5 compatbile code
#, while Uglify 2.x can generate # IE6+ compatible code.
# (due to an event we use, we are restricted to IE8 though)
#
# https://www.npmjs.com/package/uglify-js/v/2.8.29
#

ABSOLUTE_SRC="$(cd "$(dirname "$0")/../src" && pwd)"
# Resolve absolute paths (important for Docker volume mounts)
INPUT_FILE="$ABSOLUTE_SRC/browser-support.js"
OUTPUT_FILE="$ABSOLUTE_SRC/browser-support.min.js"

# Build the UglifyJS Node image
if [[ ! "$(docker images -q wtmg-uglifyjs2:latest 2>/dev/null)" ]] || [[ "$1" == "build" ]]; then
  docker build -t wtmg-uglifyjs2:latest -f "$(dirname "$0")/uglifyjs2.Dockerfile" .
fi

docker run --rm \
  -v "$(dirname "$INPUT_FILE"):/input" \
  -v "$(dirname "$OUTPUT_FILE"):/output" \
  wtmg-uglifyjs2:latest \
  sh -c "/usr/local/lib/node_modules/uglify-js/bin/uglifyjs /input/$(basename "$INPUT_FILE") \
      --compress \
      --mangle \
      --ie \
      --output /output/$(basename "$OUTPUT_FILE") \
      && echo 'Done'
  "
