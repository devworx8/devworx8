#!/usr/bin/env bash
# Pre-production build: run verify:prod, then build:android:aab if it passes.
# See docs/PRODUCTION_BUILD_CHECKLIST.md for full checklist.

set -e
cd "$(dirname "$0")/.."

echo "Running verify:prod (lint, typecheck, test, reliability audit, expo-filesystem)..."
npm run verify:prod

echo "Verification passed. Starting production AAB build..."
npm run build:android:aab
