// Regenerates altstore.json - the AltStore **Classic** "source" manifest.
//
// Classic, not PAL: a PAL source points at an Alternative Distribution Package's
// manifest.json, which requires a paid Apple Developer account, Apple
// notarization of every build and the EU Alternative Terms Addendum. This one
// points at a plain .ipa, which PAL does not consume - see the README.
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
  // REQUIRED by AltStore, and the omission that made the first manifest
  // undecodable ("The data couldn't be read because it isn't in the correct
  // format"). Must be the built app's CFBundleVersion, which Expo takes from
  // ios.buildNumber - read it rather than hardcode, or the two drift.
  buildVersion: appJson.expo.ios.buildNumber ?? '1',
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
      screenshots: [],
      // Legacy fields (older AltStore reads these directly).
      version,
      versionDate: date,
      versionDescription: versionEntry.localizedDescription,
      downloadURL,
      size,
      minOSVersion: '15.1',
      // Current schema.
      versions: [versionEntry],
      appPermissions: {
        entitlements: [],
        privacy: {
          NSCameraUsageDescription:
            'ARKit needs the camera to work out how the phone moves. No image is recorded, shown or transmitted.',
          NSLocalNetworkUsageDescription:
            'To reach the TyraX editor running on your computer.',
        },
      },
    },
  ],
  news: [],
};

// Check the required fields before writing. AltStore decodes a source with a
// strict Swift decoder and reports any shortfall as the singularly unhelpful
// "The data couldn't be read because it isn't in the correct format" - on the
// phone, after an install attempt. A missing buildVersion shipped exactly that,
// so the schema is asserted here instead of discovered there.
// Field lists per https://faq.altstore.io/developers/make-a-source
const problems = [];
const req = (obj, keys, where) => {
  for (const k of keys) {
    const v = obj[k];
    if (v === undefined || v === null || v === '') problems.push(`${where}: missing ${k}`);
  }
};
req(source, ['apps'], 'source');
for (const [i, app] of source.apps.entries()) {
  req(app, ['name', 'bundleIdentifier', 'developerName', 'localizedDescription',
            'iconURL', 'versions'], `apps[${i}]`);
  if (!Array.isArray(app.versions) || app.versions.length === 0) {
    problems.push(`apps[${i}]: versions must be a non-empty array`);
  } else {
    for (const [k, v] of app.versions.entries()) {
      req(v, ['version', 'buildVersion', 'date', 'downloadURL', 'size'],
          `apps[${i}].versions[${k}]`);
      if (typeof v.size !== 'number') problems.push(`apps[${i}].versions[${k}]: size must be a number`);
      // ISO 8601: date-only or a full timestamp, both accepted by AltStore.
      if (!/^\d{4}-\d{1,2}-\d{1,2}([T ].*)?$/.test(String(v.date)))
        problems.push(`apps[${i}].versions[${k}]: date "${v.date}" is not ISO 8601`);
    }
  }
  if (app.appPermissions !== undefined) {
    const ap = app.appPermissions;
    if (!Array.isArray(ap.entitlements)) problems.push(`apps[${i}].appPermissions.entitlements must be an array`);
    if (typeof ap.privacy !== 'object' || Array.isArray(ap.privacy))
      problems.push(`apps[${i}].appPermissions.privacy must be an object of UsageDescription keys`);
  }
}
if (problems.length) {
  console.error('altstore.json would be invalid:\n  ' + problems.join('\n  '));
  process.exit(1);
}

const out = new URL('../altstore.json', import.meta.url);
writeFileSync(out, JSON.stringify(source, null, 2) + '\n');
console.log(`altstore.json: ${bundleId} ${version} build ${versionEntry.buildVersion} ` +
            `(${size} bytes) -> ${downloadURL}`);
