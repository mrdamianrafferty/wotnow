#!/usr/bin/env node
/**
 * generate-local-pages.js
 *
 * Fetches top coastal ICES rectangles from Supabase and writes a data file
 * per rectangle under `data/local/{rectangle}.json` for use by a data-driven
 * local landing page SSG. Uses a weekly build cache to avoid hitting Supabase
 * on every build.
 *
 * Usage (CI):
 *  - Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in CI environment
 *  - Run `node scripts/generate-local-pages.js`
 *
 * The script is intentionally conservative: if Supabase credentials are
 * missing it will fall back to the static `lib/findr/rectangles.js` list and
 * produce minimal JSON files suitable for a pilot.
 */

const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(process.cwd(), '.next', 'local-pages-cache.json');
const OUT_DIR = path.join(process.cwd(), 'data', 'local');
const MANIFEST = path.join(process.cwd(), 'data', 'local-manifest.json');
const CACHE_TTL_MS = Number(process.env.LOCAL_PAGES_CACHE_TTL_MS || 1000 * 60 * 60 * 24 * 7); // 7 days

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, obj) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
}

async function fetchFromSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

    // Fetch coastal rectangles ordered by priority
    const { data: rects, error } = await supabase
      .from('ices_rectangles')
      .select('rectangle_code,priority_level,is_coastal,updated_at,distance_to_shore_km')
      .eq('is_coastal', true)
      .order('priority_level', { ascending: false })
      .limit(1000);

    if (error) {
      console.warn('[generate-local-pages] Supabase rectangles fetch error', error.message || error);
      return null;
    }

    // For each rectangle try to fetch top species from `predictions` table (best-effort)
    const results = [];
    for (const r of rects) {
      const rect = r.rectangle_code;
      let topSpecies = [];
      try {
        const { data: preds, error: predErr } = await supabase
          .from('predictions')
          .select('species_id,species_code,species_common_name,confidence,bite_score')
          .eq('rectangle_code', rect)
          .order('bite_score', { ascending: false })
          .limit(5);
        if (!predErr && Array.isArray(preds)) {
          topSpecies = preds.map(p => ({ species_code: p.species_code, name: p.species_common_name || null, confidence: p.confidence || null, bite_score: p.bite_score || null }));
        }
      } catch (e) {
        // Ignore per-rectangle prediction errors - script is resilient
        console.warn('[generate-local-pages] prediction fetch failed for', rect, e?.message || e);
      }

      results.push({ rectangle_code: rect, priority_level: r.priority_level || 0, updated_at: r.updated_at || null, distance_to_shore_km: r.distance_to_shore_km || null, top_species: topSpecies });
    }

    return results;
  } catch (err) {
    console.warn('[generate-local-pages] Supabase client init failed', err?.message || err);
    return null;
  }
}

function fallbackRectangles() {
  try {
    const rectModule = require('../lib/findr/rectangles.js');
    const rectangles = Array.isArray(rectModule) ? rectModule : rectModule?.default || rectModule;
    return rectangles.slice(0, 300).map(code => ({ rectangle_code: code, priority_level: 1, updated_at: null, distance_to_shore_km: null, top_species: [] }));
  } catch (e) {
    console.warn('[generate-local-pages] fallback rectangles failed', e?.message || e);
    return [];
  }
}

async function main() {
  try {
    // Cache handling
    if (fs.existsSync(CACHE_FILE)) {
      try {
        const raw = fs.readFileSync(CACHE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        const age = Date.now() - (parsed.__fetched_at || 0);
        if (age > 0 && age < CACHE_TTL_MS && Array.isArray(parsed.rects)) {
          console.log('[generate-local-pages] Using cache (age ms):', age);
          writeOutputFiles(parsed.rects);
          return;
        }
      } catch (err) {
        console.warn('[generate-local-pages] failed to read cache — continuing', err?.message || err);
      }
    }

    let rects = await fetchFromSupabase();
    if (!rects || rects.length === 0) {
      rects = fallbackRectangles();
    }

    if (!rects || rects.length === 0) {
      console.error('[generate-local-pages] no rectangles available — aborting');
      process.exit(1);
    }

    writeOutputFiles(rects);

    // Persist cache
    try {
      writeJson(CACHE_FILE, { __fetched_at: Date.now(), rects });
    } catch (e) {
      console.warn('[generate-local-pages] failed to write cache', e?.message || e);
    }

    console.log('[generate-local-pages] done — wrote', rects.length, 'local page entries');
  } catch (err) {
    console.error('[generate-local-pages] unexpected error', err?.message || err);
    process.exit(1);
  }
}

function writeOutputFiles(rects) {
  ensureDir(OUT_DIR);
  const manifest = [];
  rects.forEach((r) => {
    const file = path.join(OUT_DIR, `${r.rectangle_code}.json`);
    const content = {
      rectangle_code: r.rectangle_code,
      priority_level: r.priority_level || 0,
      updated_at: r.updated_at || null,
      distance_to_shore_km: r.distance_to_shore_km || null,
      top_species: r.top_species || [],
      generated_at: new Date().toISOString(),
      seo: {
        title: `Fishing in ${r.rectangle_code} — Local tips & top species | Findr`,
        description: `Local fishing guide for ${r.rectangle_code}. Top species: ${(r.top_species||[]).slice(0,3).map(s=>s.name||s.species_code).join(', ')}`
      }
    };
    writeJson(file, content);
    manifest.push({ rectangle_code: r.rectangle_code, file: `data/local/${r.rectangle_code}.json`, priority_level: r.priority_level || 0, updated_at: r.updated_at || null });
  });

  writeJson(MANIFEST, { generated_at: new Date().toISOString(), count: manifest.length, rects: manifest });
}

// Small helper to write JSON with retry-friendly behavior
function writeJson(file, obj) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
}

main();
