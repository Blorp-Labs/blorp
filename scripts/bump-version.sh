#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <old_version> <new_version> [<root_path>]"
  exit 1
fi

OLD_VER=$1
NEW_VER=$2
ROOT=${3:-.}

# 0) Ensure no uncommitted changes
if ! git -C "$ROOT" diff-index --quiet HEAD --; then
  echo "✖ You have uncommitted changes in $ROOT. Please commit or stash them before running this script."
  exit 1
fi

echo "Bumping version from $OLD_VER → $NEW_VER in $ROOT …"

# 1) JSON files (package.json, capacitor.config.json)
for f in package.json capacitor.config.json src-tauri/tauri.conf.json; do
  if [ -f "$ROOT/$f" ]; then
    sed -i.bak -E "s/\"version\": \"$OLD_VER\"/\"version\": \"$NEW_VER\"/g" "$ROOT/$f"
    echo "  ✔ $f"
  fi
done

# 2) Gradle files (any *.gradle under android/)
ANDROID_GRADLE="$ROOT/android/app/build.gradle"
if [ -f "$ANDROID_GRADLE" ]; then
  # ── 2a) Bump versionCode by 1 ──────────────────────────────────────────
  # Extract current numeric versionCode (assumes the line is like: versionCode 42)
  currentCode=$(grep -E "versionCode[[:space:]]+[0-9]+" "$ANDROID_GRADLE" | awk '{print $2}')
  if [[ -n "$currentCode" ]]; then
    newCode=$((currentCode + 1))
    sed -i.bak -E "s/(versionCode[[:space:]]+)$currentCode/\1$newCode/g" "$ANDROID_GRADLE"
    echo "  ✔ versionCode bumped from $currentCode → $newCode"
  else
    echo "  ✖ Could not find versionCode; skipping build‐number bump"
  fi

  # ── 2b) Bump versionName from OLD_VER to NEW_VER ────────────────────────
  sed -i.bak -E "s/versionName \"$OLD_VER\"/versionName \"$NEW_VER\"/g" "$ANDROID_GRADLE"
  echo "  ✔ versionName"
fi

# 3) Xcode project MARKETING_VERSION
PBXPROJ="$ROOT/ios/App/App.xcodeproj/project.pbxproj"
if [ -f "$PBXPROJ" ]; then
  sed -i.bak -E \
    "s/(MARKETING_VERSION = )$OLD_VER;/\1$NEW_VER;/g" \
    "$PBXPROJ"
  echo "  ✔ project.pbxproj (MARKETING_VERSION)"
fi

# 4) Tauri
TAURI="$ROOT/src-tauri/Cargo.toml"
if [ -f "$TAURI" ]; then
  sed -i.bak -E "s/version = \"$OLD_VER\"/version = \"$NEW_VER\"/g" "$TAURI"
  echo "  ✔ Tauri (Cargo.toml)"
fi

# 5) Regenerate Cargo.lock
if [ -d "$ROOT/src-tauri" ]; then
  pushd "$ROOT/src-tauri" >/dev/null
    cargo update -p Blorp --precise "$NEW_VER"
  popd >/dev/null
  echo "  ✔ regenerated Cargo.lock"
fi

if ! ./scripts/validate-tauri.sh; then
  echo "❌ Plugin‑version check failed; aborting." >&2
  exit 1
fi

# 6) Cleanup .bak files
find "$ROOT" -type f -name "*.bak" -delete

# 7) Commit, tag, and push
git -C "$ROOT" add -u
git -C "$ROOT" commit -m "chore: bump version to $NEW_VER"
echo "  ✔ Committed changes"

git -C "$ROOT" tag -a "v$NEW_VER" -m "v$NEW_VER"
echo "  ✔ Created annotation tag v$NEW_VER"

git -C "$ROOT" push
echo "  ✔ Pushed commit to origin"

git -C "$ROOT" push origin "v$NEW_VER"
echo "  ✔ Pushed tag v$NEW_VER to origin"

echo "✅ Done!"
