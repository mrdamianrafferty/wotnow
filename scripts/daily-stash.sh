#!/bin/bash

# Abort on error, undefined variable, or pipe failure.
set -euo pipefail

REPO_DIR="/Users/damianrafferty/Projects/WotNow"

cd "$REPO_DIR"

# Only stash when there is something to save.
if git status --porcelain | grep -q .
then
  timestamp="$(date +"%Y-%m-%d %H:%M:%S")"
  git stash push -u -m "automated-daily-backup ${timestamp}"
else
  echo "daily-stash: working tree clean; nothing to stash."
fi
