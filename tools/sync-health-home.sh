#!/usr/bin/env bash
# Re-copy the Health Home app into apps/health-home/ so the blog serves the current version.
# Only static files are copied: no node_modules, and never Origin/ (it holds a private key).
# Usage: tools/sync-health-home.sh [source folder]
set -euo pipefail

source_dir="${1:-/mnt/d/Study/Programming/toys/Health_Home}"
dest_dir="$(cd "$(dirname "$0")/.." && pwd)/apps/health-home"

rsync -a --delete \
  --exclude node_modules --exclude Origin --exclude .git \
  --exclude 'package*.json' --exclude run.sh \
  "$source_dir"/ "$dest_dir"/

# Belt and braces: drop anything key-shaped that slipped through
find "$dest_dir" \( -name '*.key' -o -name '*.pem' \) -print -delete

echo "synced $source_dir -> $dest_dir"
