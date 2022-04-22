#!/usr/bin/env bash

# Constants
declare -r PROG_DIR=$(dirname $(realpath "$0"))
source "$PROG_DIR/common.sh"

declare -r DEPS_LOCK_PATH=$(realpath "$PROG_DIR/../yarn.lock")
declare -r DEPS_PATH=$(realpath "$PROG_DIR/../node_modules")

declare -r ENV_FILE="$PROG_DIR/.env"

# Exit statuses
declare -ri EXIT_CODE_OPT_UNKNOWN=10
declare -r EXIT_MSG_OPT_UNKNOWN="Unknown option"

declare -ri EXIT_CODE_DEPS_INSTALL=20
declare -r EXIT_MSG_DEPS_INSTALL="Failed to install dependencies"

declare -ri EXIT_CODE_DEPS_TOUCH=21
declare -r EXIT_MSG_DEPS_TOUCH="Failed to update last modified date of dependencies path"

declare -ri EXIT_CODE_SOURCE_ENV=30
declare -ri EXIT_MSG_SOURCE_ENV="Failed to source .env file"

declare -ri EXIT_CODE_RUN_DEV=40
declare -r EXIT_MSG_RUN_DEV="Failed to run development mode"

# Helpers
show_help() {
  cat <<EOF
$(basename $0) - Run Bot server in development watch mode

USAGE

    $(basename $0) [-h]

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
    '?') die "$EXIT_CODE_OPT_UNKNOWN" "$EXIT_MSG_OPT_UNKNOWN" ;;
  esac
done

# Install dependencies
if [[ ! -d "$DEPS_PATH" ]] || check_file_newer "$DEPS_LOCK_PATH" "$DEPS_PATH"; then
  log "Dependencies need to be updated"
  
  run_check "yarn install" "$EXIT_CODE_DEPS_INSTALL" "$EXIT_MSG_DEPS_INSTALL"
  run_check "touch $DEPS_PATH" "$EXIT_CODE_DEPS_TOUCH" "$EXIT_MSG_DEPS_TOUCH"

  log "Dependencies updated"
fi

# Source env file if it exists
if [[ -f "$ENV_FILE" ]]; then
  run_check "source '$ENV_FILE'" "$EXIT_CODE_SOURCE_ENV" "$EXIT_MSG_SOURCE_ENV"
fi

# Run Bot server
log "Running development server in watch mode"
run_check "yarn watch" "$EXIT_CODE_RUN_DEV" "$EXIT_MSG_RUN_DEV"
