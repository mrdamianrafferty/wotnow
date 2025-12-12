import type { HostKind, ThreatMatchInput } from './types';

export type HostTag = { kind: HostKind; key: string };

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizePlantCategory(type?: string | null): string {
  return typeof type === 'string' ? slugify(type) : '';
}

function cropTagsForPlant(plantName: string, plantType?: string | null): string[] {
  const name = slugify(plantName);
  const type = normalizePlantCategory(plantType);

  const tags = new Set<string>();

  // Always include the specific name tag.
  if (name) tags.add(name);

  // Broad buckets to match your existing host_key taxonomy.
  // This intentionally errs on recall over precision for v1.
  if (type === 'vegetable' || type === 'herb' || type === 'fruit_tree' || type === 'tree' || type === 'shrub' || type === 'ornamental' || type === 'vine') {
    tags.add('veg_general');
  }

  // Family/group mappings.
  const inSet = (v: string, set: Set<string>) => set.has(v);
  const brassica = new Set(['cabbage', 'cauliflower', 'broccoli', 'kale', 'brussels_sprouts', 'sprouts', 'pak_choi', 'bok_choy', 'turnip', 'radish', 'swede', 'rutabaga', 'mustard', 'rocket']);
  const cucurbit = new Set(['courgette', 'zucchini', 'cucumber', 'pumpkin', 'squash', 'butternut_squash', 'melon', 'watermelon']);
  const onionFamily = new Set(['onion', 'garlic', 'leek', 'shallot', 'chive', 'spring_onion', 'scallion']);
  const leafyGreens = new Set(['lettuce', 'spinach', 'chard', 'swiss_chard', 'kale', 'rocket', 'arugula']);
  const beans = new Set(['bean', 'beans', 'broad_bean', 'runner_bean', 'french_bean', 'pea', 'peas']);

  if (inSet(name, brassica)) tags.add('brassicas');
  if (inSet(name, cucurbit)) tags.add('cucurbits');
  if (inSet(name, onionFamily)) tags.add('onion_family');
  if (inSet(name, leafyGreens)) tags.add('leafy_greens');
  if (inSet(name, beans)) tags.add('beans');

  // Orchard / fruit trees
  const orchard = new Set(['apple', 'pear', 'plum', 'cherry', 'apricot', 'peach', 'nectarine', 'fig', 'quince']);
  if (inSet(name, orchard) || type === 'fruit_tree') {
    tags.add('orchard');
    tags.add('fruit_tree');
  }

  // Greenhouse / tender crops
  const greenhouse = new Set(['tomato', 'pepper', 'aubergine', 'eggplant', 'cucumber', 'basil']);
  if (inSet(name, greenhouse)) {
    tags.add('greenhouse_crops');
    tags.add('tender_plants');
  }

  // Houseplants / succulents
  if (type === 'houseplant' || type === 'houseplants') tags.add('houseplants');
  if (name === 'succulent' || name === 'succulents') tags.add('succulents');
  if (name === 'hosta') tags.add('ornamentals');
  if (type === 'ornamental') tags.add('ornamentals');
  if (type === 'flower' || type === 'flowers') tags.add('flowers');

  // Specific aliases
  if (name === 'eggplant') tags.add('aubergine');
  if (name === 'zucchini') tags.add('courgette');
  if (name === 'arugula') tags.add('rocket');

  return [...tags];
}

export function buildUserHostTags(input: ThreatMatchInput): HostTag[] {
  const out: HostTag[] = [];

  const prefs = input.preferencesJson || {};
  const gardenFeatures = (prefs['garden_features'] ?? prefs['gardenFeatures']) as unknown;

  if (Array.isArray(gardenFeatures)) {
    for (const raw of gardenFeatures) {
      if (typeof raw !== 'string') continue;
      const key = slugify(raw);
      if (!key) continue;
      out.push({ kind: 'feature_tag', key });
    }
  }

  // Crop tags from plants list (stored in grow_user_plants)
  for (const plant of input.plants) {
    if (!plant?.name) continue;
    const tags = cropTagsForPlant(plant.name, plant.type);
    for (const key of tags) {
      if (!key) continue;
      out.push({ kind: 'crop_tag', key });
    }
  }

  // De-dupe
  const seen = new Set<string>();
  const deduped: HostTag[] = [];
  for (const tag of out) {
    const sig = `${tag.kind}:${tag.key}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    deduped.push(tag);
  }

  return deduped;
}
