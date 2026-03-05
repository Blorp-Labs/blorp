#!/bin/bash
set -euo pipefail

# Usage: dotenvx run -- ./scripts/beta-ios.sh [build-number]
#
# BUILD_NUMBER defaults to a UTC timestamp if not set and not passed as an argument.
# BETA_VERSION overrides the marketing version (e.g. BETA_VERSION=1.11.0).
#   Without it, the patch version is auto-bumped (e.g. 1.10.8 → 1.10.9) to
#   open a new TestFlight train. Bump the major version for prod releases.
# All secrets (MATCH_*, APP_STORE_CONNECT_*, etc.) must be in the environment
# — prefix this script with: dotenvx run --

BUILD_NUMBER="${1:-${BUILD_NUMBER:-$(date -u +%s)}}"
BETA_NOTES="local beta · $(git rev-parse --abbrev-ref HEAD) · $(git rev-parse --short HEAD)"

echo "==> Building web assets + cap sync"
pnpm build

echo "==> Installing CocoaPods"
pod install --repo-update --project-directory=ios/App

echo "==> Running fastlane ios beta (build number: $BUILD_NUMBER)"
BUILD_NUMBER="$BUILD_NUMBER" \
BETA_NOTES="$BETA_NOTES" \
bundle exec fastlane ios beta
