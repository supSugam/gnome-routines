const fs = require('fs');
const path = require('path');

// Make sure arg is passed a number
const newVersion = Number(process.argv[2]);
if (isNaN(newVersion)) {
  console.error('Please pass a number as an argument.');
  process.exit(1);
}

const projectRoot = path.join(__dirname, '..');
const metadataPath = path.join(projectRoot, 'metadata.json');
const packagePath = path.join(projectRoot, 'package.json');

// Read metadata.json
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

console.log(`Bumping version from ${metadata.version} to ${newVersion}`);

// Update metadata.json
metadata.version = newVersion;
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n');

// Update package.json
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.version = String(newVersion);
// Copy metadata.json's description to package.json
pkg.description = metadata.description;
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

console.log('Version updated successfully.');
