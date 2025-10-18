// scripts/validate_inat_ids.mjs
// Node 18+ (global fetch). CSV must have a header row with at least: scientific_name[, inat_taxon_id]
import fs from 'fs';
import path from 'path';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseCSV(text) {
  const [headerLine, ...rows] = text.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return rows.map(line => {
    // simple CSV split (assumes no embedded commas in the two fields we care about)
    const cols = line.split(',').map(x => x.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => (obj[h] = cols[i] ?? ''));
    return obj;
  });
}

async function fetchTaxonById(id) {
  const res = await fetch(`https://api.inaturalist.org/v1/taxa/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.results?.[0] ?? null;
}

async function searchTaxonByName(name) {
  const u = new URL('https://api.inaturalist.org/v1/taxa');
  u.searchParams.set('q', name);
  u.searchParams.set('rank', 'species');
  u.searchParams.set('per_page', '5');
  const res = await fetch(u.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return data.results ?? [];
}

function isExactSpeciesMatch(hit, canonical) {
  return (hit?.rank === 'species') && (hit?.name?.toLowerCase() === canonical.toLowerCase());
}

function slugifyName(name) {
  return (name || '').trim().replace(/\s+/g, '-');
}

(async () => {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: node scripts/validate_inat_ids.mjs path/to/species.csv');
    process.exit(1);
  }
  const source = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(source);

  const out = [];
  const sqlLines = [
    "-- Confident updates: set verified true",
    "ALTER TABLE public.species ADD COLUMN IF NOT EXISTS inat_taxon_id integer;",
    "ALTER TABLE public.species ADD COLUMN IF NOT EXISTS inat_taxon_verified boolean DEFAULT false;",
  ];

  for (const row of rows) {
    const name = row.scientific_name?.trim();
    if (!name) continue;

    const existingId = row.inat_taxon_id ? Number(row.inat_taxon_id) : null;

    let status = 'unchanged';
    let proposedId = existingId;
    let note = '';

    if (existingId) {
      const hit = await fetchTaxonById(existingId);
      if (!hit) {
        status = 'id_not_found';
        note = 'existing ID 404';
      } else if (hit.name?.toLowerCase() !== name.toLowerCase()) {
        status = 'id_mismatch';
        note = `belongs to ${hit.name}`;
      } else {
        status = 'ok';
      }
      await sleep(250);
    }

    if (!existingId || status === 'id_not_found' || status === 'id_mismatch') {
      const hits = await searchTaxonByName(name);
      const exact = hits.find(h => isExactSpeciesMatch(h, name));
      if (exact) {
        proposedId = exact.id;
        status = 'resolved_exact';
        note = `matched ${exact.name}`;
      } else if (hits[0]) {
        proposedId = hits[0].id;
        status = 'resolved_best_guess';
        note = `closest ${hits[0].name}`;
      } else {
        proposedId = null;
        status = 'unresolved';
        note = 'no candidates';
      }
      await sleep(250);
    }

    out.push({ scientific_name: name, proposed_id: proposedId ?? '', status, note });

    // Only emit SQL for confident matches (exact), set verified=true
    if (proposedId && (status === 'ok' || status === 'resolved_exact')) {
      const safeName = name.replace(/'/g, "''");
      sqlLines.push(
        `UPDATE public.species SET inat_taxon_id = ${proposedId}, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = '${safeName}';`
      );
    } else if (proposedId && status === 'resolved_best_guess') {
      const safeName = name.replace(/'/g, "''");
      sqlLines.push(
        `-- REVIEW: ${name} → candidate ID ${proposedId} (${note})\n-- UPDATE public.species SET inat_taxon_id = ${proposedId}, inat_taxon_verified = true, updated_at = now() WHERE scientific_name = '${safeName}';`
      );
    } else {
      sqlLines.push(`-- UNRESOLVED: ${name} (${note})`);
    }
  }

  // Write outputs
  const base = path.resolve(process.cwd(), 'inat_ids_validated.csv');
  const sqlPath = path.resolve(process.cwd(), 'inat_ids_update.sql');
  const csv = [
    'scientific_name,proposed_inat_taxon_id,status,note',
    ...out.map(r => `${JSON.stringify(r.scientific_name)},${r.proposed_id},${r.status},${JSON.stringify(r.note)}`)
  ].join('\n');

  fs.writeFileSync(base, csv, 'utf8');
  fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf8');

  console.log(`\nWrote:\n- ${base}\n- ${sqlPath}\n`);
  console.log('Review the SQL, then run it in Supabase.');
})();