const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const metadataPath = path.join(projectRoot, 'metadata.json');
const packagePath = path.join(projectRoot, 'package.json');

const args = process.argv.slice(2);
const type = args[0]; // 'major', 'minor', 'patch', or specific number

if (!type) {
  console.error(
    'Usage: node scripts/bump-version.js <major|minor|patch|number>'
  );
  process.exit(1);
}

function updateVersion(currentVersion, bumpType) {
  if (!isNaN(parseInt(bumpType))) {
    return parseInt(bumpType);
  }

  // GNOME extensions use a simple integer versioning usually, but let's handle what we have.
  // metadata.json has "version": 2 (integer).
  // package.json has "version": "2" (string).

  // If we are strictly following GNOME extension versioning (integer increment):
  const v = parseInt(currentVersion);
  return v + 1;
}

// Read metadata.json
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
const oldVersion = metadata.version;
const newVersion = updateVersion(oldVersion, type);

console.log(`Bumping version from ${oldVersion} to ${newVersion}`);

// Update metadata.json
metadata.version = newVersion;
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n');

// Update package.json
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.version = String(newVersion);
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

console.log('Version updated successfully.');
