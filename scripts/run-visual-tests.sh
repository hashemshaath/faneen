#!/usr/bin/env bash
# Run Playwright visual regression tests with the same flow used in CI.
# Designed to run inside the official Playwright Docker image:
#   docker run --rm -it --ipc=host -v "$PWD":/work -w /work \
#     mcr.microsoft.com/playwright:v1.59.1-jammy \
#     bash scripts/run-visual-tests.sh [--update]
#
# Flags:
#   --update   Re-seed baselines (writes to e2e/__screenshots__/)
set -euo pipefail

UPDATE=0
for arg in "$@"; do
  case "$arg" in
    --update|-u) UPDATE=1 ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

export CI="${CI:-true}"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://localhost:8080}"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/ms-playwright}"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"

echo "▶ Verifying package-lock.json sync..."
if ! npm ci --dry-run --ignore-scripts > /tmp/npm-ci-dry.log 2>&1; then
  echo "✖ package-lock.json is out of sync with package.json." >&2
  tail -n 50 /tmp/npm-ci-dry.log >&2
  exit 1
fi

echo "▶ Installing dependencies..."
npm ci --no-audit --no-fund --prefer-offline

echo "▶ Ensuring Chromium is available..."
if ls "$PLAYWRIGHT_BROWSERS_PATH"/chromium-*/chrome-linux/chrome >/dev/null 2>&1; then
  echo "  Chromium already present in $PLAYWRIGHT_BROWSERS_PATH"
else
  npx playwright install chromium
fi

echo "▶ Building app..."
npm run build

echo "▶ Starting preview server..."
npx vite preview --host 0.0.0.0 --port 8080 --strictPort \
  > /tmp/preview.log 2>&1 &
PREVIEW_PID=$!
trap 'kill "$PREVIEW_PID" 2>/dev/null || true' EXIT

echo "▶ Waiting for server (max 120s)..."
for i in $(seq 1 120); do
  if curl -sf "$PLAYWRIGHT_BASE_URL" >/dev/null; then
    echo "  Server ready after ${i}s"
    break
  fi
  sleep 1
  if [ "$i" -eq 120 ]; then
    echo "✖ Preview server did not become ready in 120s" >&2
    echo "--- preview.log ---" >&2
    cat /tmp/preview.log >&2 || true
    exit 1
  fi
done

if [ "$UPDATE" -eq 1 ]; then
  echo "▶ Re-seeding visual baselines..."
  npm run test:visual:update
  echo "✔ Baselines updated in e2e/__screenshots__/"
else
  echo "▶ Running visual regression tests..."
  npm run test:visual
fi