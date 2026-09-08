/**
 * A directory big enough to break the deploy is either excluded on purpose or
 * uploaded on purpose. Never neither.
 *
 * `.vercelignore` REPLACES `.gitignore` for the CLI rather than adding to it:
 * once this file exists, git's ignore rules stop applying to the upload. So a
 * directory whose build output git has always ignored — 108 MB of Gradle
 * artefacts under `android-godaisy/app`, invisible in `git status`, only 57
 * files of that tree actually tracked — is uploaded in full unless
 * `.vercelignore` says otherwise.
 *
 * `android-godaisy` and `android-growdaisy` were added to the repo after the
 * exclusion list was written, and never mirrored into it. Their iOS
 * counterparts were there from the start, which is why the gap looked like
 * completeness. `npm run deploy` then failed with:
 *
 *     Total bundle size (294.48 MB) exceeds the maximum function size (225 MB)
 *
 * The push-to-main deploy was unaffected — it builds from the repository, which
 * never contained the artefacts — so only the CLI path broke, and it broke
 * silently until somebody used it.
 *
 * ─── Why size, and not every directory ───────────────────────────────────
 *
 * The first version of this test asked the question of all 30-odd top-level
 * directories and failed on twelve, every one of them under 160 KB: `flows`
 * (4 KB), `files` (8 KB), `inputs` (40 KB). Accounting for those is tidying,
 * not deploy safety, and a test that fails on 4 KB teaches people to add
 * entries without reading them. The threshold is what makes the failure mean
 * something.
 *
 * The check reads sizes off disk, so a machine without the native projects
 * checked out simply has fewer directories to assert about. That is the right
 * behaviour: it cannot produce a false pass, because a directory that is not
 * there cannot be uploaded.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';

const root = process.cwd();

/** Big enough that adding one more would matter to a 225 MB budget. */
const THRESHOLD_MB = 5;

const ignore = readFileSync(join(root, '.vercelignore'), 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

/** Heavy directories that MUST reach the build, each for a stated reason. */
const UPLOADED: Record<string, string> = {
  pages: 'the routes themselves',
  public: 'static assets the app serves',
  node_modules: 'installed by Vercel, never uploaded from here',
};

const isIgnored = (dir: string) =>
  ignore.some((rule) => {
    const bare = rule.replace(/^\/+/, '').replace(/\/+$/, '');
    return bare === dir || bare === `${dir}/*`;
  });

function megabytes(dir: string): number {
  try {
    const out = execFileSync('du', ['-sk', dir], { cwd: root, encoding: 'utf8' });
    return Number(out.split(/\s+/)[0]) / 1024;
  } catch {
    return 0;
  }
}

describe('.vercelignore accounts for every heavy directory', () => {
  const heavy = readdirSync(root)
    .filter((n) => !n.startsWith('.'))
    .filter((n) => statSync(join(root, n)).isDirectory())
    .map((n) => [n, megabytes(n)] as const)
    .filter(([, mb]) => mb >= THRESHOLD_MB);

  it('finds something to check', () => {
    // `public` alone clears the threshold in any checkout of this repo.
    expect(heavy.length).toBeGreaterThan(0);
  });

  it.each(heavy)('%s (%i MB) is ignored or deliberately uploaded', (dir) => {
    const accounted = isIgnored(dir) || dir in UPLOADED;
    // The message is the useful half: it names the two ways to resolve it.
    expect(accounted ? '' : `${dir}: add it to .vercelignore, or to UPLOADED with a reason`)
      .toBe('');
  });

  /**
   * Named explicitly as well as caught by size, because these are the ones a
   * `npx cap add` will recreate on a fresh machine, where the size check has
   * nothing to look at until the native build has been run once.
   */
  it.each(['android', 'android-godaisy', 'android-growdaisy',
           'ios', 'ios-godaisy', 'ios-growdaisy', 'ios-findr'])(
    'the native project %s stays out of the upload',
    (dir) => {
      expect(isIgnored(dir)).toBe(true);
    },
  );
});
