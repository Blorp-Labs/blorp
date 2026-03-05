#!/bin/bash
set -euo pipefail

# Usage: dotenvx run -- ./scripts/beta-android.sh [version-code]
#
# VERSION_CODE defaults to a UTC timestamp if not set and not passed as an argument.
# VERSION_NAME is auto-computed as latest git tag + 0.0.1 (e.g. 1.10.8 → 1.10.9).
#   Override with VERSION_NAME=x.y.z if needed.
# All secrets (ANDROID_KEYSTORE_*, GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, etc.) must
# be in the environment — prefix this script with: dotenvx run --

VERSION_CODE="${1:-${VERSION_CODE:-$(date -u +%s)}}"
BETA_NOTES="local beta · $(git rev-parse --abbrev-ref HEAD) · $(git rev-parse --short HEAD)"

if [[ -z "${VERSION_NAME:-}" ]]; then
  TAG=$(git describe --tags --abbrev=0 | sed 's/^v//')
  MAJOR=$(echo "$TAG" | cut -d. -f1)
  MINOR=$(echo "$TAG" | cut -d. -f2)
  PATCH=$(echo "$TAG" | cut -d. -f3)
  VERSION_NAME="${MAJOR}.${MINOR}.$((PATCH + 1))"
fi

KEYSTORE_PATH="${ANDROID_KEYSTORE_PATH:-}"
if [[ -z "$KEYSTORE_PATH" ]]; then
  if [[ -z "${ANDROID_KEYSTORE_BASE64:-}" ]]; then
    echo "Error: ANDROID_KEYSTORE_PATH or ANDROID_KEYSTORE_BASE64 must be set." >&2
    exit 1
  fi
  KEYSTORE_PATH="$(mktemp /tmp/blorp-release.XXXXXX.keystore)"
  echo "$ANDROID_KEYSTORE_BASE64" | base64 --decode > "$KEYSTORE_PATH"
  trap 'rm -f "$KEYSTORE_PATH"' EXIT
fi

echo "==> Building web assets + cap sync"
pnpm vite build
pnpm exec cap sync android
pnpm cp-package-json

echo "==> Creating changelog"
CHANGELOG_FILE="fastlane/metadata/android/en-US/changelogs/${VERSION_CODE}.txt"
mkdir -p fastlane/metadata/android/en-US/changelogs
echo "$BETA_NOTES" > "$CHANGELOG_FILE"
trap 'rm -f "$CHANGELOG_FILE"' EXIT

echo "==> Running fastlane android deploy (version: $VERSION_NAME, code: $VERSION_CODE)"
VERSION_CODE="$VERSION_CODE" \
VERSION_NAME="$VERSION_NAME" \
BETA_NOTES="$BETA_NOTES" \
ANDROID_KEYSTORE_PATH="$KEYSTORE_PATH" \
bundle exec fastlane android deploy
