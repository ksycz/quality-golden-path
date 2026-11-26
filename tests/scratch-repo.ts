// A throwaway git repo for testing the gate scripts the way CI runs them: a main branch with
// some files, then uncommitted changes on top, which the scripts compare with main.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS = fileURLToPath(new URL('../scripts', import.meta.url));

export interface ScratchRepo {
  /** Writes (or overwrites) files, as a change on top of main. */
  change(files: Record<string, string>): void;
  /** Deletes a file, as a change on top of main. */
  remove(path: string): void;
  /** Runs scripts/<script> in the repo, with the PR description in PR_BODY when one is given. */
  run(script: string, prBody?: string): { code: number | null; output: string };
  /** Deletes the repo. */
  cleanUp(): void;
}

/** A repo whose main branch holds `files`. */
export function scratchRepo(files: Record<string, string>): ScratchRepo {
  const dir = mkdtempSync(join(tmpdir(), 'qgp-scratch-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
  const write = (entries: Record<string, string>) => {
    for (const [path, text] of Object.entries(entries)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), text);
    }
  };

  git('init', '-q', '-b', 'main');
  write(files);
  git('add', '.');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-q', '-m', 'main');

  return {
    change: write,
    remove: (path) => rmSync(join(dir, path)),
    run: (script, prBody) => {
      // Only what the scripts need from this machine, so CI's own variables can't leak in.
      const env: NodeJS.ProcessEnv = { PATH: process.env.PATH, HOME: process.env.HOME, BASE_REF: 'main', NO_COLOR: '1' };
      if (prBody !== undefined) env.PR_BODY = prBody;
      const result = spawnSync('node', [join(SCRIPTS, script)], { cwd: dir, env, encoding: 'utf8' });
      return { code: result.status, output: result.stdout + result.stderr };
    },
    cleanUp: () => rmSync(dir, { recursive: true, force: true }),
  };
}
