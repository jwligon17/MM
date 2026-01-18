#!/usr/bin/env node
// Usage: node scripts/inspect-png.js <path-to-png>  // Prints file size and IHDR width/height without extra deps.

const fs = require('fs');
const path = require('path');

function fail(message) {
  console.error(message);
  process.exit(1);
}

const filePath = process.argv[2];
if (!filePath) {
  fail('Usage: node scripts/inspect-png.js <path-to-png>');
}

let buffer;
try {
  buffer = fs.readFileSync(filePath);
} catch (err) {
  fail(`Failed to read file: ${err.message}`);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (buffer.length < 24) {
  fail('Invalid PNG: file too small');
}

if (!buffer.slice(0, 8).equals(PNG_SIGNATURE)) {
  fail('Invalid PNG: bad signature');
}

const ihdrLength = buffer.readUInt32BE(8);
const chunkType = buffer.slice(12, 16).toString('ascii');

if (chunkType !== 'IHDR') {
  fail('Invalid PNG: missing IHDR chunk');
}

if (ihdrLength !== 13) {
  fail(`Invalid PNG: unexpected IHDR length (${ihdrLength})`);
}

const ihdrDataStart = 16;
const ihdrDataEnd = ihdrDataStart + ihdrLength;

if (buffer.length < ihdrDataEnd) {
  fail('Invalid PNG: truncated IHDR data');
}

const width = buffer.readUInt32BE(ihdrDataStart);
const height = buffer.readUInt32BE(ihdrDataStart + 4);
const resolvedPath = path.resolve(filePath);

console.log(`File: ${resolvedPath}`);
console.log(`Bytes: ${buffer.length}`);
console.log(`Width: ${width}`);
console.log(`Height: ${height}`);
