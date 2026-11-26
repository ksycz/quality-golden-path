// The PR description check (scripts/pr-description.mjs), run the way CI runs it: the description in PR_BODY.
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const check = (body: string) => {
  const run = spawnSync('node', ['scripts/pr-description.mjs'], { env: { ...process.env, PR_BODY: body, NO_COLOR: '1' }, encoding: 'utf8' });
  return { passed: run.status === 0, output: run.stdout + run.stderr };
};

const description = (howTo = 'Open http://localhost:4310 and send 5000.00: it is sent.') => `
## What and why

Adds the transfer page.

## How to test locally

\`\`\`bash
npm ci
npm run gates
\`\`\`

${howTo}

## Checklist

- [x] Only synthetic data, no secrets
`;

describe('PR description check', () => {
  it('passes a description with every section and its own steps to test', () => {
    expect(check(description()).passed).toBe(true);
  });

  it('fails the untouched template: the default commands alone prove nothing about this change', () => {
    const result = check(description('<!-- Add the exact steps a reviewer can run to see this change work. -->'));
    expect(result.passed).toBe(false);
    expect(result.output).toContain('has only the default npm ci / npm run gates');
  });

  it.each(['What and why', 'How to test locally', 'Checklist'])('fails when "%s" is missing', (title) => {
    const result = check(description().replace(`## ${title}`, '## Something else'));
    expect(result.passed).toBe(false);
    expect(result.output).toContain(`"## ${title}" section is missing`);
  });

  it('fails a section that holds only the template comment', () => {
    const result = check(description().replace('Adds the transfer page.', '<!-- One or two sentences. -->'));
    expect(result.passed).toBe(false);
    expect(result.output).toContain('"## What and why" section is empty');
  });

  it('fails an empty description', () => {
    expect(check('').passed).toBe(false);
  });

  it('accepts Windows line endings from the GitHub web editor', () => {
    expect(check(description().replace(/\n/g, '\r\n')).passed).toBe(true);
  });
});
