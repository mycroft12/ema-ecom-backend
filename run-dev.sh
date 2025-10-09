#!/usr/bin/env bash
set -euo pipefail

# Run frontend (Angular dev server) and backend (Spring Boot) together for local development.
# Usage:
#   ./run-dev.sh            # runs backend + frontend
#   ./run-dev.sh --with-db  # also starts Postgres via docker-compose (service: db)

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
FRONT_DIR="$ROOT_DIR/frontend/ema-ecom-frontend"
SPRING_PROFILES_ACTIVE="dev"

if [[ "${1:-}" == "--with-db" ]]; then
  echo "[run-dev] Starting Postgres (docker compose up -d db) ..."
  docker compose up -d db
fi

# Ensure frontend deps
if [[ -f "$FRONT_DIR/package.json" ]]; then
  if [[ ! -d "$FRONT_DIR/node_modules" ]]; then
    echo "[run-dev] Installing frontend dependencies ..."
    (cd "$FRONT_DIR" && npm install)
  fi
else
  echo "[run-dev] Frontend workspace not found at $FRONT_DIR" >&2
  exit 1
fi

pids=()

# Start backend
(
  echo "[run-dev] Starting backend (Spring Boot, profile=$SPRING_PROFILES_ACTIVE) ..."
  cd "$ROOT_DIR/backend"
  ../mvnw -q -Dspring-boot.run.profiles=$SPRING_PROFILES_ACTIVE spring-boot:run
) & pids+=("$!")

# Start frontend
(
  echo "[run-dev] Starting frontend (Angular dev server) ..."
  cd "$FRONT_DIR"
  npm start
) & pids+=("$!")

cleanup() {
  printf "\n[run-dev] Shutting down ...\n"
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT INT TERM

# Wait for any process to exit (portable, works on macOS bash 3.2)
# Loop until any child process exits
while true; do
  for pid in "${pids[@]}"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      exit 0
    fi
  done
  sleep 1
done
