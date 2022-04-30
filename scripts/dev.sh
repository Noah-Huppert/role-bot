#!/usr/bin/env bash

# Constants
declare -r PROG_DIR=$(dirname $(realpath "$0")) || exit
source "$PROG_DIR/common.sh"

declare -r DEFAULT_OPT_DOCKER_COMPOSE_LOGS_SVCS="bot"

declare -r ARG_ACTION_RESTART="restart"
declare -r ARG_ACTION_SHELL="shell"
declare -r ARG_ACTION_NAMES=("$ARG_ACTION_RESTART" "$ARG_ACTION_SHELL")

declare -r ARG_ACTION_SHELL_SPEC="shell(=([a-zA-Z-]+))?=(.*)"
declare -r ARG_ACTION_SHELL_DEFAULT_SVC="bot"
declare -r ARG_ACTION_SHELL_DEFAULT_CMD="bash"

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
declare -r EXIT_MSG_ARG_ACTION_SHELL_PARSE="Failed to parse shell action specification"

declare -ri EXIT_CODE_ARG_ACTION_SHELL_PARSE_SVC=41
declare -r EXIT_MSG_ARG_ACTION_SHELL_PARSE_SVC="Failed to parse SVC argument from shell action specification"

declare -ri EXIT_CODE_ARG_ACTION_SHELL_PARSE_CMD=42
declare -r EXIT_MSG_ARG_ACTION_SHELL_PARSE_CMD="Failed to parse CMD argument from shell action specification"

declare -ri EXIT_CODE_ARG_ACTION_SHELL_PS=43
declare -r EXIT_MSG_ARG_ACTION_SHELL_PS="Failed to get status of Docker compose service in which to run shell command"

declare -ri EXIT_CODE_ARG_ACTION_SHELL_EXEC=44
declare -r EXIT_MSG_ARG_ACTION_SHELL_EXEC="Failed to run shell command in Docker service"

declare -ri EXIT_CODE_ARG_ACTION_SHELL_RUN=44
declare -r EXIT_MSG_ARG_ACTION_SHELL_RUN="Failed to run shell command in a temporary run container for a Docker service"

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

        SVCS    The Docker compose services to restart.

    shell[=SVC]=[CMD]

        After bringing up Docker compose stack, execute a command in a service's Docker container.
        If the service is not running a temporary run container will be made.

        SVC    Docker compose service in which to run (Default: '$ARG_ACTION_SHELL_DEFAULT_SVC').
        CMD    The command to run (Default: '$ARG_ACTION_SHELL_DEFAULT_CMD')
               Note: To elide this argument you must still include an equals sign.
                     Works     : shell=
                     Won't work: shell

BEHAVIOR

    Ensures the Docker development setup is running. Then tails its log.

    Runs any number of special ACTIONS. These actions have customizable behavior via custom specifications found in the ACTIONS section. In these, any area surrounded by square brackets (ex., [xyz]) can be considered optional. Text which is ALL CAPS in these specifications are arguments. Documentation about arguments is shown below the specification text, with the same ALL CAPS indicator.

    Note on SVCS: Options and arguments which take a list of Docker compose services expect a comma seperated list.

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

  local svc
  local cmd

  if ! grep -E "$ARG_ACTION_SHELL_SPEC" <<< "$action_spec" &> /dev/null; then
    die "$EXIT_CODE_ARG_ACTION_SHELL_PARSE" "$EXIT_MSG_ARG_ACTION_SHELL_PARSE"
  fi
  
  svc=$(run_check "sed -r 's/$ARG_ACTION_SHELL_SPEC/\2/' <<< '$action_spec'" "$EXIT_CODE_ARG_ACTION_SHELL_PARSE_SVC" "$EXIT_MSG_ARG_ACTION_SHELL_PARSE_CMD") || exit
  cmd=$(run_check "sed -r 's/$ARG_ACTION_SHELL_SPEC/\3/' <<< '$action_spec'" "$EXIT_CODE_ARG_ACTION_SHELL_PARSE_CMD" "$EXIT_MSG_ARG_ACTION_SHELL_PARSE_CMD") || exit

  if [[ -z "$svc" ]]; then
    svc="$ARG_ACTION_SHELL_DEFAULT_SVC"
  fi

  if [[ -z "$cmd" ]]; then
    cmd="$ARG_ACTION_SHELL_DEFAULT_CMD"
  fi

  # Check if service is running
  svc_ps_out=$(run_check "docker-compose ps '$svc'" "$EXIT_CODE_ARG_ACTION_SHELL_PS" "$EXIT_MSG_ARG_ACTION_SHELL_PS") || exit

  # Run action
  if [[ "$svc_ps_out" =~ "Up" ]]; then
    # Service is running
    run_check "docker-compose exec $svc $cmd" "$EXIT_CODE_ARG_ACTION_SHELL_EXEC" "$EXIT_MSG_ARG_ACTION_SHELL_EXEC"
  else
    # Service is not running, create temporary execution container
    log "For shell '$svc' '$cmd' the Docker compose service was not running, created a temporary execution container"
    run_check "docker-compose run --rm $svc $cmd" "$EXIT_CODE_ARG_ACTION_SHELL_RUN" "$EXIT_MSG_ARG_ACTION_SHELL_RUN"
  fi
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
