// Runs every quality gate locally and prints one test-report summary.
// Run: npm run gates
//
// Same gates and order as CI: Stage 1 (fast checks), then Stage 2 (mutation testing),
// which only runs if Stage 1 passed. Each gate's own output is hidden unless it fails,
// so a green run is one short table and a red run shows exactly what broke.

import { spawnSync } from 'node:child_process';
import { c, SKIP_CODE, WARN_CODE } from './lib.mjs';

// Each gate: the npm script to run, a readable name, and how to pull one key number from its output.
const STAGES = [
  {
    name: 'Stage 1 · Fast',
    gates: [
      { script: 'lint', label: 'Lint' },
      { script: 'typecheck', label: 'Types' },
      {
        script: 'test',
        label: 'Tests',
        detail: (out) => out.match(/Tests\s+(\d+ (?:failed|passed)[^\n(]*)/)?.[1]?.trim(),
        // On failure, show only the failing test names and what they expected, not the whole log.
        focus: /^\s*FAIL\s|AssertionError|^Expected|^Received/,
      },
      { script: 'check:risks', label: 'Risks have tests', detail: (out) => out.match(/All (\d+) risks/)?.[1]?.concat(' risks covered') },
      { script: 'check:names', label: 'Name guard' },
      { script: 'check:data', label: 'No real payment data' },
      { script: 'check:secrets', label: 'No tokens or keys (gitleaks)' },
      { script: 'check:size', label: 'PR size', detail: (out) => out.match(/(\d+) changed lines/)?.[0] },
    ],
  },
  {
    name: 'Stage 2 · Evidence',
    gates: [
      {
        // Changed code only, as in CI: a new file's weak tests can't hide behind the rest of the repo's score.
        script: 'mutation:changed',
        label: 'Mutation score ≥ 80%',
        detail: (out) => {
          // Stryker's table row: "All files | 95.24 | ... | killed | timeout | survived | ..."
          const row = out.match(/All files\s*\|\s*([\d.]+)\s*\|\s*[\d.]+\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)/);
          if (row) return `${row[1]}% · ${row[2]} killed, ${row[4]} survived`;
          return /No source files changed/.test(out) ? 'no source code changed' : undefined;
        },
        // On failure, show only the surviving mutants: where they are and what the change was.
        focus: /^\[Survived\]|^src\/|^[-+] {3}|break threshold/,
      },
    ],
  },
];

const WIDTH = 30; // column width for gate names
const results = [];
const startAll = Date.now();

console.log(`\n${c.bold('QUALITY GATES')}  ${c.dim('· Tier 1 · same checks as CI')}\n`);

let stageFailed = false;
for (const stage of STAGES) {
  console.log(c.dim(`  ${stage.name}`));
  for (const gate of stage.gates) {
    // A later stage only runs when the earlier one passed, as in CI.
    if (stageFailed) {
      results.push({ ...gate, status: 'SKIP' });
      console.log(`  ${c.inverseAmber(' SKIP ')}  ${gate.label.padEnd(WIDTH)} ${c.dim('needs Stage 1 to pass')}`);
      continue;
    }
    const start = Date.now();
    // Run the gate quietly and keep its output; NO_COLOR keeps the captured text plain for parsing.
    const run = spawnSync('npm', ['run', '-s', gate.script], { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
    const seconds = ((Date.now() - start) / 1000).toFixed(1);
    const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
    // A gate whose tool isn't installed here exits with SKIP_CODE: shown as SKIP, never as a silent pass.
    if (run.status === SKIP_CODE) {
      results.push({ ...gate, status: 'SKIP', seconds });
      console.log(`  ${c.inverseAmber(' SKIP ')}  ${gate.label.padEnd(WIDTH)} ${c.dim(`${seconds.padStart(5)}s`)}  ${c.amber(output.trim().replace(/^–\s*/, ''))}`);
      continue;
    }
    // A warning (WARN_CODE) is shown in amber with its reason; it doesn't fail the run.
    if (run.status === WARN_CODE) {
      results.push({ ...gate, status: 'WARN', seconds });
      console.log(`  ${c.inverseAmber(' WARN ')}  ${gate.label.padEnd(WIDTH)} ${c.dim(`${seconds.padStart(5)}s`)}  ${c.amber(output.trim().split('\n')[0].replace(/^!\s*/, ''))}`);
      console.log(c.dim(output.trim().split('\n').slice(1).map((line) => `      │ ${line.replace(/^ {2}/, '').trimEnd()}`).join('\n')));
      continue;
    }
    const ok = run.status === 0;
    const detail = gate.detail?.(output) ?? '';
    results.push({ ...gate, status: ok ? 'PASS' : 'FAIL', seconds, detail });

    const badge = ok ? c.inverseGreen(' PASS ') : c.inverseRed(' FAIL ');
    console.log(`  ${badge}  ${gate.label.padEnd(WIDTH)} ${c.dim(`${seconds.padStart(5)}s`)}  ${detail}`);
    // On failure, show the gate's own output, indented, so the reason is right there.
    if (!ok) {
      const lines = output.trim().split('\n');
      const shown = gate.focus ? lines.filter((line) => gate.focus.test(line)) : lines.slice(-25);
      console.log(c.red(shown.map((line) => `      │ ${line.trim()}`).join('\n')));
      console.log(c.dim(`      │ Full output: npm run ${gate.script}`));
    }
  }
  if (results.some((r) => r.status === 'FAIL')) stageFailed = true;
  console.log('');
}

// Summary line: one glance tells you whether you can open the PR.
const total = ((Date.now() - startAll) / 1000).toFixed(1);
const passed = results.filter((r) => r.status === 'PASS').length;
const failed = results.filter((r) => r.status === 'FAIL');
const skipped = results.filter((r) => r.status === 'SKIP');
const warned = results.filter((r) => r.status === 'WARN');
if (failed.length === 0) {
  console.log(`  ${c.green('✓')} ${c.bold(`${passed} of ${results.length} gates passed`)} ${c.dim(`in ${total}s`)}  · ready for a pull request`);
  // Say plainly what didn't run, so a skipped gate never looks like a pass.
  if (warned.length > 0) console.log(c.amber(`    Warnings: ${warned.map((r) => r.label).join(', ')}`));
  if (skipped.length > 0) console.log(c.amber(`    Not run here: ${skipped.map((r) => r.label).join(', ')}`));
  // Point to the report only when mutation testing actually ran in this run.
  const mutated = results.some((r) => r.script === 'mutation:changed' && r.detail?.includes('%'));
  console.log(mutated ? c.dim('    Mutation report: reports/mutation/index.html\n') : '');
} else {
  console.log(`  ${c.red('✗')} ${c.bold(c.red(`${failed.length} failed: ${failed.map((f) => f.label).join(', ')}`))} ${c.dim(`in ${total}s`)}\n`);
  process.exitCode = 1;
}
