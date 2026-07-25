# TyraX Cam

[![iOS build](https://github.com/doctorspider42/tyrax-cam/actions/workflows/ios.yml/badge.svg)](https://github.com/doctorspider42/tyrax-cam/actions/workflows/ios.yml)

Turn an iPhone into a **camera viewfinder for the TyraX editor**. Connect over
your Wi-Fi and the phone shows a live picture of the editor's 3D viewport; move
the phone and that camera moves with it — 6DoF, so walking across the room walks
the camera across the map. Press **Record** and the move is written into the
editor's cutscene timeline as camera keyframes.

TyraX is an editor for the [Tyra](https://github.com/h4570/tyra) PlayStation 2
engine, so the end result is a hand-held camera move playing back on a PS2.

> **This app has not been built on a device yet.** CI compiles it (see the badge)
> and the protocol is proven against the editor, but nobody has yet run it on a
> phone. Expect to fix small things, and please update this note when you do.

## What it does

- Connects to the editor over the LAN with a 6-digit pairing code.
- Streams **ARKit world-tracking pose** at 30 Hz — position in metres plus
  rotation, not just orientation.
- Shows the editor's live viewport image as a JPEG stream, at a quality you pick
  (Low / Medium / High).
- **Record / Stop / Recentre** on screen, so you never reach for the keyboard
  while holding the camera.
- Keeps the screen awake while connected, and warns when ARKit tracking degrades
  ("moving too fast", "not enough detail to track").

**No camera image is ever captured, shown or transmitted.** ARKit needs the
camera only to solve the device's motion, which is what the
`NSCameraUsageDescription` in `app.json` says.

## Layout

```
App.js                        both screens (connect, viewfinder)
src/protocol.js               the wire format: frame codec + base64
src/link.js                   the WebSocket connection and the handshake
modules/tyrax-arkit/          local Expo module: ARKit -> JS pose events
  ios/TyraxArkitModule.swift
PROTOCOL.md                   what the two ends say to each other
```

`ios/` and `android/` are **not** checked in — `expo prebuild` generates them.

The wire format is documented in **[PROTOCOL.md](PROTOCOL.md)**, so you can write
a different client (or a different server) without reading this app's source.

## Getting it onto a phone

The app is **sideload-only** — it is a tool for one workflow, not something for
the App Store. Three routes, in rising order of effort:

### 1. Grab the CI build and sign it yourself (no Mac needed)

Every push builds an **unsigned `.ipa`** and attaches it to the workflow run:
open the [Actions tab](https://github.com/doctorspider42/tyrax-cam/actions),
pick the latest green *iOS build*, and download the `TyraXCam-unsigned-ipa`
artifact.

Then sign and install it with a **free Apple ID** using
[Sideloadly](https://sideloadly.io) (Windows/macOS) or
[AltStore](https://altstore.io). Both re-sign the `.ipa` with your own account
and push it to the device over USB.

A free account's signature lasts **7 days** — the tool refreshes it. A paid
developer account ($99/yr) makes it a year.

### 2. Build from source in Xcode (needs a Mac)

```bash
npm install
npx expo prebuild -p ios
open ios/*.xcworkspace
```

In Xcode: select the app target → *Signing & Capabilities* → tick *Automatically
manage signing* → **Team**: your Apple ID (add it under *Xcode > Settings >
Accounts*) → change the **Bundle Identifier** to something unique to you (the
`com.example.tyraxcam` placeholder in `app.json` will collide). Plug the phone
in, pick it as the destination, **Run**.

First launch needs *Settings > General > VPN & Device Management > Developer App
> Trust*. Same 7-day expiry on a free account; re-run from Xcode to renew.

Once signing is configured you can skip Xcode's UI:

```bash
npx expo run:ios --device --configuration Release
```

### 3. An ad-hoc `.ipa` via EAS (needs a paid Apple account)

`eas.json` already has an `internal` distribution profile:

```bash
npx eas-cli build -p ios --profile device
```

Register the phone's UDID when prompted; the resulting `.ipa` installs straight
from the EAS link.

### Expo Go does not work

The ARKit module is native code, so Expo Go cannot load it. The app *runs* there
and will show the stream, but the camera will not move — and it says so on
screen. Use a native build (any route above).

## Using it

1. In the editor: **Tools > Phone Camera** → *Start link*. It shows the address
   and the pairing code. On the first run Windows Firewall will ask — allow it on
   **private** networks, or the phone cannot reach the port.
2. In the app: type that address and code → **Connect**.
3. Point the phone. The editor viewport (and the phone screen) follow it.
   **Recentre** puts the camera back at the editor's own viewpoint and aims it
   where the viewport was looking — everything the phone does is relative to that
   point.
4. To record: **Tools > Cutscene Director** in the editor, select a cutscene, open
   the *Phone camera* section, choose the target camera and the keyframe density,
   then press *Record* there or on the phone.

## Troubleshooting

| Symptom | Cause |
|---|---|
| "cannot reach the editor" | Different Wi-Fi networks, or Windows Firewall is blocking the editor. Allow `tyrax-editor.exe` on private networks. |
| "wrong pairing code" | The editor regenerated it (*New code* restarts pairing), or the link was restarted. |
| "another device is already connected" | One device at a time. Use *Disconnect* in the editor's Phone Camera window. |
| Picture updates but the camera never moves | No ARKit — see the on-screen warning; you are probably in Expo Go. |
| "limited: moving too fast" | ARKit lost the solve. Slow down, and film somewhere with visible detail — a blank white wall gives it nothing to track. |
| Stream stutters | Drop to the *Low* preset, or lower the fps in the editor's Phone Camera window. |
| Nothing at all, and you want to know which end is broken | Open `http://<editor-host>:7798` in a desktop browser. The editor serves a test client there; if that works, the editor end is fine. |

## Development

```bash
npm install
npm run bundle     # what CI's fast job does: Metro-bundle for iOS
npm run prebuild   # generate ios/
npm run ios        # build and run on a connected device
```

CI (`.github/workflows/ios.yml`) runs the bundle on Linux, then does an unsigned
device archive on macOS and uploads the `.ipa`. It has no Apple credentials and
does not need any.

## License

Copyright 2026 Paweł Pająk. Licensed under the **Apache License 2.0** — see
[LICENSE](LICENSE).

This app contains no Tyra or TyraX code; it only speaks the protocol in
[PROTOCOL.md](PROTOCOL.md).
