<p align="center">
  <a href="https://blorpblorp.xyz/" target="_blank" rel="noopener noreferrer">
    <img width="185" height="120" src="https://github.com/user-attachments/assets/2aee1810-2d98-461a-989d-3282a2b93a2e" alt="Blorp logo">
  </a>
  <h1 align="center">Blorp</h1>
</p>

<p align="center">
<a href="https://blorpblorp.xyz/" target="_blank" rel="noopener noreferrer">Web App</a> · <a href="https://github.com/Blorp-Labs/blorp/issues/new?assignees=&labels=bug&projects=&template=bug_report.md&title=">Report Bug</a> · <a href="https://github.com/Blorp-Labs/blorp/issues/new?assignees=&labels=enhancement&projects=&template=feature_request.md&title=">Request Feature</a> · <a href="https://github.com/Blorp-Labs/blorp/releases">Releases</a>
</p>

<p align="center">
&nbsp;<a href="https://apps.apple.com/us/app/blorp-for-lemmy/id6739925430"><img src="public/badges/ios.svg" height="45"></a>&nbsp;
&nbsp;<a href="https://play.google.com/store/apps/details?id=xyz.blorpblorp.app"><img src="public/badges/play.svg" height="45"></a>&nbsp;
&nbsp;<a href="https://f-droid.org/en/packages/xyz.blorpblorp.app/"><img src="public/badges/fdroid.png" height="45"></a>&nbsp;
</p>
<p align="center">
  <a href="https://matrix.to/#/#blorp:matrix.org"><img src="https://img.shields.io/badge/chat-matrix-blue?style=flat-square&logo=matrix" alt="matrix chat"></a>
</p>
<br/>

<p align="center">
 &nbsp;<img src="public/screenshots/iphone-1.png" width="150">&nbsp;
 &nbsp;<img src="public/screenshots/iphone-2.png" width="150">&nbsp;
 &nbsp;<img src="public/screenshots/iphone-3.png" width="150">&nbsp;
 &nbsp;<img src="public/screenshots/iphone-4.png" width="150">&nbsp;
 &nbsp;<img src="public/screenshots/iphone-5.png" width="150">&nbsp;
</p>
<br/>

## 🚀 Download

* [Web - blorpblorp.xyz](https://blorpblorp.xyz)
* [iOS](https://apps.apple.com/us/app/blorp-for-lemmy/id6739925430)
* Android
    * [Google Play](https://play.google.com/store/apps/details?id=xyz.blorpblorp.app)
    * [F-Droid](https://f-droid.org/en/packages/xyz.blorpblorp.app/)
* [macOS](https://github.com/Blorp-Labs/blorp/releases/latest)

## 🧪 Beta Testing

* [Join iOS TestFlight Beta](https://testflight.apple.com/join/T2pYyShr)
* [Join Google Play Beta](https://play.google.com/apps/testing/xyz.blorpblorp.app)

## ❤️ Friends of Blorp
| Url | Lemmy | PieFed | Version |
|-----|-----|-----|----|
| [blorp.lemmy.world](https://blorp.lemmy.world) | ✅ || ![Version](https://img.shields.io/badge/dynamic/json?url=https://blorp.lemmy.world/package.json&query=%24.version&label=&cacheSeconds=300) |
| [blorp.piefed.world](https://blorp.piefed.world) || ✅ | ![Version](https://img.shields.io/badge/dynamic/json?url=https://blorp.piefed.world/package.json&query=%24.version&label=&cacheSeconds=300) |
| [blorp.lemmy.zip](https://blorp.lemmy.zip) | ✅ || ![Version](https://img.shields.io/badge/dynamic/json?url=https://blorp.lemmy.zip/package.json&query=%24.version&label=&cacheSeconds=300) |
| [blorp.piefed.zip](https://blorp.piefed.zip) || ✅ | ![Version](https://img.shields.io/badge/dynamic/json?url=https://blorp.piefed.zip/package.json&query=%24.version&label=&cacheSeconds=300) |
| [b.feddit.uk](https://b.feddit.uk) | ✅ || ![Version](https://img.shields.io/badge/dynamic/json?url=https://b.feddit.uk/package.json&query=%24.version&label=&cacheSeconds=300) |
| [blorp.europe.pub](https://blorp.europe.pub) | ✅ || ![Version](https://img.shields.io/badge/dynamic/json?url=https://blorp.europe.pub/package.json&query=%24.version&label=&cacheSeconds=300) |
| [b.lemmy.nz](https://b.lemmy.nz/) | ✅ || ![Version](https://img.shields.io/badge/dynamic/json?url=https://b.lemmy.nz/package.json&query=%24.version&label=&cacheSeconds=300) |
| [b.lazysoci.al](https://b.lazysoci.al) | ✅ || ![Version](https://img.shields.io/badge/dynamic/json?url=https://b.lazysoci.al/package.json&query=%24.version&label=&cacheSeconds=300) |
| [blorp.blahaj.zone](https://blorp.blahaj.zone) | ✅ |✅| ![Version](https://img.shields.io/badge/dynamic/json?url=https://blorp.blahaj.zone/package.json&query=%24.version&label=&cacheSeconds=300) |

## 🐳 Self host via Docker

*Recommended: use the [Blorp deployment configuration tool](https://deploy.blorpblorp.xyz/)*

```bash
# pull the latest Blorp image
docker pull ghcr.io/blorp-labs/blorp:latest

# run it on port 8080 (host → container), passing any runtime env‑vars you need
docker run -d \ 
  --name blorp \ 
  -p 8080:80 \ 
  -e REACT_APP_NAME="Blorp" \ 
  -e REACT_APP_DEFAULT_INSTANCE="https://lemmy.world,https://piefed.zip" \ 
  -e REACT_APP_LOCK_TO_DEFAULT_INSTANCE="1" \ 
  -e REACT_APP_INSTANCE_SELECTION_MODE="default_first"  
  ghcr.io/blorp-labs/blorp:latest
```

## 💬 Blorp Community

Want to ask questions, share feedback, or just chat with other Blorp users? Head over to our community at  
[lemmy.zip/c/blorp](https://lemmy.zip/c/blorp).

## 📚 Stack

* [React](https://react.dev/) – The library for web and native user interfaces
* [Ionic/Capacitor](https://ionicframework.com/docs/) – An open source UI toolkit for building performant, high-quality mobile apps using web technologies
* [Tauri](https://tauri.app/) – Create small, fast, secure, cross-platform applications
* [Vite](https://vite.dev/) – Next Generation Frontend Tooling
* [Zustand](https://github.com/pmndrs/zustand/) – Bear necessities for state management in React
* [TanStack Query](https://tanstack.com/query/docs) – Powerful asynchronous state management for TS/JS, React, Solid, Vue, Svelte and Angular
* [TanStack Virtual](https://tanstack.com/virtual/latest) – Headless UI for Virtualizing Large Element Lists

## ❤️ Special thanks to 

* Voyager. I settled on a stack that is pretty similar to [Voyager](https://github.com/aeharding/voyager). There are a bunch of problems that Voyager had already solved that I was able to solve very quickly by looking at their codebase. Special thanks to [aeharding](https://github.com/aeharding) for answering many of my questions. I also regularly test Blorp against Voyager to ensure I deliver the quality of app that Blorp users deserve.
* The PieFed team for their support and quickly resolving any and all feedback I brought them.

## 📄 License

* [AGPL-3.0](https://github.com/Blorp-Labs/blorp/blob/main/LICENSE) © Blorp
* You can also view all the [licenses of the libraries we ship](https://github.com/Blorp-Labs/blorp/blob/main/THIRD-PARTY-NOTICES.md) in our app
