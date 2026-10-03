#!/usr/bin/env node

/**
 * Generates PNG icons from the SVG source using macOS qlmanage.
 * For other platforms, use Inkscape or another SVG-to-PNG converter.
 *
 * Usage: npm run icons
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'icons');
const svgPath = path.join(iconsDir, 'icon.svg');
const sizes = [16, 32, 48, 128];

if (!fs.existsSync(svgPath)) {
  console.error('Error: icons/icon.svg not found');
  process.exit(1);
}

// Try qlmanage (macOS)
try {
  for (const size of sizes) {
    const outPng = path.join(iconsDir, `icon${size}.png`);
    execSync(
      `qlmanage -t -s ${size} -o "${iconsDir}" "${svgPath}" 2>/dev/null && mv "${svgPath}.png" "${outPng}"`,
      { stdio: 'pipe' }
    );
    console.log(`Generated: icon${size}.png`);
  }
  console.log('Done.');
  process.exit(0);
} catch (_) {
  // qlmanage not available, try rsvg-convert
}

// Try rsvg-convert (Linux / Homebrew)
try {
  execSync('which rsvg-convert', { stdio: 'pipe' });
  for (const size of sizes) {
    const outPng = path.join(iconsDir, `icon${size}.png`);
    execSync(`rsvg-convert -w ${size} -h ${size} "${svgPath}" -o "${outPng}"`, { stdio: 'pipe' });
    console.log(`Generated: icon${size}.png`);
  }
  console.log('Done.');
  process.exit(0);
} catch (_) {
  // rsvg-convert not available
}

console.error('No supported SVG converter found.');
console.error('Install one of: qlmanage (macOS built-in), rsvg-convert (brew install librsvg)');
process.exit(1);
