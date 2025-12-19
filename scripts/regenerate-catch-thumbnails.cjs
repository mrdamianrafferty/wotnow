#!/usr/bin/env node
/*
 Regenerate thumbnails for objects in a Supabase storage bucket. CommonJS version (.cjs)

 Usage:
  SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=key node scripts/regenerate-catch-thumbnails.cjs [bucket] --dry-run --prefix=...

 Note: This script requires a Supabase Service Role key (keep it secret).
*/

const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const argv = require('minimist')(process.argv.slice(2));

// CLI args: [bucket] or flags: --dry-run --prefix=some/path
const BUCKET = argv._[0] || 'catch-photos';
const DRY_RUN = Boolean(argv['dry-run'] || argv['dryrun'] || process.env.DRY_RUN === '1');
const PREFIX = argv['prefix'] || argv['p'] || process.env.TARGET_PREFIX || '';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

async function listAllObjects(prefix = '') {
  const all = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: PAGE, offset });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const item of data) {
      const name = item.name || item.path;
      if (!name) continue;
      if (item.metadata === null && name.endsWith('/')) {
        const children = await listAllObjects(name);
        all.push(...children);
      } else {
        all.push(name);
      }
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

function isImagePath(p) {
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(p);
}

function thumbPathFor(path) {
  return path.replace(/\.(jpe?g|png|webp|heic|heif)$/i, '_thumb.jpg');
}

async function processObject(path) {
  try {
    if (path.includes('_thumb')) return { skipped: true, reason: 'already thumbnail' };
    if (!isImagePath(path)) return { skipped: true, reason: 'not image' };

    const thumb = thumbPathFor(path);
    const { data: thumbList } = await supabase.storage.from(BUCKET).list(thumb, { limit: 1 });
    if (thumbList && thumbList.length > 0) {
      return { skipped: true, reason: 'thumbnail exists' };
    }

    // Download the object using the Supabase client (service role key)
    const { data: downloadData, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
    if (downloadError || !downloadData) {
      console.error('[thumbnail] download error for', path, downloadError);
      // Fallback: try creating a short-lived signed URL and fetch that
      try {
        const { data: signed, error: signedErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
        if (signedErr || !signed || !signed.signedURL) {
          return { skipped: false, error: `download failed: ${downloadError ? JSON.stringify(downloadError) : 'no data'}; signedUrlErr: ${signedErr ? JSON.stringify(signedErr) : 'none'}` };
        }
        const resp = await fetch(signed.signedURL);
        if (!resp.ok) return { skipped: false, error: `signed download failed: ${resp.status}` };
        const ab = await resp.arrayBuffer();
        const buffer = Buffer.from(ab);

        const thumbBuffer = await sharp(buffer)
          .rotate()
          .resize(320, 320, { fit: 'cover', position: 'centre' })
          .jpeg({ quality: 80, mozjpeg: true })
          .toBuffer();

        if (DRY_RUN) return { skipped: false, uploaded: thumb, dryRun: true };

        const { error: uploadError2 } = await supabase.storage.from(BUCKET).upload(thumb, thumbBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });
        if (uploadError2) return { skipped: false, error: `upload failed: ${uploadError2.message}` };
        return { skipped: false, uploaded: thumb };
      } catch (fallbackErr) {
        return { skipped: false, error: `download failed and signedURL fallback errored: ${String(fallbackErr)}` };
      }
    }

    // Convert downloaded data to Buffer (supports Blob with arrayBuffer or Node streams)
    let buffer;
    try {
      if (Buffer.isBuffer(downloadData)) {
        buffer = downloadData;
      } else if (typeof downloadData.arrayBuffer === 'function') {
        const ab = await downloadData.arrayBuffer();
        buffer = Buffer.from(ab);
      } else if (downloadData.stream) {
        const reader = downloadData.stream();
        const chunks = [];
        for await (const chunk of reader) chunks.push(Buffer.from(chunk));
        buffer = Buffer.concat(chunks);
      } else if (downloadData.body && typeof downloadData.body.getReader === 'function') {
        // ReadableStream (web)
        const reader = downloadData.body.getReader();
        const chunks = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(Buffer.from(value));
        }
        buffer = Buffer.concat(chunks);
      } else {
        return { skipped: false, error: 'unsupported download data type' };
      }
    } catch (convErr) {
      return { skipped: false, error: `failed to convert download data: ${String(convErr)}` };
    }

    const thumbBuffer = await sharp(buffer)
      .rotate()
      .resize(320, 320, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    if (DRY_RUN) {
      return { skipped: false, uploaded: thumb, dryRun: true };
    }

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(thumb, thumbBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

    if (uploadError) {
      if (uploadError.message && uploadError.message.includes('already exists')) {
        return { skipped: true, reason: 'thumbnail exists (upload conflict)' };
      }
      return { skipped: false, error: `upload failed: ${uploadError.message}` };
    }

    return { skipped: false, uploaded: thumb };
  } catch (err) {
    return { skipped: false, error: String(err) };
  }
}

async function main() {
  console.log('Listing objects in bucket', BUCKET, 'prefix=', PREFIX || '(none)');
  console.log('Dry run mode:', DRY_RUN ? 'yes' : 'no');
  const objects = await listAllObjects(PREFIX);
  console.log('Found', objects.length, 'objects (including folders entries)');

  const candidateFiles = objects.filter(p => isImagePath(p) && !p.includes('_thumb'));
  console.log('Image files to consider:', candidateFiles.length);

  let processed = 0;
  for (const path of candidateFiles) {
    // Ensure we use the full storage path when a PREFIX was supplied.
    const fullPath = PREFIX && !path.startsWith(PREFIX) ? `${PREFIX}${path}` : path;
    process.stdout.write(`Processing ${fullPath} ... `);
    const result = await processObject(fullPath);
    if (result.skipped) console.log(`skipped (${result.reason})`);
    else if (result.uploaded && result.dryRun) console.log(`would upload ${result.uploaded} (dry-run)`);
    else if (result.uploaded) console.log(`uploaded ${result.uploaded}`);
    else if (result.error) console.log(`error: ${result.error}`);
    processed++;
  }

  console.log('Done. Processed', processed, 'files.');
}

main().catch(err => {
  console.error('Fatal error', err);
  process.exit(1);
});
