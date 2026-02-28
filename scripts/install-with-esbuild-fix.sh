#!/usr/bin/env bash
# Install dependencies when normal `npm install` fails with esbuild EACCES.
# Run from repo root: bash scripts/install-with-esbuild-fix.sh
#
# This does: remove node_modules -> install with --ignore-scripts -> chmod esbuild -> rebuild esbuild -> postinstall.
# Pass --keep-node-modules to skip the removal (e.g. if you already have a clean tree).

set -e
cd "$(dirname "$0")/.."

KEEP_NODE_MODULES=false
for arg in "$@"; do
  [ "$arg" = "--keep-node-modules" ] && KEEP_NODE_MODULES=true
done

echo "Installing with esbuild EACCES workaround..."
echo ""

# 0. Remove node_modules for a clean install (avoids ENOTEMPTY / mixed state)
if [ "$KEEP_NODE_MODULES" = false ] && [ -d "node_modules" ]; then
  echo "Step 0: Removing existing node_modules for clean install"
  rm -rf node_modules
  echo ""
fi

# 1. Install all packages without running install scripts (binary gets extracted, script not run)
echo "Step 1: npm install --ignore-scripts"
npm install --ignore-scripts

# 2. Make esbuild binary executable so its install script can run
echo ""
echo "Step 2: Fix esbuild binary permissions"
if [ -f "node_modules/esbuild/bin/esbuild" ]; then
  chmod +x node_modules/esbuild/bin/esbuild
  echo "  chmod +x node_modules/esbuild/bin/esbuild"
fi
# Platform-specific optional deps (e.g. linux-x64)
for dir in node_modules/@esbuild/*/; do
  [ -d "$dir" ] || continue
  if [ -f "${dir}bin/esbuild" ]; then
    chmod +x "${dir}bin/esbuild"
    echo "  chmod +x ${dir}bin/esbuild"
  fi
done

# 3. Run esbuild's install script (validates binary)
echo ""
echo "Step 3: npm rebuild esbuild"
npm rebuild esbuild

# 4. Run project postinstall (patch-package)
echo ""
echo "Step 4: npm run postinstall"
npm run postinstall

echo ""
echo "Done. Dependencies installed successfully."
