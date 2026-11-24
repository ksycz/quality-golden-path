// Fails if any tracked file contains a word whose SHA-256 is on the deny list.
// The list stores only hashes, so this public repo never spells out the words it guards against.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fail, trackedTextFiles } from './lib.mjs';

const denied = new Set(
  readFileSync('.github/name-guard.sha256', 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[0-9a-f]{64}$/.test(line)),
);
const sha256 = (word) => createHash('sha256').update(word).digest('hex');

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
