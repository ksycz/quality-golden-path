// Payment data scan: fails on real-looking card numbers or IBANs in any tracked file.
// Run: npm run check:data
//
// Test data in this repo must be synthetic (amounts and limits only), and agents sometimes
// paste realistic-looking data into fixtures. This catches it before it is committed to main.

import { readFileSync } from 'node:fs';
import { fail, trackedTextFiles } from './lib.mjs';

// The Luhn checksum that every real card number passes. Random digit strings usually fail it,
// so checking it avoids flagging ordinary long numbers.
const luhn = (digits) => {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
    sum += d;
  }
  return sum % 10 === 0;
};

const hits = [];
// package-lock.json is skipped: it is full of long hashes and integrity strings.
for (const file of trackedTextFiles().filter((f) => f !== 'package-lock.json')) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      // 13 to 19 digits, optionally separated by spaces or dashes: the shape of a card number.
      for (const m of line.matchAll(/\b(?:\d[ -]?){13,19}\b/g)) {
        const digits = m[0].replace(/\D/g, '');
        if (digits.length >= 13 && luhn(digits) && !/^0+$/.test(digits)) hits.push(`${file}:${i + 1} card-like number`);
      }
      // Two letters, two check digits, then 11 to 30 letters or digits: the shape of an IBAN.
      if (/\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/.test(line)) hits.push(`${file}:${i + 1} IBAN-like string`);
    });
}
if (hits.length > 0) fail(`Real-looking payment data found:\n  ${hits.join('\n  ')}`);
console.log('✓ No real-looking payment data in tracked files');
