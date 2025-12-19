#!/usr/bin/env node
/*
 Regenerate thumbnails for objects in a Supabase storage bucket.

 Usage:
  SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=key node scripts/regenerate-catch-thumbnails.js [bucket]

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
      // item.name is the filename relative to the prefix
      // Supabase returns both files and folders; folders have metadata === null and name ending with '/'
      const name = item.name || item.path;
      if (!name) continue;
      // If this is a folder entry, recurse into it
      if (item.metadata === null && name.endsWith('/')) {
        const childPrefix = name;
        const children = await listAllObjects(childPrefix);
        all.push(...children);
      } else {
        // file
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

    // Check if thumbnail already exists
    const thumb = thumbPathFor(path);
    const { data: thumbList } = await supabase.storage.from(BUCKET).list(thumb, { limit: 1 });
    if (thumbList && thumbList.length > 0) {
      return { skipped: true, reason: 'thumbnail exists' };
    }

    // Get public URL and fetch the file
    const { data: publicData } = await supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = publicData?.publicUrl;
    if (!publicUrl) return { skipped: true, reason: 'no public url' };

    const resp = await fetch(publicUrl);
    if (!resp.ok) return { skipped: false, error: `download failed: ${resp.status}` };
    const arrayBuf = await resp.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    // Generate thumbnail
    const thumbBuffer = await sharp(buffer)
      .rotate()
      .resize(320, 320, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    if (DRY_RUN) {
      return { skipped: false, uploaded: thumb, dryRun: true };
    }

    // Upload thumbnail; don't overwrite by default (upsert=false)
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(thumb, thumbBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

    if (uploadError) {
      // If already exists, skip; otherwise return error
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
    process.stdout.write(`Processing ${path} ... `);
    const result = await processObject(path);
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
