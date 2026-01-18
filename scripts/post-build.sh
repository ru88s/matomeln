#!/bin/bash

# Post-build script to update _routes.json for auth middleware
# This ensures the middleware runs on all routes, not just /api/*

ROUTES_FILE="out/_routes.json"

if [ -f "$ROUTES_FILE" ]; then
  # Update _routes.json to include all routes for middleware
  cat > "$ROUTES_FILE" << 'EOF'
{
  "version": 1,
  "include": [
    "/*"
  ],
  "exclude": [
    "/_next/static/*",
    "/favicon.ico",
    "/favicon.svg",
    "/apple-touch-icon.svg",
    "/og-image.png",
    "/og-image.svg",
    "/manifest.json",
    "/robots.txt",
    "/sitemap.xml"
  ]
}
EOF
  echo "Updated _routes.json for auth middleware"
else
  echo "Warning: _routes.json not found"
fi
