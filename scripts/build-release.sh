#!/bin/bash
set -a  # Automatically export all variables
source .env
set +a  # Stop automatic export

export REACT_APP_DEFAULT_INSTANCE="https://lemmy.zip"
export REACT_APP_LOCK_TO_DEFAULT_INSTANCE=0EACT_APP_LOCK_TO_DEFAULT_INSTANCE=0

if ! ./scripts/validate-tauri.sh; then
  echo "❌ Plugin‑version check failed; aborting." >&2
  exit 1
fi

# 0) Clean release folder
rm -rf release
mkdir release

# 1) Make sure pnpm is up to date
pnpm install

# 2) Build Tauri MacOS
tauri build --bundles app --target universal-apple-darwin
xcrun productbuild --sign "$PRODUCTBUILD_SIGNING_IDENTITY" \
    --component "./src-tauri/target/universal-apple-darwin/release/bundle/macos/Blorp.app" /Applications \
    release/Mac-Installer.pkg
xcrun notarytool submit release/Mac-Installer.pkg --key $APPLE_API_KEY_PATH --issuer $APPLE_API_ISSUER --key-id $APPLE_API_KEY --wait
xcrun stapler staple release/Mac-Installer.pkg

# Generate release files for git
set -euo pipefail
version=$(jq -r .version package.json)
sigfile="src-tauri/target/universal-apple-darwin/release/bundle/macos/Blorp.app.tar.gz.sig"
sig=$(< "$sigfile")

cat > release/latest.json <<EOF
{
  "version": "$version",
  "platforms": {
    "darwin-aarch64": {
      "signature": "$sig",
      "url": "https://github.com/Blorp-Labs/blorp/releases/download/v$version/Mac-Blorp.app.tar.gz"
    },
    "darwin-x86_64": {
      "signature": "$sig",
      "url": "https://github.com/Blorp-Labs/blorp/releases/download/v$version/Mac-Blorp.app.tar.gz"
    }
  }
}
EOF

cp src-tauri/target/universal-apple-darwin/release/bundle/macos/Blorp.app.tar.gz release/Mac-Blorp.app.tar.gz

# 3) Build 
cd android
./gradlew bundleRelease
cd ..

cp android/app/build/outputs/bundle/release/app-release.aab ./release/android-release.aab
