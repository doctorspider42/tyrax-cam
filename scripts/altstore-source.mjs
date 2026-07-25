// Regenerates altstore.json - the AltStore "source" manifest.
//
// Adding this source's URL in AltStore once makes the app show up in its Browse
// tab, so every later release installs and updates FROM THE PHONE. Without it,
// each new build means plugging into the PC again.
//
// Usage: node scripts/altstore-source.mjs <version> <sizeInBytes> [isoDate]
//
// The downloadURL deliberately uses /releases/latest/download/, a permalink -
// so a stale manifest can never point at a missing file, only at an older
// version number.
import { readFileSync, writeFileSync } from 'node:fs';

const [version, sizeArg, dateArg] = process.argv.slice(2);
if (!version || !sizeArg) {
  console.error('usage: node scripts/altstore-source.mjs <version> <sizeInBytes> [isoDate]');
  process.exit(1);
}

const size = Number(sizeArg);
if (!Number.isFinite(size) || size <= 0) {
  console.error(`bad size: ${sizeArg}`);
  process.exit(1);
}

const REPO = 'doctorspider42/tyrax-cam';
const appJson = JSON.parse(readFileSync(new URL('../app.json', import.meta.url)));
const bundleId = appJson.expo.ios.bundleIdentifier;
const date = (dateArg || new Date().toISOString()).slice(0, 10);
const downloadURL = `https://github.com/${REPO}/releases/latest/download/TyraXCam.ipa`;

const description = [
  'Turn your iPhone into a live camera viewfinder for the TyraX PlayStation 2 editor.',
  '',
  'Connect over Wi-Fi and the phone shows a live picture of the editor viewport;',
  'move the phone and that camera moves with it (6DoF ARKit tracking, so walking',
  'across the room walks the camera across the map). Press Record and the move is',
  'written into the editor cutscene timeline as camera keyframes.',
  '',
  'Needs the TyraX editor running on a PC on the same network.',
].join('\n');

// AltStore read the version fields off the app object in its original schema and
// off a `versions` array in the later one. Emit both: one manifest then works in
// old and new installs alike.
const versionEntry = {
  version,
  date,
  downloadURL,
  size,
  localizedDescription: `Release ${version}. See the GitHub releases page for details.`,
  minOSVersion: '15.1',
};

const source = {
  name: 'TyraX Cam',
  identifier: `${bundleId}.source`,
  subtitle: 'Phone camera for the TyraX PS2 editor',
  description: 'Releases of TyraX Cam, the phone viewfinder for the TyraX editor.',
  website: `https://github.com/${REPO}`,
  apps: [
    {
      name: 'TyraX Cam',
      bundleIdentifier: bundleId,
      developerName: 'doctorspider42',
      subtitle: 'Live viewfinder + 6DoF camera control',
      localizedDescription: description,
      iconURL: `https://raw.githubusercontent.com/${REPO}/main/assets/icon.png`,
      tintColor: '3B5C94',
      category: 'developer',
      screenshotURLs: [],
      // Legacy fields (older AltStore reads these directly).
      version,
      versionDate: date,
      versionDescription: versionEntry.localizedDescription,
      downloadURL,
      size,
      minOSVersion: '15.1',
      // Current schema.
      versions: [versionEntry],
      permissions: [
        {
          type: 'camera',
          usageDescription:
            'ARKit needs the camera to work out how the phone moves. No image is recorded, shown or transmitted.',
        },
        {
          type: 'localnetwork',
          usageDescription: 'To reach the TyraX editor running on your computer.',
        },
      ],
    },
  ],
  news: [],
};

const out = new URL('../altstore.json', import.meta.url);
writeFileSync(out, JSON.stringify(source, null, 2) + '\n');
console.log(`altstore.json: ${bundleId} ${version} (${size} bytes) -> ${downloadURL}`);
