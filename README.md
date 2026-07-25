# TyraX Cam

[![iOS build](https://github.com/doctorspider42/tyrax-cam/actions/workflows/ios.yml/badge.svg)](https://github.com/doctorspider42/tyrax-cam/actions/workflows/ios.yml)

Turn an iPhone into a **camera viewfinder for the TyraX editor**. Connect over
your Wi-Fi and the phone shows a live picture of the editor's 3D viewport; move
the phone and that camera moves with it — 6DoF, so walking across the room walks
the camera across the map. Press **Record** and the move is written into the
editor's cutscene timeline as camera keyframes.

TyraX is an editor for the [Tyra](https://github.com/h4570/tyra) PlayStation 2
engine, so the end result is a hand-held camera move playing back on a PS2.

Runs on a device, confirmed. It opens **portrait** to type an address, then flips
to **landscape** the moment it connects — you hold it like a camera from there,
and its tilt is part of the shot.

## What it does

- Connects to the editor over the LAN with a 6-digit pairing code.
- Streams **ARKit world-tracking pose** at 30 Hz — position in metres plus
  rotation, not just orientation.
- Shows the editor's live viewport image as a JPEG stream, at a quality you pick
  (Low / Medium / High).
- **Picks which camera to shoot from**: the editor sends the scene's Camera
  objects, and choosing one starts the view from where that camera was *placed* —
  position, aim and tilt. **Recentre** returns to exactly that pose, and the
  recording goes into the same camera's track. One choice, because "the view from
  cam-1" and "the recording into cam-1" are the same intent.
- **Record / Stop / Recentre** on screen, so you never reach for the keyboard
  while holding the camera.
- **Move** mode for the case where no camera is placed where you want it: drag
  the viewfinder to fly the shot's start point across the map (Up/Down for
  height). It only *offsets* from the selected camera — Recentre undoes it.
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

### 1. AltStore **Classic**, with this repo as a source (recommended — no Mac needed)

> Classic, **not AltStore PAL** — the two take different source formats and this
> repo publishes the Classic one. See
> [What about AltStore PAL?](#what-about-altstore-pal) below.

Set up once on a PC, then every later version installs **from the phone**.

**On the PC (once):**

1. Install [iTunes](https://www.apple.com/itunes/download/win64) **and**
   [iCloud for Windows](https://support.apple.com/en-us/HT204283) — both from
   Apple's own site, *not* the Microsoft Store versions. AltServer needs the
   device-support libraries those ship, and the Store builds are sandboxed away
   from it.
2. Install **AltServer** from [altstore.io](https://altstore.io).
3. Plug the phone in over USB and tap **Trust** on it.
4. AltServer tray icon → **Install AltStore** → your device. It asks for your
   Apple ID; with 2FA on, generate an
   [app-specific password](https://support.apple.com/en-us/HT204397) and use that.
5. **Turn on Wi-Fi sync** — with the phone still plugged in: iTunes → the device
   icon → *Summary* → tick **Sync with this iPhone over Wi-Fi** → *Apply*, and wait
   for it to finish before unplugging.

   Installing AltStore itself works over the cable, but installing an app *from*
   AltStore does not: the phone asks AltServer to sign it, so AltServer has to
   find the device over the network. Without Wi-Fi sync that lookup fails with
   *"AltServer could not find this device"* — at the point where you tap Install,
   long after the cable step appeared to succeed. (Leaving the phone plugged in
   while you tap Install also works, and is the quickest way to tell this failure
   apart from a network one.)

**On the phone (once):**

6. **Enable Developer Mode** — *Settings → Privacy & Security →* scroll to the
   bottom *→ Developer Mode →* on. The phone asks to restart; after the reboot a
   prompt confirms it and asks for your passcode. **AltStore refuses to launch
   without this** (iOS 16+ requires it for anything signed with a development
   certificate, which every sideloaded app is).

   If the row is missing, it only appears once the device has been offered a
   developer-signed app — plug in and re-run *Install AltStore*, then look again.

   Be aware this is a real reduction in the device's security posture, not a
   cosmetic switch: it permits running code Apple did not sign. That is the price
   of sideloading by any route, AltStore or otherwise.

7. Trust the certificate — *Settings → General → VPN & Device Management →
   Developer App →* your Apple ID *→ Trust*. Without it AltStore reports an
   untrusted developer.

8. Open AltStore → **Settings** → sign in with the same Apple ID (app-specific
   password again).

9. **Browse** → **Sources** → **+** and add:

   ```
   https://raw.githubusercontent.com/doctorspider42/tyrax-cam/main/altstore.json
   ```

10. *TyraX Cam* now appears under that source — tap **Install** (AltStore signs it
   with your Apple ID as it installs; the `.ipa` here is deliberately unsigned).
11. First launch asks for **camera** (ARKit needs it to solve the motion; no image
    is recorded or sent) and **local network** access — allow both.

**From then on:** new releases show up in AltStore's *My Apps → Updates* on their
own. AltServer must be running on the PC and on the same Wi-Fi for AltStore to
refresh the signature.

Free-Apple-ID limits, which are Apple's and not this app's: **3 sideloaded apps**
at a time, and signatures expire after **7 days** (AltStore re-signs
automatically while AltServer is reachable — leave it running, or open AltStore
once a week). A paid developer account ($99/yr) raises that to a year.

Nothing in this app needs a paid account: no push notifications, no app groups,
no associated domains. ARKit and local networking both work on a free signature.

### 1b. Sideloadly (simpler for a one-off)

If you just want it on the phone once and do not care about automatic updates:
download `TyraXCam.ipa` from the
[latest release](https://github.com/doctorspider42/tyrax-cam/releases/latest),
then use [Sideloadly](https://sideloadly.io) — pick the `.ipa`, enter your Apple
ID, Start. Same 7-day expiry, but no AltStore app on the device and no source to
add. You re-run Sideloadly by hand for each update.

### 2. Build from source in Xcode (needs a Mac)

```bash
npm install
npx expo prebuild -p ios
open ios/*.xcworkspace
```

In Xcode: select the app target → *Signing & Capabilities* → tick *Automatically
manage signing* → **Team**: your Apple ID (add it under *Xcode > Settings >
Accounts*) → change the **Bundle Identifier** in `app.json` to something unique to
you if you are not the repo owner (it ships as `io.github.doctorspider42.tyraxcam`;
two people cannot register the same explicit App ID). Plug the phone in, pick it as
the destination, **Run**.

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

### What about AltStore PAL?

PAL is Apple's DMA-era alternative **marketplace** (EU, Japan, Brazil; iOS 17.4+),
and it is a much nicer experience for the person installing: no AltServer, no PC,
no Apple ID prompt, **no 3-app limit and no 7-day expiry**. It is also free for
users since an Epic Games grant covered Apple's Core Technology Fee.

It is nevertheless the wrong tool for this app, because PAL is a channel for
shipping to *other people*, and the cost lands on the publisher:

- a **paid Apple Developer Program** membership (~€99/yr);
- signing Apple's **Alternative Terms Addendum for Apps in the EU**;
- **Apple notarization of every build**, submitted through App Store Connect;
- hosting an **ADP** (Alternative Distribution Package) — a directory tree with
  unchanged file hashes — instead of a plain `.ipa`, with the source pointing at
  its `manifest.json`.

That is why the source published here is the **Classic** format: it points at an
`.ipa`, which PAL does not consume. Adding this URL to PAL will not work.

Worth revisiting only if this app is ever handed to other TyraX users — at which
point the €99/yr and the notarization step buy a genuinely frictionless install.
For putting your own tool on your own phone, Classic or Sideloadly costs nothing
and the 7-day refresh is automatic.

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

### Installing, not running

| Symptom | Cause |
|---|---|
| AltStore will not launch: "Developer Mode required" | Step 6 — *Settings → Privacy & Security → Developer Mode*, then reboot. |
| "AltServer could not find this device" when you tap Install | Wi-Fi sync is off (step 5), **or** the phone and the PC are not on the same network — a guest SSID, a separate VLAN, or a router with client/AP isolation all break the lookup. Quickest test: plug the phone in and tap Install again; if that works, it is Wi-Fi sync or the network, not signing. |
| "Untrusted developer" | Step 7 — trust the certificate in *VPN & Device Management*. |
| Install fails complaining about the bundle identifier | Someone else already registered that explicit App ID with Apple. Change `ios.bundleIdentifier` in `app.json` and rebuild. |
| It worked, then stopped a week later | The free-account signature expired. Open AltStore with AltServer running, or re-run Sideloadly. |

## Development

```bash
npm install
npm run bundle     # what CI's fast job does: Metro-bundle for iOS
npm run prebuild   # generate ios/  (macOS/Linux only - not Windows)
npm run ios        # build and run on a connected device
npm run icon       # redraw assets/icon.png
```

### Releasing

Tag it — everything else is automatic:

```bash
git tag v1.0.1 && git push --tags
```

`.github/workflows/ios.yml` then builds the unsigned `.ipa`, publishes a GitHub
Release with it as `TyraXCam.ipa`, and `altstore-source.yml` regenerates
`altstore.json` so phones with the source added see the update. The version
AltStore compares is the tag without its leading `v`, so keep it in step with
`app.json`'s `version`.

The `.ipa` download URL is the `/releases/latest/download/` permalink, so a stale
manifest can only ever advertise an old *version number* — never a dead link.

### CI

- **JS bundle** (Linux, ~1 min): `npm ci`, Metro-bundle for iOS, resolve the Expo
  config, and assert the local ARKit module is autolinked. That last one matters:
  if autolinking drops the module the app still builds and still runs, it just
  silently cannot move the camera.
- **Unsigned iOS build** (macOS, ~9 min): `expo prebuild`, then an unsigned
  device archive packaged into an `.ipa`. No Apple credentials, and none needed.

Docs-only commits are skipped (`paths-ignore`) so they do not spend a macOS
runner.

### Known gaps

- `assets/icon.png` is drawn by a script, not by a designer. Replace it with real
  artwork whenever you like — nothing depends on the generator.
- No splash screen, no app-store screenshots.
- Android is untouched: the pose source is ARKit. ARCore would be a different
  native module behind the same JS interface.

## License

Copyright 2026 Paweł Pająk. Licensed under the **Apache License 2.0** — see
[LICENSE](LICENSE).

This app contains no Tyra or TyraX code; it only speaks the protocol in
[PROTOCOL.md](PROTOCOL.md).
