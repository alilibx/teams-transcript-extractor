#!/usr/bin/env node

/**
 * Packages the extension into a .zip file for Chrome Web Store / Edge Add-ons submission.
 *
 * Usage: npm run package
 * Output: dist/teams-transcript-extractor-<version>.zip
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const version = manifest.version;
const outDir = path.join(root, 'dist');
const zipName = `teams-transcript-extractor-${version}.zip`;
const zipPath = path.join(outDir, zipName);

// Files and directories to include in the package
const include = [
  'manifest.json',
  'content.js',
  'popup.html',
  'popup.js',
  'icons/',
  'LICENSE',
  'PRIVACY.md',
];

// Ensure dist directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Remove old zip if it exists
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// Build the zip
const files = include.join(' ');
execSync(`cd "${root}" && zip -r "${zipPath}" ${files}`, { stdio: 'inherit' });

const stats = fs.statSync(zipPath);
const sizeKB = (stats.size / 1024).toFixed(1);

console.log(`\nPackaged: ${zipName} (${sizeKB} KB)`);
console.log(`Location: ${zipPath}`);
