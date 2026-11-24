// Mutation testing on changed source files only (the Tier 1 gate). The full run happens nightly.
import { execFileSync } from 'node:child_process';
import { changedFiles } from './lib.mjs';

const changed = changedFiles().filter((file) => /^src\/.*\.ts$/.test(file));
if (changed.length === 0) {
  console.log('✓ No source files changed: mutation gate not needed');
  process.exit(0);
}
console.log(`Mutating changed files: ${changed.join(', ')}`);
execFileSync('npx', ['stryker', 'run', '--mutate', changed.join(',')], { stdio: 'inherit' });
