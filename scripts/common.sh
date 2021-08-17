#!/usr/bin/env bash

declare -ri TRUE=$(true ; "$?")
declare -ri FALSE=$(false ; "$?")

declare -r PROG_DIR=$(dirname $(realpath "$0"))

# Log message to stdout
log() { # ( msg )
  local -r msg="$1"
  echo "$(date --iso-8601=seconds) $msg"
}

# Log message to stderr
elog() { # ( msg )
  local -r msg="$1"
  log "Error: $msg" >&2
}

# Exit with error code and message to stdout
die() { # ( code, msg )
  local -r code="$1"
  local -r msg="$2"

  elog "$msg"
  exit "$code"
}

# Run command, if it fails exits
run_check() { # ( cmd, fail_code, fail_msg )
  local -r cmd="$1"
  local -ri fail_code="$2"
  local -r fail_msg="$3"

  if ! eval "$cmd"; then
    elog "Failed to run '$cmd'"
    die "$fail_code" "$fail_msg"
  fi
}

# Get last modified date of a path in Unix timestamp format
path_date() { # ( path )
  local -r path="$1"
  date -r "$path" +'%s'
}

# Compare if base path is newer than other path
compare_file() { # ( base_path, other_path )
  local -r base_path="$1"
  local -r other_path="$2"

  local -ri base_date=$(path_date "$base_path")
  local -ri other_date=$(path_date "$other_path")

  if (($base_date > $other_date)); then
    return "$TRUE"
  fi

  return "$FALSE"
}
