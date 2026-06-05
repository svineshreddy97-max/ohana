#!/usr/bin/env bash
# commit-msg hook: strip Co-Authored-By and similar trailers.
# Install: cp scripts/strip-trailers.sh .git/hooks/commit-msg && chmod +x .git/hooks/commit-msg

MSG_FILE="$1"
if [ -z "$MSG_FILE" ]; then
  echo "Usage: strip-trailers.sh <commit-msg-file>" >&2
  exit 1
fi

# Remove Co-Authored-By lines (case-insensitive)
sed -i '/^[Cc]o-[Aa]uthored-[Bb]y:/d' "$MSG_FILE"

# Remove Signed-off-by lines (case-insensitive)
sed -i '/^[Ss]igned-off-by:/d' "$MSG_FILE"

# Trim trailing blank lines left behind
sed -i -e :a -e '/^\n*$/{$d;N;ba;}' "$MSG_FILE"
