import { config as loadEnv } from 'dotenv';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSupabaseServerClient } from '../lib/supabase/serverClient';

loadEnv();
loadEnv({ path: '.env.local', override: false });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const WEBP_DIR = path.join(ROOT_DIR, 'public', 'webp');
const OUTPUT_PATH = path.join(ROOT_DIR, 'data', 'speciesImageMap.ts');

interface SpeciesRow {
  species_code: string;
  name_en: string;
  scientific_name: string | null;
}

interface SpeciesImageAsset {
  base: string | null;
  mobile?: string | null;
  thumb?: string | null;
}

interface MappingResult {
  code: string;
  name: string;
  scientificName: string | null;
  slug: string | null;
  asset?: SpeciesImageAsset;
  status: 'matched' | 'missing';
  notes?: string;
  candidates: string[];
}

const MANUAL_OVERRIDES: Record<string, string> = {
  POL: 'pollock',
  SBR: 'gilthead-bream',
  SAI: 'saithe-pollock',
  WEE: 'weaver',
  CUT: 'cuttlefish',
  LIN: 'ling',
  OCT: 'octopus',
  CON: 'conger',
  BBR: 'black-bream',
  BSB: 'red-bream',
  SQU: 'squid',
  HER: 'herring',
  SBA: 'bass',
  PLE: 'plaice',
  DEN: 'dentex',
  COD: 'cod',
  CMB: 'painted-comber',
  sba: 'gilthead-seabream',
};

const DESCRIPTIVE_WORDS = ['atlantic', 'european', 'greater', 'common'];

function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function generateSlugCandidates(name: string, code: string, scientificName: string | null): string[] {
  const variants = new Set<string>();
  const cleanedName = name.replace(/\([^)]*\)/g, '').trim();

  const base = slugify(cleanedName);
  if (base) variants.add(base);

  const tokens = cleanedName
    .split(/\s+/)
    .filter((token) => !DESCRIPTIVE_WORDS.includes(token.toLowerCase()));
  if (tokens.length !== cleanedName.split(/\s+/).length) {
    const trimmed = slugify(tokens.join(' '));
    if (trimmed) variants.add(trimmed);
  }

  if (scientificName) {
    const sciSlug = slugify(scientificName.replace(/\s+/g, '-'));
    if (sciSlug) variants.add(sciSlug);
  }

  if (MANUAL_OVERRIDES[code]) {
    variants.delete(MANUAL_OVERRIDES[code]);
    variants.add(MANUAL_OVERRIDES[code]);
  }

  return Array.from(variants);
}

async function loadImageCatalog(): Promise<Map<string, SpeciesImageAsset>> {
  const entries = await fs.readdir(WEBP_DIR, { withFileTypes: true });
  const catalog = new Map<string, SpeciesImageAsset>();

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.webp')) continue;

    const baseName = entry.name.replace(/\.webp$/, '');
    const match = baseName.match(/^(.*)-(mobile|thumb)$/);

    if (match) {
      const [, slug, variant] = match;
      const asset = catalog.get(slug) ?? { base: null };
      if (variant === 'mobile') {
        asset.mobile = `/webp/${entry.name}`;
      } else if (variant === 'thumb') {
        asset.thumb = `/webp/${entry.name}`;
      }
      catalog.set(slug, asset);
    } else {
      const slug = baseName;
      const asset = catalog.get(slug) ?? { base: null };
      asset.base = `/webp/${entry.name}`;
      catalog.set(slug, asset);
    }
  }

  return catalog;
}

function buildMapping(
  species: SpeciesRow[],
  catalog: Map<string, SpeciesImageAsset>
): MappingResult[] {
  const results: MappingResult[] = [];

  for (const row of species) {
    const candidates = generateSlugCandidates(row.name_en, row.species_code, row.scientific_name);
    let matchedSlug: string | null = null;
    let matchedAsset: SpeciesImageAsset | undefined;

    for (const candidate of candidates) {
      const asset = catalog.get(candidate);
      if (asset?.base) {
        matchedSlug = candidate;
        matchedAsset = asset;
        break;
      }
    }

    if (!matchedSlug) {
      const suggested = candidates.find((candidate) => catalog.has(candidate));
      if (suggested) {
        matchedSlug = suggested;
        matchedAsset = catalog.get(suggested);
      }
    }

    if (matchedSlug && matchedAsset?.base) {
      results.push({
        code: row.species_code,
        name: row.name_en,
        scientificName: row.scientific_name,
        slug: matchedSlug,
        asset: matchedAsset,
        status: 'matched',
        candidates,
      });
    } else {
      results.push({
        code: row.species_code,
        name: row.name_en,
        scientificName: row.scientific_name,
        slug: null,
        status: 'missing',
        candidates,
        notes: 'No matching webp asset found',
      });
    }
  }

  return results.sort((a, b) => a.code.localeCompare(b.code));
}

function buildTypeScriptModule(mappings: MappingResult[]): string {
  const timestamp = new Date().toISOString();
  const header = `/**\n * Auto-generated by scripts/generate-species-image-map.ts\n * Generated at: ${timestamp}\n */\n\n`;

  const typeDefs = `export interface SpeciesImageInfo {\n  code: string;\n  name: string;\n  scientificName: string | null;\n  slug: string;\n  image: string;\n  mobile?: string | null;\n  thumb?: string | null;\n}\n\n`;

  const mappedEntries = mappings
    .filter((entry) => entry.status === 'matched' && entry.slug && entry.asset?.base)
    .map((entry) => {
      const fields = [
        `code: '${entry.code}'`,
        `name: '${entry.name.replace(/'/g, "\\'")}'`,
        `scientificName: ${entry.scientificName ? `'${entry.scientificName}'` : 'null'}`,
        `slug: '${entry.slug}'`,
        `image: '${entry.asset!.base}'`,
      ];

      if (entry.asset?.mobile) {
        fields.push(`mobile: '${entry.asset.mobile}'`);
      }
      if (entry.asset?.thumb) {
        fields.push(`thumb: '${entry.asset.thumb}'`);
      }

      return `  '${entry.code}': { ${fields.join(', ')} },`;
    })
    .join('\n');

  const missingEntries = mappings
    .filter((entry) => entry.status === 'missing')
    .map((entry) => {
      const candidateString = entry.candidates.length ? ` [candidates: ${entry.candidates.join(', ')}]` : '';
      return `  { code: '${entry.code}', name: '${entry.name.replace(/'/g, "\\'")}', scientificName: ${entry.scientificName ? `'${entry.scientificName}'` : 'null'}, message: '${entry.notes ?? 'Missing asset'}${candidateString}' },`;
    })
    .join('\n');

  const mapConst = `export const SPECIES_IMAGE_MAP: Record<string, SpeciesImageInfo> = {\n${mappedEntries}\n};\n\n`;

  const missingConst = `export const SPECIES_IMAGES_MISSING = [\n${missingEntries}\n] as const;\n`;

  return `${header}${typeDefs}${mapConst}${missingConst}`;
}

async function main() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('species')
    .select('species_code, name_en, scientific_name')
    .order('species_code');

  if (error) {
    throw new Error(`Failed to load species from Supabase: ${error.message}`);
  }

  const species = (data ?? []) as SpeciesRow[];
  const catalog = await loadImageCatalog();
  const mappings = buildMapping(species, catalog);
  const moduleSource = buildTypeScriptModule(mappings);

  await fs.writeFile(OUTPUT_PATH, moduleSource, 'utf8');

  const matchedCount = mappings.filter((entry) => entry.status === 'matched').length;
  const missingCount = mappings.length - matchedCount;

  console.log(`Generated species image map with ${matchedCount} matches and ${missingCount} missing entries.`);
  if (missingCount > 0) {
    for (const missing of mappings.filter((entry) => entry.status === 'missing')) {
      console.warn(`Missing image for ${missing.code} (${missing.name}). Tried: ${missing.candidates.join(', ')}`);
    }
  }
}

main().catch((error) => {
  console.error('Failed to generate species image map:', error);
  process.exit(1);
});
