#!/usr/bin/env bash
# Process and readiness helper used by start-services.sh and stop-services.sh.
set -euo pipefail

usage() {
    cat >&2 <<'USAGE'
Usage:
  e2e.sh wait-for-url URL [timeout_seconds]
  e2e.sh start NAME PID_FILE LOG_FILE COMMAND [ARGS...]
  e2e.sh status PID_DIR
  e2e.sh stop-all PID_DIR
USAGE
    exit 2
}

wait_for_url() {
    local url="$1"
    local timeout="${2:-60}"
    local attempt

    for ((attempt = 1; attempt <= timeout; attempt++)); do
        if curl --fail --silent --show-error --max-time 5 "$url" >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done

    echo "Timed out waiting for $url after ${timeout}s" >&2
    return 1
}

start_process() {
    local name="$1"
    local pid_file="$2"
    local log_file="$3"
    shift 3
    (($# > 0)) || { echo "No command supplied for $name" >&2; return 2; }

    mkdir -p "$(dirname "$pid_file")" "$(dirname "$log_file")"
    if [[ -s "$pid_file" ]]; then
        local existing_pid
        existing_pid="$(<"$pid_file")"
        if kill -0 "$existing_pid" 2>/dev/null; then
            echo "$name already running (pid $existing_pid)"
            return 0
        fi
    fi

    nohup "$@" >"$log_file" 2>&1 < /dev/null &
    local pid=$!
    printf '%s\n' "$pid" >"$pid_file"
    sleep 1
    if ! kill -0 "$pid" 2>/dev/null; then
        echo "$name exited during startup; see $log_file" >&2
        return 1
    fi
    echo "$name started (pid $pid)"
}

status_processes() {
    local pid_dir="$1"
    local found=false
    shopt -s nullglob
    local pid_file pid
    for pid_file in "$pid_dir"/*.pid; do
        found=true
        pid="$(<"$pid_file")"
        if kill -0 "$pid" 2>/dev/null; then
            echo "$(basename "$pid_file" .pid): running (pid $pid)"
        else
            echo "$(basename "$pid_file" .pid): stopped (stale pid $pid)"
        fi
    done
    shopt -u nullglob
    [[ "$found" == true ]] || echo "No managed processes in $pid_dir"
}

stop_all() {
    local pid_dir="$1"
    shopt -s nullglob
    local pid_file pid
    for pid_file in "$pid_dir"/*.pid; do
        pid="$(<"$pid_file")"
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
            for _ in 1 2 3 4 5; do
                kill -0 "$pid" 2>/dev/null || break
                sleep 1
            done
            kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$pid_file"
    done
    shopt -u nullglob
}

case "${1:-}" in
    wait-for-url)
        (($# >= 2 && $# <= 3)) || usage
        wait_for_url "$2" "${3:-60}"
        ;;
    start)
        (($# >= 5)) || usage
        start_process "$2" "$3" "$4" "${@:5}"
        ;;
    status)
        (($# == 2)) || usage
        status_processes "$2"
        ;;
    stop-all)
        (($# == 2)) || usage
        stop_all "$2"
        ;;
    *)
        usage
        ;;
esac
