// PR titles follow Conventional Commits, e.g. "feat: …", "fix(limits): …".
import { fail } from './lib.mjs';

const TYPES = ['feat', 'fix', 'docs', 'test', 'refactor', 'ci', 'chore', 'build', 'perf'];
const title = process.env.PR_TITLE ?? process.argv[2] ?? '';
const pattern = new RegExp(`^(${TYPES.join('|')})(\\([a-z0-9-]+\\))?!?: \\S.*$`);

if (!pattern.test(title)) fail(`PR title "${title}" must start with one of: ${TYPES.map((t) => `${t}:`).join(' ')}`);
console.log(`✓ PR title follows Conventional Commits`);
