// The new-dependency check (scripts/new-dependency.mjs): every package a PR adds must exist on npm
// and be named in the description with a reason. Run against a throwaway repo, as CI runs it.
// Two tests ask the real npm registry, as CI does; they need a network connection.
import { afterEach, describe, expect, it } from 'vitest';
import { scratchRepo, type ScratchRepo } from './scratch-repo';

const pkg = (devDependencies: Record<string, string>) =>
  JSON.stringify({ name: 'demo', dependencies: { 'fast-check': '4.0.0' }, devDependencies }, null, 2);
const MAIN = { 'package.json': pkg({ vitest: '5.1.1' }) };
// A name no one would publish: what a code model invents when it guesses a package.
const MADE_UP = 'qgp-transfer-limit-helpers-that-do-not-exist';

let repo: ScratchRepo;
const check = (prBody?: string) => repo.run('new-dependency.mjs', prBody);
afterEach(() => repo.cleanUp());

describe('new-dependency check', () => {
  it('passes when no package is added', () => {
    repo = scratchRepo(MAIN);
    expect(check('')).toMatchObject({ code: 0 });
  });

  it('passes when a package is removed or its version changes', () => {
    repo = scratchRepo(MAIN);
    repo.change({ 'package.json': JSON.stringify({ name: 'demo', devDependencies: { vitest: '5.2.0' } }) });
    expect(check('')).toMatchObject({ code: 0 });
  });

  it('fails a new package the description does not name, before asking npm', () => {
    repo = scratchRepo(MAIN);
    repo.change({ 'package.json': pkg({ vitest: '5.1.1', [MADE_UP]: '1.0.0' }) });
    const result = check('## What and why\n\nAdds a helper.');
    expect(result.code).toBe(1);
    expect(result.output).toContain(`New dependency: ${MADE_UP}: <why it is needed>`);
  });

  it('fails a package that does not exist on npm, even when the description names it', () => {
    repo = scratchRepo(MAIN);
    repo.change({ 'package.json': pkg({ vitest: '5.1.1', [MADE_UP]: '1.0.0' }) });
    const result = check(`New dependency: ${MADE_UP}: formats the limit`);
    expect(result.code).toBe(1);
    expect(result.output).toContain(`${MADE_UP} does not exist on npm`);
  });

  it('passes a real package that the description names with a reason', () => {
    repo = scratchRepo(MAIN);
    repo.change({ 'package.json': pkg({ vitest: '5.1.1', 'is-number': '7.0.0' }) });
    const result = check('New dependency: is-number: checks the typed amount');
    expect(result.code).toBe(0);
    expect(result.output).toContain('is-number');
  });

  it('does not accept the name alone, without a reason', () => {
    repo = scratchRepo(MAIN);
    repo.change({ 'package.json': pkg({ vitest: '5.1.1', 'is-number': '7.0.0' }) });
    expect(check('New dependency: is-number').code).toBe(1);
  });

  it('rejects a name npm would read as an option', () => {
    repo = scratchRepo(MAIN);
    repo.change({ 'package.json': pkg({ vitest: '5.1.1', '--registry=http://evil.test': '1.0.0' }) });
    const result = check('New dependency: --registry=http://evil.test: anything');
    expect(result.code).toBe(1);
    expect(result.output).toContain('not a valid npm package name');
  });

  it('on a laptop, before there is a description, warns and says what CI will need', () => {
    repo = scratchRepo(MAIN);
    repo.change({ 'package.json': pkg({ vitest: '5.1.1', 'is-number': '7.0.0' }) });
    const result = check();
    expect(result.code).toBe(79);
    expect(result.output).toContain('CI will fail unless the PR description has a line');
  });
});
