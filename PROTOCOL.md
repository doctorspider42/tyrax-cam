# The TyraX phone-camera protocol (v1)

What this app and the TyraX editor say to each other. Written down here so the
app is self-contained: you can reimplement either end, or write a different
client, without access to the editor's source.

The editor implements the server side (`src/phonecam.cpp` +
`wire::makeWebSocketTransport()` in `src/wire.cpp`); this repo's
[`src/protocol.js`](src/protocol.js) and [`src/link.js`](src/link.js) are the
client side, and the editor also serves a small browser client on the same port
(see [Testing without a phone](#testing-without-a-phone)).

## Transport

One **WebSocket** connection to `ws://<editor-host>:7798/`. WebSocket was chosen
because it is built into React Native and every browser, so a client needs no
native socket code.

Every message is a WebSocket **binary** frame carrying one editor *wire frame*:

```
[u32 jsonLen][u32 binLen][jsonLen bytes UTF-8 JSON][binLen bytes raw]
```

Both lengths are **little-endian**. The JSON part carries the message (its `"t"`
field is the type); the binary trailer carries bulk data — today only a JPEG
preview image. Binary never travels inside the JSON: the editor's JSON reader
collapses `\u` escapes, so bytes must stay out of it.

Caps: `jsonLen` ≤ 4 MiB, `binLen` ≤ 16 MiB. A frame declaring more is a protocol
error and the connection is dropped.

The editor accepts **one client at a time**. A second connection is denied with a
reason rather than left to fight the first one for the camera.

## Handshake

The client sends `hello` first; nothing else is honoured before it.

```json
{ "t": "hello", "proto": 1, "code": "123456",
  "name": "iPhone", "model": "ios 18.1",
  "client": "TyraX Cam 1.0.0", "sixdof": true }
```

- `proto` — must equal the editor's version (**1**) or the editor denies with a
  message naming both.
- `code` — the 6-digit pairing code the editor's *Phone Camera* window shows. The
  editor may be configured to accept any client, in which case the code is
  ignored; send it anyway.
- `sixdof` — `true` when the client reports a real world position. `false` means
  rotation only, and the editor then turns the camera in place instead of walking
  it. (A browser client, or a device without ARKit, is `false`.)

The editor replies with one of:

```json
{ "t": "welcome", "proto": 1, "editor": "TyraX", "project": "my-game" }
{ "t": "deny", "reason": "wrong pairing code" }
```

After a `deny` the editor closes the socket. Report the reason before your
`onclose` handler overwrites it with a generic "disconnected".

## Client → editor

| Type | Payload |
|---|---|
| `pose` | `ts` — seconds, **the client's own monotonic clock** (any epoch); `p` — `[x, y, z]` metres; `q` — `[x, y, z, w]` rotation; `fov` — optional vertical field of view in degrees (omit or 0 to keep the editor's own) |
| `cmd` | `cmd`: `"record"` \| `"stop"` \| `"recenter"` — asks the editor to start/stop recording, or to re-anchor the mapping. The editor decides what they mean; the client only asks. |
| `cfg` | `maxw`, `maxh` — long-edge cap of the streamed image; `fps`; `quality` — JPEG 1..100. These override the editor's own defaults, because only the device knows its screen and its Wi-Fi. |
| `bye` | — (a clean goodbye; closing the socket also works) |

Poses carry the client's timestamps on purpose: the editor rebases them, so
network jitter never distorts the recorded timing. Send them at whatever rate
suits you — this app uses 30 Hz, and the editor resamples to the keyframe
density it was asked for.

## Editor → client

| Type | Payload |
|---|---|
| `frame` | `w`, `h`, `seq` + a **JPEG image in the binary trailer** |
| `status` | `rec` (bool), `time` (seconds), `keys` (count), `seq` (sequence name), `target` (camera entity name, `""` = free shots), `dens` (keys per second), `driving` (is the pose actually moving the editor camera) — sent **only when something changes**, so do not drive a frame-rate readout off it |
| `bye` | `reason` |

## Pose space

The canonical space is **ARKit's world convention, unconverted**:

- right-handed, **Y up** (gravity aligned), positions in **metres**
- rotation is a quaternion `(x, y, z, w)` taking camera-local axes into world
  axes; the camera looks down its own **−Z** with **+Y** up
- the origin is wherever tracking started; the editor anchors against it on
  "recentre", so absolute values do not matter — only motion relative to the
  anchor

ARKit defines those local axes for a device held **landscape-right**, so a
portrait phone reports a 90° roll. That is harmless: a camera keyframe stores eye
+ look-at only, and rolling about the view axis does not move −Z. Roll is dropped
downstream, deliberately.

### Field of view

This app does **not** send `fov` by default. A phone's wide lens is about 39°
vertical — a real telephoto for a game camera — and baking that into a shot
surprises people. The *Match the phone's lens* switch turns it on.

## Testing without a phone

The editor serves a self-contained HTML client to an ordinary `GET` on the same
port, so **`http://<editor-host>:7798`** in any browser gives a working client:
the live stream, synthetic 6DoF poses (drag to look, WASD to walk, Q/E for
height) and the same Record / Stop / Recentre buttons. It is the quickest way to
check that the editor end is up before blaming the app.
