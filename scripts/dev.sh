#!/usr/bin/env bash
# Takes any arguments and passes them to the main script.
declare -r PROG_DIR=$(dirname $(realpath $0))

set -x
watchmedo shell-command \
    --patterns='*.py' \
    --recursive \
    --command="${PROG_DIR}/../src/role_bot/main.py $@" \
    "$PROG_DIR/../src/role_bot"