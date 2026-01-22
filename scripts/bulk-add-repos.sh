#!/bin/bash
# Bulk add repos to registry
# Usage:
#   ./scripts/bulk-add-repos.sh                    # Add from default list
#   ./scripts/bulk-add-repos.sh repos.txt          # Add from file (one repo per line)
#   ./scripts/bulk-add-repos.sh owner/repo [...]   # Add specific repos

set -e

# Default repos if no args provided
DEFAULT_REPOS=(
  # Design system libraries
  "chakra-ui/chakra-ui"
  "radix-ui/primitives"
  "shadcn-ui/ui"
  "mantinedev/mantine"
  "adobe/react-spectrum"
  "ariakit/ariakit"
  "tailwindlabs/headlessui"
  "nextui-org/nextui"
  "microsoft/fluentui"
  "ant-design/ant-design"
  "mui/material-ui"
  "primefaces/primereact"
  "tremorlabs/tremor"

  # Apps using design systems (drift candidates)
  "calcom/cal.com"
  "supabase/supabase"
  "vercel/commerce"
  "documenso/documenso"
  "formbricks/formbricks"
  "twentyhq/twenty"
  "lobehub/lobe-chat"
  "refinedev/refine"
  "medusajs/medusa"
)

# Determine repos to add
if [ $# -eq 0 ]; then
  REPOS=("${DEFAULT_REPOS[@]}")
elif [ -f "$1" ]; then
  # Read from file
  mapfile -t REPOS < "$1"
else
  # Use command line args
  REPOS=("$@")
fi

echo "Adding ${#REPOS[@]} repos to registry..."
echo ""

ADDED=0
SKIPPED=0
FAILED=0

for repo in "${REPOS[@]}"; do
  # Skip empty lines and comments
  [[ -z "$repo" || "$repo" =~ ^# ]] && continue

  echo -n "Adding $repo... "
  OUTPUT=$(./dist/cli.js discover add "$repo" 2>&1) || true

  if echo "$OUTPUT" | grep -q "Added to registry"; then
    echo "✓ added"
    ((ADDED++))
  elif echo "$OUTPUT" | grep -q "already in registry"; then
    echo "- skipped (exists)"
    ((SKIPPED++))
  else
    echo "✗ failed"
    ((FAILED++))
  fi

  sleep 0.2
done

echo ""
echo "Done: $ADDED added, $SKIPPED skipped, $FAILED failed"
