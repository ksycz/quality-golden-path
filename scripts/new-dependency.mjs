// New-dependency check: every package a PR adds must exist on npm and be named, with a reason, in the description.
// Run: npm run check:deps   (compares package.json, including uncommitted changes, with origin/main)
//
// Code models suggest packages that don't exist, and attackers register those names ("slopsquatting").
// A package that isn't on npm fails here at once. One that is on npm still needs a person: the PR
// description must have a line "New dependency: <name>: <why it is needed>" for each package added,
// and the reviewer decides whether it is needed. In a team setup, CODEOWNERS would send package.json
// to the team and Security, not QA; this single-account demo doesn't list it. Version changes and
// removals are not new.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { WARN_CODE, c, fail, git, pass } from './lib.mjs';

const SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
// npm's own rule for a package name: optional @scope/, then lowercase letters, digits, - . _ ~,
// never starting with a dot or dash. So a "name" like --registry=… can never reach npm as an option.
const NPM_NAME = /^(?:@[a-z0-9~][a-z0-9._~-]*\/)?[a-z0-9~][a-z0-9._~-]*$/;

const names = (json) => new Set(SECTIONS.flatMap((section) => Object.keys(JSON.parse(json)[section] ?? {})));

// Compare with the point where this branch left the base branch, so other people's merges don't count.
const base = process.env.BASE_REF ?? 'origin/main';
const mergeBase = git('merge-base', base, 'HEAD');
const before = names(git('show', `${mergeBase}:package.json`));
const added = [...names(readFileSync('package.json', 'utf8'))].filter((name) => !before.has(name));

if (added.length === 0) {
  pass(`No new dependencies compared with ${base}`);
  process.exit(0);
}

const invalid = added.filter((name) => !NPM_NAME.test(name));
if (invalid.length > 0) fail(`${invalid.join(', ')}: not a valid npm package name`);

// The PR description, in CI only. Locally there is no description yet.
const body = process.env.PR_BODY;
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const named = (name) => new RegExp(`^\\s*New dependency:\\s*${escape(name)}\\s*:\\s*\\S`, 'im').test(body ?? '');
const lines = (list) => list.map((name) => `  New dependency: ${name}: <why it is needed>`).join('\n');

const unnamed = added.filter((name) => !named(name));
if (body !== undefined && unnamed.length > 0) {
  fail(`New dependencies not named in the PR description: ${unnamed.join(', ')}.\n  A person decides whether each one is needed. Add a line per package:\n${lines(unnamed)}`);
}

// Ask npm whether each package exists. "npm view" exits with E404 for a name nobody has published.
const missing = [];
for (const name of added) {
  try {
    execFileSync('npm', ['view', name, 'name'], { stdio: 'pipe', encoding: 'utf8' });
  } catch (error) {
    if (/E404|404 Not Found/.test(String(error.stderr))) missing.push(name);
    else fail(`Couldn't ask npm about ${name}: ${String(error.stderr).trim().split('\n')[0]}`);
  }
}
if (missing.length > 0) {
  fail(missing.map((name) => `${name} does not exist on npm: likely a made-up name. Remove it, or find the real package.`).join('\n  '));
}

if (body === undefined) {
  console.log(`${c.amber('!')} New dependencies, all on npm: ${added.join(', ')}.\n  CI will fail unless the PR description has a line per package:\n${lines(added)}`);
  process.exit(WARN_CODE);
}
pass(`New dependencies, on npm and named in the description: ${added.join(', ')}`);
