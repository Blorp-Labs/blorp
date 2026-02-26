fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios setup_match

```sh
[bundle exec] fastlane ios setup_match
```

One-time local setup: create certs and profiles in the Match repo

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build and upload to TestFlight

----


## Android

### android deploy

```sh
[bundle exec] fastlane android deploy
```

Build signed AAB + APK, upload AAB to Play Store internal track

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
