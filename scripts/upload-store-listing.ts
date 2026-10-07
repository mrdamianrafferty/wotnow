/**
 * Upload store-listing images to Google Play through the Play Developer API.
 *
 *   npx tsx scripts/upload-store-listing.ts godaisy             # dry run
 *   npx tsx scripts/upload-store-listing.ts godaisy --commit    # really publish
 *
 * Replaces the phone screenshots (and, with --graphics, the feature graphic
 * and icon) for one language of one app's listing, from
 * `store-assets/<app>/`. Screenshots are `screenshot-real-<n>.png`, uploaded
 * in number order — the order `capture-store-screenshots.ts` writes them.
 *
 * Everything happens inside one Play "edit", which is a draft. Without
 * --commit the edit is validated and then thrown away, so a dry run proves the
 * credentials, the package name and every file without changing the listing.
 * With --commit the change goes out the same way a Save in Play Console does:
 * into review, unless managed publishing holds it.
 *
 * Credentials: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, either the key file's JSON
 * itself or a path to it — the same secret the Android release workflow uses.
 *
 * Options:
 *   --language <code>   listing language, default the app's default language
 *   --graphics          also replace featureGraphic and icon
 *   --commit            publish; without it nothing is changed
 */

import { google } from 'googleapis';
import { createReadStream, existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const PACKAGES: Record<string, string> = {
  godaisy: 'io.godaisy.app',
  growdaisy: 'io.growdaisy.app',
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function credentials(): Record<string, unknown> {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('Set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON to the service-account key (JSON or a path to it).');
  }
  const text = raw.trim().startsWith('{') ? raw : readFileSync(raw, 'utf8');
  return JSON.parse(text);
}

/** `screenshot-real-<n>.png`, in number order, not string order (10 after 9). */
function screenshots(dir: string): string[] {
  return readdirSync(dir)
    .map((f) => ({ f, n: /^screenshot-real-(\d+)\.png$/.exec(f)?.[1] }))
    .filter((x): x is { f: string; n: string } => x.n !== undefined)
    .sort((a, b) => Number(a.n) - Number(b.n))
    .map((x) => path.join(dir, x.f));
}

async function main() {
  const app = process.argv[2];
  const packageName = PACKAGES[app];
  if (!packageName) {
    throw new Error(`Usage: upload-store-listing.ts <${Object.keys(PACKAGES).join('|')}> [--commit]`);
  }
  const commit = process.argv.includes('--commit');
  const graphics = process.argv.includes('--graphics');
  const dir = path.join('store-assets', app);

  const shots = screenshots(dir);
  // Play takes 2 to 8 phone screenshots; refuse before opening an edit.
  if (shots.length < 2 || shots.length > 8) {
    throw new Error(`Play needs 2–8 phone screenshots; found ${shots.length} in ${dir}.`);
  }

  const auth = new google.auth.GoogleAuth({
    credentials: credentials(),
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  const play = google.androidpublisher({ version: 'v3', auth });

  const { data: edit } = await play.edits.insert({ packageName });
  const editId = edit.id!;
  const language = arg('--language')
    ?? (await play.edits.details.get({ packageName, editId })).data.defaultLanguage!;
  console.log(`${packageName} · ${language} · edit ${editId}`);

  const upload = async (imageType: string, file: string) => {
    await play.edits.images.upload({
      packageName, editId, language, imageType,
      media: { mimeType: 'image/png', body: createReadStream(file) },
    });
    console.log(`  ${imageType}  ${file}`);
  };

  try {
    await play.edits.images.deleteall({ packageName, editId, language, imageType: 'phoneScreenshots' });
    for (const file of shots) await upload('phoneScreenshots', file);

    if (graphics) {
      for (const [imageType, name] of [['featureGraphic', 'feature-graphic.png'], ['icon', 'icon-512.png']]) {
        const file = path.join(dir, name);
        if (!existsSync(file)) throw new Error(`Missing ${file}`);
        await play.edits.images.deleteall({ packageName, editId, language, imageType });
        await upload(imageType, file);
      }
    }

    await play.edits.validate({ packageName, editId });
    if (commit) {
      await play.edits.commit({ packageName, editId });
      console.log('Committed. Check Publishing overview in Play Console for review status.');
    } else {
      await play.edits.delete({ packageName, editId });
      console.log('Dry run: validated and discarded. Re-run with --commit to publish.');
    }
  } catch (err) {
    // Throw the draft away so a failed run leaves nothing half-uploaded behind.
    await play.edits.delete({ packageName, editId }).catch(() => undefined);
    throw err;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
