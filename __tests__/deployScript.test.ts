/**
 * `deploy.sh` has to be safe to run with nothing attached to its stdin.
 *
 * Step 4 asked "Clear cache? (y/N)". A question asked of a closed stdin is
 * answered instantly with EOF, so an unattended run sailed past it having
 * decided nothing — and under `set -e`, which this script sets, a `read` that
 * hits EOF returns non-zero and takes the whole script down. That failure
 * lands AFTER `vercel --prod` has succeeded, so the deploy reports failure for
 * a release that actually shipped. Both halves are wrong in the same place.
 *
 * The fix resolves the question BEFORE anything is deployed: `--clear-cache` /
 * `--no-clear-cache` settle it outright, and with no terminal the default is
 * "no". A human at a terminal still gets the prompt, unchanged.
 *
 * ─── And the part that is not about the prompt ───────────────────────────
 *
 * Making the script runnable unattended also makes `git add -A` runnable
 * unattended, which is how a stray file gets committed and pushed by something
 * nobody was watching. So a dirty tree with no terminal now REFUSES, and the
 * test that matters is that it refuses before the push rather than after it.
 *
 * ─── How this is tested ──────────────────────────────────────────────────
 *
 * `git`, `npx` and `supabase` are replaced with stubs on PATH and the script is
 * run with stdin closed, so nothing is committed, pushed or deployed. The
 * stubs echo what they were asked to do, which is what the assertions read —
 * "did it push?" is a question about the transcript, not about a real remote.
 */

import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, copyFileSync, chmodSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const GIT_STUB = `#!/bin/bash
case "$1 $2" in
  "status --porcelain"|"status --short")
    [[ "$DIRTY" == "yes" ]] && echo " M somefile.ts"; exit 0 ;;
esac
case "$1" in
  add|commit|push) echo "[git $*]"; exit 0 ;;
  branch) echo main; exit 0 ;;
esac
exit 0
`;
const NOOP_STUB = `#!/bin/bash\necho "[$(basename "$0") $*]"; exit 0\n`;

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'deploy-sh-'));
  mkdirSync(join(dir, 'bin'));
  copyFileSync(join(process.cwd(), 'deploy.sh'), join(dir, 'deploy.sh'));
  chmodSync(join(dir, 'deploy.sh'), 0o755);
  for (const [name, body] of [['git', GIT_STUB], ['npx', NOOP_STUB], ['supabase', NOOP_STUB]]) {
    const p = join(dir, 'bin', name);
    writeFileSync(p, body);
    chmodSync(p, 0o755);
  }
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** Run the script with no terminal, and report what it said and how it ended. */
function run(dirty: 'yes' | 'no', args: string[] = []) {
  try {
    const out = execFileSync('bash', ['./deploy.sh', ...args], {
      cwd: dir,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      env: { ...process.env, PATH: `${join(dir, 'bin')}:${process.env.PATH}`, DIRTY: dirty },
    });
    return { code: 0, out };
  } catch (e) {
    const err = e as { status: number; stdout: string; stderr: string };
    return { code: err.status, out: (err.stdout ?? '') + (err.stderr ?? '') };
  }
}

describe('with no terminal', () => {
  it('finishes instead of hanging or failing on the prompt', () => {
    const { code, out } = run('no');
    expect(code).toBe(0);
    expect(out).toMatch(/Deployment Complete/);
  });

  it('does not clear the cache without being asked to', () => {
    const { out } = run('no');
    expect(out).toMatch(/no — from the default with no terminal to ask at/);
    expect(out).not.toMatch(/Clearing prediction cache/);
  });

  it('honours --clear-cache without asking', () => {
    const { out } = run('no', ['--clear-cache']);
    expect(out).toMatch(/yes — from the command line/);
    expect(out).toMatch(/Clearing prediction cache/);
  });

  it('honours --no-clear-cache', () => {
    const { out } = run('no', ['--no-clear-cache']);
    expect(out).not.toMatch(/Clearing prediction cache/);
  });
});

describe('a dirty tree with no terminal', () => {
  it('refuses, and says how to proceed', () => {
    const { code, out } = run('yes');
    expect(code).toBe(1);
    expect(out).toMatch(/no terminal to confirm/);
    expect(out).toMatch(/--allow-dirty/);
  });

  it('refuses BEFORE pushing, not after', () => {
    // The whole point. A guard that fires after `git push` has not guarded
    // anything — the commit is already on the remote.
    const { out } = run('yes');
    expect(out).not.toMatch(/\[git push/);
    expect(out).not.toMatch(/\[git commit/);
  });

  it('proceeds with --allow-dirty', () => {
    const { code, out } = run('yes', ['--allow-dirty']);
    expect(code).toBe(0);
    expect(out).toMatch(/\[git commit/);
    expect(out).toMatch(/\[git push/);
  });
});

describe('the commit message is still the first argument', () => {
  it('takes a bare string', () => {
    const { out } = run('yes', ['a message of my own', '--allow-dirty']);
    expect(out).toMatch(/\[git commit -m a message of my own\]/);
  });

  it('rejects a second bare argument rather than guessing', () => {
    const { code, out } = run('no', ['one', 'two']);
    expect(code).toBe(2);
    expect(out).toMatch(/Unknown argument: two/);
  });
});
