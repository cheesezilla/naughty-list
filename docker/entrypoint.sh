#!/bin/sh
# Starts as root only to make sure the save folder belongs to the app user,
# whatever owner the NAS gave the shared folder, then drops to that user.
# If the NAS won't let the folder change owner, the game keeps running as root
# rather than failing, and says so in the log.
set -e
DIR="${DATA_DIR:-/data}"
DB="$DIR/naughty-list.db"

if [ "$(id -u)" != "0" ]; then
  echo "Starting as user $(id -u). The save folder's owner is left as it is."
  exec "$@"
fi

mkdir -p "$DIR"
chown -R node:node "$DIR" 2>/dev/null || echo "Warning: couldn't give the save folder $DIR to the app user."

ok=1
su-exec node test -w "$DIR" -a -x "$DIR" || ok=0
for f in "$DB" "$DB-wal" "$DB-shm"; do
  if [ -e "$f" ]; then su-exec node test -r "$f" -a -w "$f" || ok=0; fi
done

if [ "$ok" = "1" ]; then
  exec su-exec node "$@"
fi
echo "Warning: the app user can't write to $DIR even after changing its owner, so the game runs as root instead."
ls -lan "$DIR" || true
exec "$@"
