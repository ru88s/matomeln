#!/bin/bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="/Users/wataruyonamine/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"

cd "$REPO_DIR"

./scripts/dev-setup.sh

exec "$NODE_BIN" ./node_modules/.bin/../next/dist/bin/next dev -p 3000
