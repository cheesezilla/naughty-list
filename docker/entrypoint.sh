#!/bin/sh
# Starts as root only to make sure the save folder belongs to the app user,
# whatever owner the NAS gave the shared folder, then drops to that user.
set -e
if [ "$(id -u)" = "0" ]; then
  mkdir -p "${DATA_DIR:-/data}"
  chown -R node:node "${DATA_DIR:-/data}"
  exec su-exec node "$@"
fi
exec "$@"
