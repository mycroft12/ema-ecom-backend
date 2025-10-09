#!/usr/bin/env bash
set -euo pipefail

# This script builds the Angular frontend, embeds it into the backend static resources,
# and packages a single Spring Boot JAR and Docker image.

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
FRONT_DIR="$ROOT_DIR/frontend/ema-ecom-frontend"
BACK_SRC_STATIC="$ROOT_DIR/backend/src/main/resources-static"

echo "[1/5] Building Angular frontend..."
if [ -f "$FRONT_DIR/package.json" ]; then
  pushd "$FRONT_DIR" >/dev/null
  npm ci
  npm run build
  popd >/dev/null
else
  echo "Frontend workspace not found at $FRONT_DIR; skipping frontend build." >&2
fi

echo "[2/5] Preparing resources-static..."
mkdir -p "$BACK_SRC_STATIC"
rm -rf "$BACK_SRC_STATIC"/* || true
if [ -d "$FRONT_DIR/dist" ]; then
  cp -R "$FRONT_DIR/dist"/* "$BACK_SRC_STATIC"/
else
  echo "Warning: dist folder not found; backend will not embed SPA assets." >&2
fi

echo "[3/5] Packaging backend via Maven (aggregator -> backend module)..."
./mvnw -q -e -DskipTests -pl backend -am package

ARTIFACT=$(ls -1 "$ROOT_DIR/backend/target"/*.jar | head -n1 || true)
if [ -z "$ARTIFACT" ]; then
  echo "Error: backend artifact not found in backend/target" >&2
  exit 1
fi

echo "Built JAR: $ARTIFACT"

echo "[4/5] Building Docker image (ema-ecom-app)..."
docker build -t ema-ecom-app:latest "$ROOT_DIR"

echo "[5/5] Done. Run with: docker compose up -d"
