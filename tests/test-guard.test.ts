// The test guard (scripts/test-guard.mjs): a PR may not remove tests or assertions, or skip a test,
// unless the description names the person who approved it. Run against a throwaway repo, as CI runs it.
import { afterEach, describe, expect, it } from 'vitest';
import { scratchRepo, type ScratchRepo } from './scratch-repo';

const MAIN = {
  'tests/limit.test.ts': `
it('approves exactly at the limit', () => {
  expect(decide(5000)).toBe('approved');
});
it('rejects one cent over', () => {
  expect(decide(5000.01)).toBe('rejected');
  expect(left()).toBe(0);
});
`,
  'e2e/day.e2e.ts': `
test('a customer sends a transfer', async () => {
  await expect(answer).toHaveText('Sent');
});
`,
};
const APPROVED = 'Test removed: merged two duplicate checks into one, approved by Katarzyna';

let repo: ScratchRepo;
const guard = (prBody?: string) => repo.run('test-guard.mjs', prBody);
afterEach(() => repo.cleanUp());

describe('test guard: nothing removed', () => {
  it('passes when no test changed', () => {
    repo = scratchRepo(MAIN);
    expect(guard('')).toMatchObject({ code: 0 });
  });

  it('passes when tests and assertions are added', () => {
    repo = scratchRepo(MAIN);
    repo.change({ 'tests/new.test.ts': `it('rejects zero', () => { expect(decide(0)).toBe('rejected'); });` });
    const result = guard('');
    expect(result.code).toBe(0);
    expect(result.output).toContain('4 test cases written, 5 expect() calls, 0 skipped');
  });

  it('passes when a test moves to another file', () => {
    repo = scratchRepo(MAIN);
    repo.remove('e2e/day.e2e.ts');
    repo.change({ 'e2e/customer-day.e2e.ts': MAIN['e2e/day.e2e.ts'] });
    expect(guard('')).toMatchObject({ code: 0 });
  });
});

describe('test guard: weakened without a named approval', () => {
  it.each`
    change                         | edit
    ${'an assertion is deleted'}   | ${(text: string) => text.replace("  expect(left()).toBe(0);\n", '')}
    ${'a test is deleted'}         | ${(text: string) => text.slice(0, text.indexOf("it('rejects one cent over'"))}
    ${'a test is skipped'}         | ${(text: string) => text.replace("it('rejects", "it.skip('rejects")}
    ${'one test is focused'}       | ${(text: string) => text.replace("it('rejects", "it.only('rejects")}
    ${'a test becomes a todo'}     | ${(text: string) => text.replace("it('rejects", "it.todo('rejects")}
  `('fails when $change', ({ edit }) => {
    repo = scratchRepo(MAIN);
    repo.change({ 'tests/limit.test.ts': edit(MAIN['tests/limit.test.ts']) });
    const result = guard('No approval line here.');
    expect(result.code).toBe(1);
    expect(result.output).toContain('Test removed: <what and why>, approved by <name>');
  });

  it('fails when a whole test file is deleted', () => {
    repo = scratchRepo(MAIN);
    repo.remove('e2e/day.e2e.ts');
    expect(guard('')).toMatchObject({ code: 1 });
  });

  it('fails when a Playwright test is marked fixme', () => {
    repo = scratchRepo(MAIN);
    repo.change({ 'e2e/day.e2e.ts': MAIN['e2e/day.e2e.ts'].replace("test('a customer", "test.fixme('a customer") });
    expect(guard('')).toMatchObject({ code: 1 });
  });

  it('says what dropped, compared with main', () => {
    repo = scratchRepo(MAIN);
    repo.change({ 'tests/limit.test.ts': MAIN['tests/limit.test.ts'].replace("  expect(left()).toBe(0);\n", '') });
    expect(guard('').output).toContain('expect() calls 4 → 3');
  });

  it('fails when the line has a reason but no approver', () => {
    repo = scratchRepo(MAIN);
    repo.remove('e2e/day.e2e.ts');
    expect(guard('Test removed: the page is gone').code).toBe(1);
  });
});

describe('test guard: weakened with a named approval', () => {
  it('passes with a warning that quotes the approval', () => {
    repo = scratchRepo(MAIN);
    repo.remove('e2e/day.e2e.ts');
    const result = guard(`## What and why\n\n${APPROVED}\n`);
    expect(result.code).toBe(79);
    expect(result.output).toContain('approved by Katarzyna');
  });
});

describe('test guard: on a laptop, before there is a PR description', () => {
  it('warns instead of failing, and says what CI will need', () => {
    repo = scratchRepo(MAIN);
    repo.remove('e2e/day.e2e.ts');
    const result = guard();
    expect(result.code).toBe(79);
    expect(result.output).toContain('CI will fail unless the PR description has a line');
  });
});
