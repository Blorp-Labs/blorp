# Release Guide

Blorp uses GitHub Actions to build and release iOS and Android automatically on `v*` tags. Tags are created by `scripts/bump-version.sh`.

## Triggering a Release

```bash
./scripts/bump-version.sh
```

This increments the version, creates a git tag, and pushes it. CI picks up the tag and runs the release workflow.

## One-Time Setup

Before CI can run, you need to complete the steps below and configure the required GitHub secrets at **Settings > Secrets and variables > Actions**.

---

## iOS

iOS builds are handled by Fastlane. It fetches signing certificates and provisioning profiles from a private certificates repository (managed by Fastlane Match), builds the app, and uploads it to TestFlight.

### 1. Private Certificates Repository

Create a new **private** GitHub repository (e.g. `blorp-certs`). This is where Fastlane Match stores encrypted certificates and provisioning profiles. It should stay empty — Match populates it.

### 2. App Store Connect API Key

Used by Fastlane to authenticate with Apple without needing an Apple ID or 2FA.

1. Go to **App Store Connect > Users and Access > Integrations > App Store Connect API > Team Keys**
2. Create a new key with the **App Manager** role
3. Note the **Key ID** (10-character string) and **Issuer ID** (UUID shown at the top of the page)
4. Download the `.p8` file — this is a one-time download

### 3. GitHub Personal Access Token (for certs repo)

Used by Fastlane Match to clone and push to the private certificates repository.

1. Go to **GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)**
2. Create a token with `repo` scope
3. Encode it: `echo -n "your-github-username:ghp_yourtoken" | base64`

### 4. Bootstrap Fastlane Match (run once locally)

This populates the certs repo with your App Store certificates and provisioning profiles. Run from the repo root with Ruby 3.3:

```bash
APP_STORE_CONNECT_KEY_ID="your-key-id" \
APP_STORE_CONNECT_ISSUER_ID="your-issuer-uuid" \
APP_STORE_CONNECT_API_KEY_CONTENT="$(base64 -i /path/to/AuthKey_XXXXX.p8)" \
MATCH_GIT_BASIC_AUTHORIZATION="$(echo -n 'username:ghp_token' | base64)" \
MATCH_PASSWORD="your-passphrase" \
bundle exec fastlane ios setup_match
```

Set `MATCH_PASSWORD` to a strong passphrase. Store it in a password manager — you will need it as a GitHub secret.

### iOS GitHub Secrets

| Secret                              | Description                                         | Where to get it                                                                                                                                                                                                            |
| ----------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APPLE_ID`                          | Your Apple ID email                                 | The email you use to sign into App Store Connect                                                                                                                                                                           |
| `ITC_TEAM_ID`                       | Numeric App Store Connect team ID                   | Sign into `appstoreconnect.apple.com`, open browser dev tools, look for a numeric team ID in API requests. Also findable at `appstoreconnect.apple.com/WebObjects/iTunesConnect.woa/ra/user/detail` as `contentProviderId` |
| `MATCH_GIT_URL`                     | HTTPS URL of the private certs repo                 | The repo you created in step 1, e.g. `https://github.com/your-org/blorp-certs.git`                                                                                                                                         |
| `MATCH_PASSWORD`                    | Passphrase used to encrypt certs in the repo        | Set during `fastlane match init`                                                                                                                                                                                           |
| `MATCH_GIT_BASIC_AUTHORIZATION`     | Base64-encoded `username:github_pat` for certs repo | See step 3 above                                                                                                                                                                                                           |
| `APP_STORE_CONNECT_KEY_ID`          | 10-character API key ID                             | App Store Connect API Keys page                                                                                                                                                                                            |
| `APP_STORE_CONNECT_ISSUER_ID`       | UUID issuer ID                                      | App Store Connect API Keys page                                                                                                                                                                                            |
| `APP_STORE_CONNECT_API_KEY_CONTENT` | Base64-encoded contents of the `.p8` key file       | `base64 -i /path/to/AuthKey_XXXXX.p8`                                                                                                                                                                                      |

---

## Android

Android builds are handled by Fastlane. It signs the app with your release keystore, uploads the AAB to the Play Store internal track, and uploads the AAB and APK as GitHub Actions artifacts.

### 1. Release Keystore

**If you have already shipped the app**, use your existing keystore. You cannot change it — Android uses it to verify updates come from the same developer.

If you are starting fresh:

```bash
keytool -genkey -v -keystore blorp-release.keystore -alias blorp -keyalg RSA -keysize 2048 -validity 10000
```

Encode it for use as a GitHub secret:

```bash
base64 -i blorp-release.keystore | pbcopy
```

### 2. Google Play Service Account

Used by Fastlane to upload builds to the Play Store.

1. Go to **Google Play Console > Settings > API access**
2. Link to a Google Cloud project
3. Click **Create new service account** — this takes you to Google Cloud Console
4. Give it a name, create it, then go to its **Keys** tab and create a **JSON** key — download it
5. Back in Play Console under API access, find the service account and click **Grant access**
6. Add your app and set the role to **Release Manager**

### Android GitHub Secrets

| Secret                             | Description                                        | Where to get it                                                                           |
| ---------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `ANDROID_KEYSTORE_BASE64`          | Base64-encoded release keystore file               | `base64 -i blorp-release.keystore`                                                        |
| `ANDROID_KEYSTORE_PASSWORD`        | Password for the keystore                          | Set during `keytool -genkey`                                                              |
| `ANDROID_KEY_ALIAS`                | Key alias inside the keystore                      | Set during `keytool -genkey`. Check with `keytool -list -keystore blorp-release.keystore` |
| `ANDROID_KEY_PASSWORD`             | Password for the key entry                         | Set during `keytool -genkey` (often same as keystore password)                            |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Full contents of the service account JSON key file | Downloaded from Google Cloud Console in step 2                                            |

---

## macOS (Tauri)

The macOS build compiles a universal binary (arm64 + x86_64), signs it, creates a notarized `.pkg` installer, and uploads all release artifacts as a GitHub Actions artifact. GitHub Releases are created manually.

### 1. Developer ID Application Certificate

Used by Tauri to sign the `.app` bundle during compilation.

1. Open **Keychain Access**
2. Go to **Keychain Access > Certificate Assistant > Request a Certificate from a Certificate Authority**
3. Enter your email and name, select **Save to disk** — this generates a `.certSigningRequest` file and stores the private key in your keychain
4. Go to **developer.apple.com > Account > Certificates**, click **+**, choose **Developer ID Application**
5. Upload the `.certSigningRequest` file and download the resulting `.cer`
6. Double-click the `.cer` to install it into Keychain Access
7. In Keychain Access, expand the certificate — a private key should appear nested under it
8. Right-click the certificate and export as `.p12`, set a password

Encode for GitHub:

```bash
base64 -i developer-id-application.p12 | tr -d '\n' | pbcopy
```

### 2. Developer ID Installer Certificate

Used by `productbuild` to sign the `.pkg` installer. Follow the same steps as above but choose **Developer ID Installer** in step 4.

```bash
base64 -i developer-id-installer.p12 | tr -d '\n' | pbcopy
```

### 3. Tauri Updater Signing Key

Used to sign update artifacts so the auto-updater can verify their integrity. This is a minisign key — you should already have one if you have been shipping updates.

The private key file (`.key`) is referenced locally in your `.env`. The raw file contents go directly into the GitHub secret — do not base64-encode it:

```bash
cat /path/to/your.key | pbcopy
```

The corresponding public key is already embedded in `tauri.conf.json` as `bundle.updater.pubkey`. Do not change it unless you are generating a new keypair.

### macOS GitHub Secrets

| Secret                                 | Description                                      | Where to get it                                                                                    |
| -------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `APPLE_CERTIFICATE`                    | Base64-encoded Developer ID Application `.p12`   | See step 1 above: `base64 -i app.p12 \| tr -d '\n'`                                                |
| `APPLE_CERTIFICATE_PASSWORD`           | Password set when exporting the `.p12`           | Set during Keychain Access export                                                                  |
| `APPLE_INSTALLER_CERTIFICATE`          | Base64-encoded Developer ID Installer `.p12`     | See step 2 above: `base64 -i installer.p12 \| tr -d '\n'`                                          |
| `APPLE_INSTALLER_CERTIFICATE_PASSWORD` | Password set when exporting the installer `.p12` | Set during Keychain Access export                                                                  |
| `PRODUCTBUILD_SIGNING_IDENTITY`        | Full signing identity string for `productbuild`  | Run `security find-identity -v -p basic` and copy the line starting with `Developer ID Installer:` |
| `TAURI_SIGNING_PRIVATE_KEY`            | Raw contents of the minisign private key file    | `cat /path/to/your.key \| pbcopy` — do not base64-encode                                           |
| `APP_STORE_CONNECT_KEY_ID`             | 10-character API key ID                          | Shared with iOS — App Store Connect API Keys page                                                  |
| `APP_STORE_CONNECT_ISSUER_ID`          | UUID issuer ID                                   | Shared with iOS — App Store Connect API Keys page                                                  |
| `APP_STORE_CONNECT_API_KEY_CONTENT`    | Base64-encoded `.p8` key file                    | Shared with iOS — `base64 -i AuthKey_XXXXX.p8 \| tr -d '\n'`                                       |

The last three secrets (`APP_STORE_CONNECT_*`) are shared with the iOS job — no need to create them again if iOS is already configured.

---

## What CI Does

### On every `v*` tag push:

**iOS job** (`macos-15`):

1. Builds web assets and syncs to Capacitor
2. Fetches certificates from the certs repo via Fastlane Match
3. Builds and archives the Xcode project
4. Uploads the `.ipa` to TestFlight

**Android job** (`ubuntu-latest`):

1. Builds web assets and syncs to Capacitor
2. Builds a signed AAB and uploads it to the Play Store internal track (as a draft)
3. Builds a signed APK
4. Uploads both the AAB and APK as GitHub Actions artifacts (retained 90 days)

**macOS job** (`macos-15`):

1. Builds web assets (Vite only — no Capacitor sync)
2. Compiles a universal Rust binary (arm64 + x86_64) via Tauri
3. Signs the `.app` with the Developer ID Application certificate
4. Creates a signed `.pkg` installer with `productbuild`
5. Notarizes and staples the `.pkg` via Apple's notarization service
6. Uploads `Mac-Installer.pkg`, `Mac-Blorp.app.tar.gz`, and `latest.json` as a GitHub Actions artifact (retained 90 days)

GitHub Releases are created manually. Download the artifacts from the Actions run, attach them to the release, and make sure `latest.json` is included so the auto-updater can find it.
