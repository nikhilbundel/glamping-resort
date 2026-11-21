#!/usr/bin/env bash
# Package the project (without dependencies, build output, secrets or uploads) as glamping-resort.zip
set -euo pipefail
cd "$(dirname "$0")/.."
rm -f glamping-resort.zip
zip -rq glamping-resort.zip . \
  -x "node_modules/*" ".next/*" ".env" ".env.local" "*.zip" "public/uploads/*" "storage/*" "tsconfig.tsbuildinfo" \
  -i "*" 
zip -q glamping-resort.zip public/uploads/.gitkeep storage/uploads/.gitkeep
echo "Created glamping-resort.zip ($(du -h glamping-resort.zip | cut -f1))"
