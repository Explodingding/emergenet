#!/usr/bin/env node
/**
 * Usage: npm run floor-plan -- <source.svg> <building-floor-key>
 * Example: npm run floor-plan -- "C:\Users\...\frn-20-ground-raw.svg" frn-20-ground
 *
 * Runs SVGO, then applies a stored tight viewBox so the floor plan
 * fills the building container without empty margins.
 *
 * After measuring a new building in the browser (preview_eval getBBox),
 * add the result to VIEWBOXES below.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ── Calibrated viewBox values per building + floor ─────────────────────────
// Scale: 7.63 cm per SVG pixel (calibrated from UTL-01).
// To add a new entry: load the SVG in the browser preview, run:
//   const g = document.querySelector('iframe').contentDocument.querySelector('g');
//   const b = g.getBBox();
//   const m = [0.16, 0, 0, -0.16, 0, 1122.667]; // from SVG transform attribute
//   console.log(b.x*m[0], -b.y*m[3]+m[5]-b.height*m[3], b.width*m[0], b.height*m[3]*-1);
// Or for the simpler clip-path type (no matrix), just read the clip path rect.
const VIEWBOXES = {
  'utl-01-ground': '32 579 1088 180',
  'frn-10-ground': '487 538 1087 423',
};

// ── Parse args ──────────────────────────────────────────────────────────────
const [,, src, key] = process.argv;

if (!src || !key) {
  console.error('Usage: npm run floor-plan -- <source.svg> <building-floor-key>');
  console.error('Keys:  utl-01-ground, frn-10-ground, frn-20-ground, rst-01-ground, ...');
  process.exit(1);
}

if (!existsSync(src)) {
  console.error(`Source file not found: ${src}`);
  process.exit(1);
}

const dest = resolve(ROOT, 'public', 'floor-plans', `${key}.svg`);

// ── Step 1: SVGO ────────────────────────────────────────────────────────────
console.log(`\nOptimizing ${src} → ${dest}`);
execSync(`svgo "${src}" -o "${dest}"`, { stdio: 'inherit' });

const after = readFileSync(dest).length;
console.log(`Output: ${(after / 1024).toFixed(0)} KB`);

// ── Step 2: viewBox ─────────────────────────────────────────────────────────
const viewBox = VIEWBOXES[key];
if (viewBox) {
  let svg = readFileSync(dest, 'utf8');
  svg = svg.replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`);
  writeFileSync(dest, svg);
  console.log(`ViewBox applied: ${viewBox}`);
} else {
  console.warn(`\n⚠  No viewBox stored for "${key}".`);
  console.warn(`   Measure it in the browser, then add to VIEWBOXES in scripts/process-floor-plan.mjs`);
}

console.log('\nDone.');
