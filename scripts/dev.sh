#!/usr/bin/env bash

# Constants
declare -r PROG_DIR=$(dirname $(realpath "$0")) || exit
source "$PROG_DIR/common.sh"

declare -r DEFAULT_OPT_DOCKER_COMPOSE_LOGS_SVCS="bot"

declare -r ARG_ACTION_RESTART="restart"
declare -r ARG_ACTION_SHELL="shell"
declare -r ARG_ACTION_NAMES=("$ARG_ACTION_RESTART" "$ARG_ACTION_SHELL")

declare -r ARG_ACTION_SHELL_DEFAULT_SVC="bot"

# Exit codes
# ... Options
declare -ri EXIT_CODE_OPT_UNKNOWN=10
declare -r EXIT_MSG_OPT_UNKNOWN="Unknown option"

# ... Action arguments
declare -ri EXIT_CODE_ARG_ACTION_PARSE_NAME=20
declare -r EXIT_MSG_ARG_ACTION_PARSE_NAME="Failed to parse action argument's name"

declare -ri EXIT_CODE_ARG_ACTION_UNKNOWN=21
declare -r EXIT_MSG_ARG_ACTION_UNKNOWN="Unknown action argument"

# ... ... Restart action
declare -ri EXIT_CODE_ARG_ACTION_RESTART_PARSE=30
declare -r EXIT_MSG_ARG_ACTION_RESTART_PARSE="Failed to parse service names in restart action"

declare -ri EXIT_CODE_ARG_ACTION_RESTART_DO=3
declare -r EXIT_MSG_ARG_ACTION_RESTART_DO="Failed to restart services"

# ... ... Shell action
declare -ri EXIT_CODE_ARG_ACTION_SHELL_PARSE=40
declare -r EXIT_MSG_ARG_ACTION_SHELL_PARSE="Failed to parse shell action"

declare -ri EXIT_CODE_ARG_ACTION_SHELL_DO=41
declare -r EXIT_MSG_ARG_ACTION_SHELL_DO="Failed to run shell command in Docker service"

# ... Docker compose up
declare -ri EXIT_CODE_DOCKER_COMPOSE_UP=50
declare -r EXIT_MSG_DOCKER_COMPOSE_UP="Failed to bring up Docker compose stack"

# ... Docker compose logs
declare -ri EXIT_CODE_DOCKER_COMPOSE_LOGS=51
declare -r EXIT_MSG_DOCKER_COMPOSE_LOGS="Failed to tail Docker compose logs"

# Helpers
show_help() {
  cat <<EOF
$(basename $0) - Manage the Docker development setup.

USAGE

    $(basename $0) [-h, -l SVCS] [ACTIONS...]

OPTIONS

    -h         Show help.
    -l SVCS    Docker compose services of which to view logs.

ARGUMENTS

    ACTIONS    Special actions to complete, see ACTIONS section.

ACTIONS

    Multiple actions can be provided, each seperated by a space, valid actions:

    restart=SVCS

        After bringing up Docker compose stack restart these services.

    shell=[SVC]=CMD

        After bringing up Docker compose stack, execute a command in a service's Docker container. The SVC can be omitted and will default to $ARG_ACTION_SHELL_DEFAULT_SVC.

BEHAVIOR

    Starts the Docker development setup if not running. Then tails its log.

    Options and arguments which take a list of Docker compose services expect a comma seperated list.

EOF
}

# Determines the name of an action from a raw argument value.
parse_action_name() { # ( action_spec )
  local -r action_spec="$1"
  
  run_check "awk -F '=' '{ print \$1 }' <<< '$action_spec'" "$EXIT_CODE_ARG_ACTION_PARSE_NAME" "$EXIT_MSG_ARG_ACTION_PARSE_NAME"
}

# Run the restart action. Restarts the Docker compose services specified after the equals sign.
action_restart() { # ( action_spec )
  local -r action_spec="$1"

  local svcs
  svcs=$(run_check "awk -F '=' '{ print \$2 }' <<< '$action_spec'" "$EXIT_CODE_ARG_ACTION_RESTART_PARSE" "$EXIT_MSG_ARG_ACTION_RESTART_PARSE") || exit

  run_check "docker-compose restart $svcs" "$EXIT_CODE_ARG_ACTION_RESTART_DO" "$EXIT_MSG_ARG_ACTION_RESTART_DO"
}

# Runs a shell in Docker.
action_shell() { # ( action_spec )
  local -r action_spec="$1"

  # Determine if the SVC was specified in the spec
  # https://unix.stackexchange.com/a/18753
  local -i num_equals
  num_equals=$(run_check "awk -F '=' '{ print NF-1 }' <<< '$action_spec'" "$EXIT_CODE_ARG_ACTION_SHELL_PARSE" "$EXIT_MSG_ARG_ACTION_SHELL_PARSE") || exit

  local svc="$ARG_ACTION_SHELL_DEFAULT_SVC"
  local cmd=""
  
  if (($num_equals >= 2)); then
    # Service specified
    svc=$(run_check "awk -F '=' '{ print \$2 }' <<< '$action_spec'" "$EXIT_CODE_ARG_ACTION_SHELL_PARSE" "$EXIT_MSG_ARG_ACTION_SHELL_PARSE") || exit
    
    cmd=$(run_check "cut -d'=' -f 3- - <<< '$action_spec'" "$EXIT_CODE_ARG_ACTION_SHELL_PARSE" "$EXIT_MSG_ARG_ACTION_SHELL_PARSE") || exit
  else
    # Service not specified
    cmd=$(run_check "cut -d'=' -f 2- - <<< '$action_spec'" "$EXIT_CODE_ARG_ACTION_SHELL_PARSE" "$EXIT_MSG_ARG_ACTION_SHELL_PARSE") || exit
  fi

  # Run action
  run_check "docker-compose exec $svc $cmd" "$EXIT_CODE_ARG_ACTION_SHELL_DO" "$EXIT_MSG_ARG_ACTION_SHELL_DO"
}

# Options
declare OPT_DOCKER_COMPOSE_LOGS_SVCS="$DEFAULT_OPT_DOCKER_COMPOSE_LOGS_SVCS"

while getopts "hl:" opt; do
  case "$opt" in
    h)
      show_help
      exit 0
      ;;
    l) OPT_DOCKER_COMPOSE_LOGS_SVCS="$OPTARG" ;;
    '?') die "$EXIT_CODE_OPT_UNKNOWN" "$EXIT_MSG_OPT_UNKNOWN" ;;
  esac
done

shift $((OPTIND-1))

# Arguments
declare -a ARG_ACTIONS=()

while [[ -n "$1" ]]; do
  # Get name of action
  action_arg="$1"
  shift
  
  action_name=$(parse_action_name "$action_arg") || exit

  # Check if action is a valid action
  action_valid=""

  for valid_action_name in "${ARG_ACTION_NAMES[@]}"; do
    if [[ "$action_name" == "$valid_action_name" ]]; then
      action_valid="true"
      break
    fi
  done

  if [[ -z "$action_valid" ]]; then
    elog "Invalid action argument '$action_name'"
    die "$EXIT_CODE_ARG_ACTION_UNKNOWN" "$EXIT_MSG_ARG_ACTION_UNKNOWN"
  fi

  # If action is valid, save it
  ARG_ACTIONS+=("$action_arg")
done

# Bring up development setup
run_check "docker-compose up -d" "$EXIT_CODE_DOCKER_COMPOSE_UP" "$EXIT_MSG_DOCKER_COMPOSE_UP"

# Run post-up actions
for action in "${ARG_ACTIONS[@]}"; do
  action_name=$(parse_action_name "$action") || exit

  case "$action_name" in
    "$ARG_ACTION_RESTART") action_restart "$action" ;;
    "$ARG_ACTION_SHELL") action_shell "$action" ;;
  esac
done

# Attach to logs
run_check "docker-compose logs -f --tail=20 $OPT_DOCKER_COMPOSE_LOGS_SVCS" "$EXIT_CODE_DOCKER_COMPOSE_LOGS" "$EXIT_MSG_DOCKER_COMPOSE_LOGS"
