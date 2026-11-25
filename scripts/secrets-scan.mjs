// Secrets scan: runs gitleaks over this repo's commits, the same tool CI uses.
// Run: npm run check:secrets
//
// CI already scans every pull request, but by then the secret is on GitHub. Running it locally
// catches a token or key before it is pushed. gitleaks is a separate tool (brew install gitleaks);
// if it is missing this exits with SKIP_CODE so the gate report shows SKIP rather than a silent pass.

import { spawnSync } from 'node:child_process';
import { SKIP_CODE, c, fail, pass } from './lib.mjs';

// Is gitleaks installed? `gitleaks version` fails (or is not found) when it isn't.
const installed = spawnSync('gitleaks', ['version'], { encoding: 'utf8' });
if (installed.error || installed.status !== 0) {
  console.log(`${c.amber('–')} gitleaks not installed · brew install gitleaks · CI still scans`);
  process.exit(SKIP_CODE);
}

// Scan the git history; --redact keeps any secret it finds out of the output.
const scan = spawnSync('gitleaks', ['git', '.', '--redact', '--no-banner'], { encoding: 'utf8' });
if (scan.status !== 0) fail(`gitleaks found possible secrets:\n${scan.stdout}${scan.stderr}`);
pass('No tokens, keys or passwords found in commits');
