# Makefile to replace the bash build script
# Parallelizes platform builds after common steps (yarn install/build)
# Validation is implemented without shell ${...} variables (no $$ needed) using jq+awk.
# Environment inputs are read as Make variables: use $(VAR) form.
#
# Usage:
#   make                # build all (common -> tauri + android + ios in parallel)
#   make -j3 build      # run platform builds in parallel after common steps
#   make validate       # check @tauri-apps plugin versions vs Cargo.lock
#
# Requirements:
# - macOS host with bash, jq, yarn, tauri, xcrun
# - PRODUCTBUILD_SIGNING_IDENTITY, APPLE_API_KEY_PATH, APPLE_API_ISSUER, APPLE_API_KEY in env (Make imports them)

SHELL := /bin/bash
.ONESHELL:

# -------- Load .env and export for all recipes --------
ifneq (,$(wildcard .env))
  include .env
  export
endif

# -------- React env --------
override REACT_APP_DEFAULT_INSTANCE := https://lemmy.zip
override REACT_APP_LOCK_TO_DEFAULT_INSTANCE := 0
export REACT_APP_DEFAULT_INSTANCE REACT_APP_LOCK_TO_DEFAULT_INSTANCE

# -------- Paths / constants --------
APP_NAME           := Blorp
UNIVERSAL_TARGET   := universal-apple-darwin
BUNDLE_DIR         := src-tauri/target/$(UNIVERSAL_TARGET)/release/bundle/macos
APP_BUNDLE         := $(BUNDLE_DIR)/$(APP_NAME).app
APP_TAR            := $(BUNDLE_DIR)/$(APP_NAME).app.tar.gz
APP_SIG            := $(APP_TAR).sig
RELEASE_DIR        := release
PKG_PATH           := $(RELEASE_DIR)/Mac-Installer.pkg
RELEASE_TAR_OUT    := $(RELEASE_DIR)/Mac-$(APP_NAME).app.tar.gz
ANDROID_APK_SRC    := android/app/release/app-release.apk
ANDROID_APK_OUT    := $(RELEASE_DIR)/blorp-android.apk
LOCKFILE           := src-tauri/Cargo.lock
PKGJSON            := ./package.json

# Default target
.PHONY: all build
all: build
build: preflight common tauri android ios
	printf "\n✅ Build complete. Artifacts in '%s'\n" "$(RELEASE_DIR)"

# -------- Common steps (run once) --------
.PHONY: preflight common yarn_install yarn_build validate dirs
preflight:
	command -v jq    >/dev/null || { echo "jq not found" >&2; exit 1; }
	command -v yarn  >/dev/null || { echo "yarn not found" >&2; exit 1; }
	command -v tauri >/dev/null || { echo "tauri not found" >&2; exit 1; }
	command -v xcrun >/dev/null || { echo "xcrun not found (macOS only)" >&2; exit 1; }

common: dirs yarn_install yarn_build

dirs:
	rm -rf $(RELEASE_DIR)
	mkdir -p $(RELEASE_DIR)

yarn_install: $(PKGJSON) yarn.lock
	yarn install

yarn_build: validate
	yarn build

# -------- Inline validation (no shell variables) --------
# Compares @tauri-apps/* versions in package.json with tauri-<plugin> versions in Cargo.lock
validate:
	command -v jq >/dev/null || { echo "error: jq is required" >&2; exit 1; }
	[ -f "${LOCKFILE}" ]   || { echo "error: ${LOCKFILE} not found" >&2; exit 1; }
	[ -f "${PKGJSON}" ]    || { echo "error: ${PKGJSON} not found" >&2; exit 1; }
	@while read -r plugin_name pkg_ver_raw; do \
		pkg_ver="$${pkg_ver_raw}"; \
		crate="tauri-$$plugin_name"; \
		lock_ver=$$( \
			awk -v crate="$$crate" ' \
				$$1=="name" { \
					n=$$3; gsub(/"/,"",n); \
					if(n==crate) { \
						if(getline && $$1=="version") { \
							v=$$3; gsub(/"/,"",v); \
							print v; \
							exit; \
						} \
					} \
				} \
			' ${LOCKFILE} \
		); \
		if [[ -z "$$lock_ver" ]]; then \
			echo "❌ $$crate@$$pkg_ver is in package.json but not found in Cargo.lock"; \
			exit 1; \
		elif [[ "$$pkg_ver" != "$$lock_ver" ]]; then \
			echo "❌ version mismatch for $$crate: package.json has $$pkg_ver, Cargo.lock has $$lock_ver"; \
			exit 1; \
		else \
			echo "✅ $$crate @ $$pkg_ver"; \
		fi \
	done < <(jq -r '[(.dependencies // {}), (.devDependencies // {})] | map(select(type=="object")) | add | to_entries[] | select(.key | startswith("@tauri-apps/")) | "\(.key | split("/") | .[1]) \(.value)"' ./package.json)

# -------- Tauri (macOS) pipeline --------
.PHONY: tauri tauri_build tauri_pkg tauri_notarize tauri_staple tauri_release_files

tauri: tauri_build tauri_pkg tauri_notarize tauri_staple tauri_release_files
	printf "\n✅ Tauri pipeline complete\n"

tauri_build: yarn_build | $(RELEASE_DIR)
	tauri build --no-bundle --target $(UNIVERSAL_TARGET)

tauri_pkg: tauri_build | $(RELEASE_DIR)
	xcrun productbuild --sign $(PRODUCTBUILD_SIGNING_IDENTITY) \
		--component "$(APP_BUNDLE)" /Applications \
		"$(PKG_PATH)"

tauri_notarize: tauri_pkg
	xcrun notarytool submit ${PKG_PATH} --key ${APPLE_API_KEY_PATH} --issuer ${APPLE_API_ISSUER} --key-id ${APPLE_API_KEY} --wait

tauri_staple: tauri_notarize
	xcrun stapler staple "$(PKG_PATH)"

test_here:
	cat > t.json <<-EOF
	{ "ok": true }
	EOF

tauri_release_files: tauri_staple
	version=$$(jq -r .version $(PKGJSON))
	sig=$$(< "$(APP_SIG)")
	{ printf '{\n'; \
	  printf '  "version": "%s",\n' "$$(jq -r .version $(PKGJSON))"; \
	  printf '  "platforms": {\n'; \
	  printf '    "darwin-aarch64": {\n'; \
	  printf '      "signature": "%s",\n' "$$(cat "$(APP_SIG)")"; \
	  printf '      "url": "https://github.com/christianjuth/blorp/releases/download/v%s/Mac-%s.app.tar.gz"\n' \
	    "$$(jq -r .version $(PKGJSON))" "$(APP_NAME)"; \
	  printf '    },\n'; \
	  printf '    "darwin-x86_64": {\n'; \
	  printf '      "signature": "%s",\n' "$$(cat "$(APP_SIG)")"; \
	  printf '      "url": "https://github.com/christianjuth/blorp/releases/download/v%s/Mac-%s.app.tar.gz"\n' \
	    "$$(jq -r .version $(PKGJSON))" "$(APP_NAME)"; \
	  printf '    }\n'; \
	  printf '  }\n'; \
	  printf '}\n'; } >"$(RELEASE_DIR)/latest.json"
	cp "$(APP_TAR)" "$(RELEASE_TAR_OUT)"

.PHONY: capacitor_sync
capacitor_sync:
	yarn ionic capacitor sync --no-build

.PHONY: android
android: yarn_build capacitor_sync | $(RELEASE_DIR)
	yarn ionic capacitor build android --no-build

.PHONY: ios
ios: yarn_build capacitor_sync | $(RELEASE_DIR)
	yarn ionic capacitor build ios --no-build

# -------- Maintenance --------
.PHONY: clean showenv help
clean:
	rm -rf $(RELEASE_DIR) src-tauri/target android/app/build
	printf "🧹 Cleaned build artifacts\n"

.PHONY: finish_release
finish_release:
	cp ${ANDROID_APK_SRC} ${ANDROID_APK_OUT}

showenv:
	@echo "REACT_APP_DEFAULT_INSTANCE=$(REACT_APP_DEFAULT_INSTANCE)"
	@echo "REACT_APP_LOCK_TO_DEFAULT_INSTANCE=$(REACT_APP_LOCK_TO_DEFAULT_INSTANCE)"

help:
	@echo "Targets:" \
	&& echo "  build (default)  - common -> [tauri android ios] in parallel" \
	&& echo "  tauri            - macOS app: build, pkg, notarize, staple, release files" \
	&& echo "  android          - Android AAB bundle (placeholder copies to release)" \
	&& echo "  ios              - iOS placeholder" \
	&& echo "  validate         - check @tauri-apps plugin versions vs Cargo.lock" \
	&& echo "  clean            - remove artifacts" \
	&& echo "Variables imported from env:" \
	&& echo "  PRODUCTBUILD_SIGNING_IDENTITY, APPLE_API_KEY_PATH, APPLE_API_ISSUER, APPLE_API_KEY" \
	&& echo "Notes:" \
	&& echo "  Run with -j to parallelize independent platform targets after common steps." \
	&& echo "  Example: make -j3 build"
