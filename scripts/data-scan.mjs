// Fails on real-looking payment data: card numbers that pass the Luhn check, and IBAN-shaped strings.
// Test data in this repo is synthetic: amounts and limits only.
import { readFileSync } from 'node:fs';
import { fail, trackedTextFiles } from './lib.mjs';

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
for (const file of trackedTextFiles().filter((f) => f !== 'package-lock.json')) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      for (const m of line.matchAll(/\b(?:\d[ -]?){13,19}\b/g)) {
        const digits = m[0].replace(/\D/g, '');
        if (digits.length >= 13 && luhn(digits) && !/^0+$/.test(digits)) hits.push(`${file}:${i + 1} card-like number`);
      }
      if (/\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/.test(line)) hits.push(`${file}:${i + 1} IBAN-like string`);
    });
}
if (hits.length > 0) fail(`Real-looking payment data found:\n  ${hits.join('\n  ')}`);
console.log('✓ No real-looking payment data in tracked files');
