#!/bin/sh
# Config validation and database migrations run inside the server before it
# accepts requests (src/instrumentation.ts). A missing variable exits non-zero.
set -e
exec node server.js "$@"
