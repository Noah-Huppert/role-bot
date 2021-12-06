#!/usr/bin/env bash

# Constants
declare -r PROG_DIR=$(dirname $(realpath "$0"))
source "$PROG_DIR/common.sh"

declare -r DEPS_LOCK_PATH=$(realpath "$PROG_DIR/../yarn.lock")
declare -r DEPS_PATH=$(realpath "$PROG_DIR/../node_modules")

declare -ri EXIT_DEPS_INSTALL=10
declare -ri EXIT_DEPS_TOUCH=11
declare -ri EXIT_RUN_DEV=12

# Helpers
show_help() {
  cat <<EOF
$(basename $0) - Run Bot server in development watch mode

USAGE

    dev.sh

OPTIONS

    -h    Show help

BEHAVIOR

    Installs dependencies if out of date, then starts the Bot server and reloads on changes.

EOF
}

# Options
while getopts "h" opt; do
  case "$opt" in
    h)
      show_help
      exit 0
      ;;
  esac
done

# Install dependencies
if [[ ! -d "$DEPS_PATH" ]] || compare_file "$DEPS_LOCK_PATH" "$DEPS_PATH"; then
  log "Dependencies need to be updated"
  
  run_check "yarn install" "$EXIT_DEPS_INSTALL" "Failed to install dependencies"
  run_check "touch $DEPS_PATH" "$EXIT_DEPS_TOUCH" "Failed to update last modified date of dependencies path"

  log "Dependencies updated"
fi

# Run Bot server
log "Running development server in watch mode"
run_check "yarn watch" "$EXIT_RUN_DEV" "Failed to run development mode"
