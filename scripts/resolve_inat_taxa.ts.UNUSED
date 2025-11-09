/**
 * Resolve iNaturalist taxon IDs for a list of species and output CSV + SQL.
 * Run with:  npx ts-node resolve_inat_taxa.ts
 * (or compile with tsc; Node 18+ recommended for global fetch)
 */

type Row = { scientific_name: string };

// ==== PASTE YOUR LIST HERE (exactly as provided) ====
const RAW: Row[] = [
  { scientific_name: "Spicara smaris" },
  { scientific_name: "Symphodus melops" },
  { scientific_name: "Sphyraena sphyraena" },
  { scientific_name: "Labridae spp." },
  { scientific_name: "Pagrus pagrus" },
  { scientific_name: "Trachinus draco" },
  { scientific_name: "Serranus scriba" },
  { scientific_name: "Diplodus vulgaris" },
  { scientific_name: "Pagellus bogaraveo" },
  { scientific_name: "Scomber colias" },
  { scientific_name: "Pollachius virens" },
  { scientific_name: "Sardina pilchardus" },
  { scientific_name: "Sparisoma cretense" },
  { scientific_name: "Labrus bergylta" },
  { scientific_name: "Loligo vulgaris" },
  { scientific_name: "Sparus aurata" },
  { scientific_name: "Trachurus mediterraneus" },
  { scientific_name: "Gadus morhua" },
  { scientific_name: "Sarda sarda" },
  { scientific_name: "Sarpa salpa" },
  { scientific_name: "Spondyliosoma cantharus" },
  { scientific_name: "Scophthalmus maximus" },
  { scientific_name: "Sprattus sprattus" },
  { scientific_name: "Mullus surmuletus" },
  { scientific_name: "Pomatomus saltatrix" },
  { scientific_name: "Mustelus asterias" },
  { scientific_name: "Scomber scombrus" },
  { scientific_name: "Euthynnus alletteratus" },
  { scientific_name: "Chelidonichthys lucerna" },
  { scientific_name: "Pleuronectes platessa" },
  { scientific_name: "Mustelus mustelus" },
  { scientific_name: "Ctenolabrus rupestris" },
  { scientific_name: "Serranus cabrilla" },
  { scientific_name: "Sepia officinalis" },
  { scientific_name: "Molva molva" },
  { scientific_name: "Gilthead Seabream" },        // alias → Sparus aurata
  { scientific_name: "Argyrosomus regius" },
  { scientific_name: "Scorpaena scrofa" },
  { scientific_name: "Trachurus trachurus" },
  { scientific_name: "Platichthys flesus" },
  { scientific_name: "Dicentrarchus punctatus" },
  { scientific_name: "Epinephelus aeneus" },
  { scientific_name: "Eutrigla gurnardus" },
  { scientific_name: "Seriola dumerili" },
  { scientific_name: "Ammodytes tobianus" },
  { scientific_name: "Saithe/Pollock" },            // alias → Pollachius virens
  { scientific_name: "Dicentrarchus labrax" },
  { scientific_name: "Conger conger" },
  { scientific_name: "Salmo trutta" },
  { scientific_name: "Octopus vulgaris" },
  { scientific_name: "Raja microocellata" },
  { scientific_name: "Raja clavata" },
  { scientific_name: "Epinephelus marginatus" },
  { scientific_name: "Lichia amia" },
  { scientific_name: "Limanda limanda" },
  { scientific_name: "Melanogrammus aeglefinus" },
  { scientific_name: "Chelon labrosus" },
  { scientific_name: "Zeus faber" },
  { scientific_name: "Oblada melanura" },
  { scientific_name: "Labrus mixtus" },
  { scientific_name: "Pagellus erythrinus" },
  { scientific_name: "Solea solea" },
  { scientific_name: "Scyliorhinus stellaris" },
  { scientific_name: "Belone belone" },
  { scientific_name: "Lepidorhombus whiffiagonis" },
  { scientific_name: "Mugil cephalus" },
  { scientific_name: "Sphyraena viridensis" },
  { scientific_name: "Chelidonichthys cuculus" },
  { scientific_name: "Scyliorhinus canicula" },
  { scientific_name: "Merlangius merlangus" },
  { scientific_name: "Raja montagui" },
  { scientific_name: "Boops boops" },
  { scientific_name: "Diplodus sargus" },
  { scientific_name: "Raja undulata" },
  { scientific_name: "Scophthalmus rhombus" },
  { scientific_name: "Pollachius pollachius" },
  { scientific_name: "Centrolabrus exoletus" },
  { scientific_name: "Clupea harengus" },
  { scientific_name: "Dentex dentex" },
];

// ---- Aliases and normalisers (fixes common-name or ambiguous entries) ----
const ALIASES: Record<string, string> = {
  "Gilthead Seabream": "Sparus aurata",
  "Saithe/Pollock": "Pollachius virens", // saithe (a.k.a. coalfish); avoids pollock (Gadus chalcogrammus)
  "Labridae spp.": "",                    // no single species; will skip (null)
};

function normaliseName(name: string): string | null {
  const trimmed = name.trim();
  if (ALIASES[trimmed] !== undefined) {
    const mapped = ALIASES[trimmed];
    return mapped || null;
  }
  if (/spp\.\s*$/i.test(trimmed)) return null; // families/aggregates → skip
  if (trimmed.includes("/")) return null;      // ambiguous → skip unless aliased
  return trimmed;
}

type InatHit = {
  id: number;
  name: string;            // scientific name
  rank: string;
  matched_term?: string;
  preferred_common_name?: string;
};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchTaxonId(scientificName: string): Promise<{ id: number; chosen: InatHit } | null> {
  const url = new URL("https://api.inaturalist.org/v1/taxa");
  url.searchParams.set("q", scientificName);
  url.searchParams.set("rank", "species");
  url.searchParams.set("per_page", "5");

  const res = await fetch(url.toString(), { headers: { "User-Agent": "Findr/1.0 (contact: your-email@example.com)" } });
  if (!res.ok) return null;
  const data = await res.json();
  const hits: InatHit[] = data.results ?? [];

  // exact name match first (case-insensitive)
  const exact = hits.find(h => h.name?.toLowerCase() === scientificName.toLowerCase());
  if (exact) return { id: exact.id, chosen: exact };

  // else, first species-ranked result as fallback
  const speciesHit = hits.find(h => h.rank === "species");
  if (speciesHit) return { id: speciesHit.id, chosen: speciesHit };

  return null;
}

(async () => {
  const out: { scientific_name: string; resolved_name: string | null; inat_taxon_id: number | null; note?: string }[] = [];

  for (const row of RAW) {
    const original = row.scientific_name;
    const norm = normaliseName(original);

    if (!norm) {
      out.push({ scientific_name: original, resolved_name: null, inat_taxon_id: null, note: "skipped (ambiguous/common/family)" });
      continue;
    }

    try {
      const result = await fetchTaxonId(norm);
      if (result) {
        out.push({ scientific_name: original, resolved_name: norm, inat_taxon_id: result.id });
      } else {
        out.push({ scientific_name: original, resolved_name: norm, inat_taxon_id: null, note: "no match" });
      }
    } catch (e) {
      out.push({ scientific_name: original, resolved_name: norm, inat_taxon_id: null, note: "error" });
    }

    // throttle ~1/sec to be polite
    await sleep(1100);
  }

  // CSV
  const csvLines = [
    "scientific_name,resolved_name,inat_taxon_id,note",
    ...out.map(r => [
      `"${r.scientific_name.replace(/"/g, '""')}"`,
      r.resolved_name ? `"${r.resolved_name}"` : "",
      r.inat_taxon_id ?? "",
      r.note ? `"${r.note}"` : "",
    ].join(","))
  ];
  console.log("\n=== CSV ===\n" + csvLines.join("\n"));

  // SQL (assumes column public.species.inat_taxon_id exists and names are unique)
  const sqlLines: string[] = [];
  for (const r of out) {
    if (r.inat_taxon_id) {
      sqlLines.push(
        `UPDATE public.species SET inat_taxon_id = ${r.inat_taxon_id} WHERE scientific_name = '${r.scientific_name.replace(/'/g, "''")}';`
      );
    } else {
      // leave commented rows to review
      const why = r.note ? ` -- ${r.note}` : "";
      sqlLines.push(`-- REVIEW: ${r.scientific_name}${why}`);
    }
  }
  console.log("\n=== SQL ===\n" + sqlLines.join("\n"));

  // Handy note: build gallery URLs like:
  // `https://www.inaturalist.org/taxa/{inat_taxon_id}-{resolved_name_with_dashes}/browse_photos`
})();