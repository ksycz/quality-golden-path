// Name guard: fails if any tracked file contains a word on the deny list.
// Run: npm run check:names
//
// The deny list (.github/name-guard.sha256) stores only SHA-256 hashes of the words,
// so this public repo never spells out the words it guards against.
// To add a word: printf 'word' | shasum -a 256   and add the hash as a new line.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fail, trackedTextFiles } from './lib.mjs';

// Load the hashes: one 64-character hex string per line; comment lines are ignored.
const denied = new Set(
  readFileSync('.github/name-guard.sha256', 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[0-9a-f]{64}$/.test(line)),
);
const sha256 = (word) => createHash('sha256').update(word).digest('hex');

// Split every line into lower-case words, hash each one and compare with the deny list.
// Only the file and line number are reported, never the word itself.
const hits = [];
for (const file of trackedTextFiles()) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      for (const word of line.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
        if (denied.has(sha256(word))) hits.push(`${file}:${i + 1}`);
      }
    });
}
if (hits.length > 0) fail(`Denied name found at:\n  ${hits.join('\n  ')}`);
console.log(`✓ No denied names in tracked files`);
