#!/bin/bash

# Verify that the build output contains all critical pages before deploy.
# Prevents shipping a broken build (e.g. missing /login causing site-wide 404).

set -e

OUT_DIR="out"
REQUIRED_PAGES=(
  "index.html"
  "login.html"
  "about.html"
  "contact.html"
  "privacy.html"
  "terms.html"
  "settings.html"
  "site-map.html"
)

if [ ! -d "$OUT_DIR" ]; then
  echo "ERROR: $OUT_DIR/ does not exist. Run 'npm run build' first." >&2
  exit 1
fi

MISSING=()
for page in "${REQUIRED_PAGES[@]}"; do
  if [ ! -f "$OUT_DIR/$page" ] && [ ! -f "$OUT_DIR/${page%.html}/index.html" ]; then
    MISSING+=("$page")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "ERROR: Build output is missing required pages:" >&2
  for page in "${MISSING[@]}"; do
    echo "  - $page" >&2
  done
  echo "Aborting deploy to prevent production breakage." >&2
  exit 1
fi

echo "Build verification passed: all ${#REQUIRED_PAGES[@]} required pages present."
