#!/bin/bash
# By default: replace the entry in /private/etc/hosts for wtmg.staging to the current IP address, using sudo
# If an argument is given, that file is processed without sudo.
# Useful when running a local web dev server on macOS, to which a iOS simulator connects using wtmg.staging
# when having a dynamic local IP address
$([ -z $1 ] && echo "sudo" || echo "") sed -E -i '' "s/^[0-9.]*([[:space:]]+)wtmg\.staging/$(ipconfig getifaddr en0)\1wtmg.staging/" \
${1:-/private/etc/hosts}
