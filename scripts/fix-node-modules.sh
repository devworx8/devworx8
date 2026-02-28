#!/usr/bin/env bash
# Fix node_modules after install as root or EACCES on esbuild.
# Run from repo root: bash scripts/fix-node-modules.sh
#
# For a full install that avoids esbuild EACCES, use:
#   bash scripts/install-with-esbuild-fix.sh

set -e
cd "$(dirname "$0")/.."

echo "Fixing node_modules permissions..."

# If node_modules is owned by root, reown to current user (requires sudo)
if [ -d "node_modules" ]; then
  if [ -O "node_modules" ]; then
    echo "node_modules already owned by you."
  else
    echo "Reowning node_modules to $(whoami) (may prompt for sudo)..."
    sudo chown -R "$(whoami):$(whoami)" node_modules
  fi

  # Ensure esbuild binary is executable (fixes EACCES during install)
  fix_esbuild() {
    if [ -f "node_modules/esbuild/bin/esbuild" ]; then
      chmod +x node_modules/esbuild/bin/esbuild
      echo "esbuild binary is executable."
    fi
    for f in node_modules/@esbuild/linux-x64/bin/esbuild 2>/dev/null; do
      [ -f "$f" ] && chmod +x "$f" && echo "Fixed $f"
    done
  }
  fix_esbuild
else
  echo "No node_modules found. Run: bash scripts/install-with-esbuild-fix.sh"
fi

echo "Done."
