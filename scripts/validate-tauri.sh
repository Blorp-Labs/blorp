#!/usr/bin/env bash
set -euo pipefail

LOCKFILE="./src-tauri/Cargo.lock"
PKGJSON="package.json"

command -v jq >/dev/null || { echo "error: jq is required" >&2; exit 1; }
[ -f "$LOCKFILE" ]   || { echo "error: $LOCKFILE not found" >&2; exit 1; }
[ -f "$PKGJSON" ]    || { echo "error: $PKGJSON not found" >&2; exit 1; }

fail=0

# Read from jq via process substitution so the loop is _not_ in a subshell
while read -r plugin_name pkg_ver_raw; do
  # skip @tauri-apps/cli explicitly
  if [[ "$plugin_name" == "cli" ]]; then
    echo "ℹ️ skipping @tauri-apps/cli"
    continue
  fi

  # skip @tauri-apps/api explicitly
  if [[ "$plugin_name" == "api" ]]; then
    echo "ℹ️ skipping @tauri-apps/api"
    continue
  fi

  # strip any leading ^ or ~
  pkg_ver="${pkg_ver_raw#[\^~]}"
  crate="tauri-${plugin_name}"

  # get version from Cargo.lock right after name = "crate"
  lock_ver=$(
    awk -v crate="$crate" '
      $1=="name" {
        n=$3; gsub(/"/,"",n)
        if(n==crate) {
          if(getline && $1=="version") {
            v=$3; gsub(/"/,"",v)
            print v
            exit
          }
        }
      }
    ' "$LOCKFILE"
  )

  if [[ -z "$lock_ver" ]]; then
    echo "❌ $crate@$pkg_ver is in package.json but not found in Cargo.lock"
    fail=1
  elif [[ "$pkg_ver" != "$lock_ver" ]]; then
    echo "❌ version mismatch for $crate: package.json has $pkg_ver, Cargo.lock has $lock_ver"
    fail=1
  else
    echo "✅ $crate @ $pkg_ver"
  fi
done < <(
  jq -r '
    [(.dependencies // {}), (.devDependencies // {})]
    | map(select(type=="object"))
    | add
    | to_entries[]
    | select(.key | startswith("@tauri-apps/"))
    | "\(.key | split("/") | .[1]) \(.value)"
  ' "$PKGJSON"
)

if (( fail )); then
  echo "🚨 One or more @tauri-apps plugins are out of sync!" >&2
  exit 1
else
  echo "✅ All @tauri-apps plugin versions match Cargo.lock."
fi
