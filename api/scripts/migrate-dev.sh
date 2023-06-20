#!/usr/bin/env bash
declare -r PROG_DIR=$(dirname $(realpath "$0"))

if [[ -z "$ROLE_BOT_POSTGRES_URI" ]]; then
    echo "Error: ROLE_BOT_POSTGRES_URI env var must be set" >&2
    exit 1
fi

migrate -path "$PROG_DIR/../models/migrations" -database "$ROLE_BOT_POSTGRES_URI" up