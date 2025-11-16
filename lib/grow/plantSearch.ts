type PlantCategoryId = 'vegetables' | 'herbs' | 'fruit' | 'flowers' | 'trees';

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'it';

export interface PlantSearchResult {
	slug: string;
	display_name: string;
	scientific_name?: string;
	category: PlantCategoryId;
	description?: string;
	match_type?: 'exact' | 'partial';
}

export interface PlantCategory {
	category: PlantCategoryId;
	plant_count: number;
}

interface PlantRecord extends PlantSearchResult {
	aliases?: Partial<Record<SupportedLanguage, string[]>>;
	keywords?: string[];
}

const CATEGORY_METADATA: Record<PlantCategoryId, { label: string; icon: string }> = {
	vegetables: { label: 'Vegetables', icon: '🥕' },
	herbs: { label: 'Herbs', icon: '🌿' },
	fruit: { label: 'Fruit', icon: '🍓' },
	flowers: { label: 'Flowers', icon: '🌸' },
	trees: { label: 'Trees', icon: '🌳' },
};

const PLANTS: PlantRecord[] = [
	{
		slug: 'tomato',
		display_name: 'Tomato',
		scientific_name: 'Solanum lycopersicum',
		category: 'vegetables',
		description: 'Warm season crop that thrives in full sun and rich soil.',
		aliases: {
			es: ['Tomate'],
			fr: ['Tomate'],
			de: ['Tomate'],
			it: ['Pomodoro'],
		},
		keywords: ['nightshade', 'heirloom'],
	},
	{
		slug: 'basil',
		display_name: 'Basil',
		scientific_name: 'Ocimum basilicum',
		category: 'herbs',
		description: 'Fragrant herb that pairs well with tomatoes and summer dishes.',
		aliases: {
			es: ['Albahaca'],
			fr: ['Basilic'],
			de: ['Basilikum'],
			it: ['Basilico'],
		},
		keywords: ['companion', 'pesto'],
	},
	{
		slug: 'blueberry',
		display_name: 'Blueberry',
		scientific_name: 'Vaccinium corymbosum',
		category: 'fruit',
		description: 'Perennial berry shrub that prefers acidic soil.',
		aliases: {
			es: ['Arándano'],
			fr: ['Myrtille'],
			de: ['Heidelbeere'],
			it: ['Mirtillo'],
		},
		keywords: ['berry'],
	},
	{
		slug: 'lavender',
		display_name: 'Lavender',
		scientific_name: 'Lavandula angustifolia',
		category: 'flowers',
		description: 'Drought-tolerant perennial valued for fragrance and pollinator support.',
		aliases: {
			es: ['Lavanda'],
			fr: ['Lavande'],
			de: ['Lavendel'],
			it: ['Lavanda'],
		},
		keywords: ['pollinator'],
	},
	{
		slug: 'apple-tree',
		display_name: 'Apple Tree',
		scientific_name: 'Malus domestica',
		category: 'trees',
		description: 'Deciduous fruit tree requiring winter chill and pruning for best yields.',
		aliases: {
			es: ['Manzano'],
			fr: ['Pommier'],
			de: ['Apfelbaum'],
			it: ['Melo'],
		},
		keywords: ['orchard'],
	},
];

const LANGUAGE_STORAGE_KEY = 'grow_daisy_language';

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, string> = {
	en: 'English',
	es: 'Español',
	fr: 'Français',
	de: 'Deutsch',
	it: 'Italiano',
};

export interface PlantSearchOptions {
	userLang: SupportedLanguage;
	limit?: number;
}

const normalise = (value: string) => value.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const getAliasesForLanguage = (plant: PlantRecord, lang: SupportedLanguage) => {
	const aliases = plant.aliases?.[lang] ?? [];
	return Array.isArray(aliases) ? aliases : [];
};

const buildSearchPool = (plant: PlantRecord, lang: SupportedLanguage) => {
	const pool = [plant.display_name, plant.scientific_name ?? ''];
	pool.push(...getAliasesForLanguage(plant, lang));
	if (plant.keywords) {
		pool.push(...plant.keywords);
	}
	return pool.filter(Boolean);
};

export async function searchPlants(query: string, options: PlantSearchOptions): Promise<PlantSearchResult[]> {
	const { userLang, limit = 30 } = options;
	const term = normalise(query);
	if (!term) {
		return [];
	}

	const matches = PLANTS.filter((plant) => {
		return buildSearchPool(plant, userLang).some((value) => normalise(value).includes(term));
	}).map<PlantSearchResult>((plant) => ({
		...plant,
		match_type: normalise(plant.display_name) === term ? 'exact' : 'partial',
	}));

	return matches.slice(0, limit);
}

export async function getPlantsByCategory(category: string, _lang: SupportedLanguage): Promise<PlantSearchResult[]> {
	return PLANTS.filter((plant) => plant.category === category)
		.map((plant) => ({
			...plant,
			match_type: undefined,
			display_name: plant.display_name,
		}));
}

export async function getPlantCategories(): Promise<PlantCategory[]> {
	const counts = new Map<PlantCategoryId, number>();
	for (const plant of PLANTS) {
		counts.set(plant.category, (counts.get(plant.category) ?? 0) + 1);
	}
	return Array.from(counts.entries()).map(([category, plant_count]) => ({ category, plant_count }));
}

export function getAllNames(plant: PlantSearchResult): string[] {
	const names = new Set<string>();
	names.add(plant.display_name);
	if (plant.scientific_name) {
		names.add(plant.scientific_name);
	}
	const record = PLANTS.find((p) => p.slug === plant.slug);
	if (record?.aliases) {
		for (const aliasList of Object.values(record.aliases)) {
			if (!aliasList) continue;
			for (const alias of aliasList) {
				names.add(alias);
			}
		}
	}
	return Array.from(names);
}

export function getUserLanguage(): SupportedLanguage {
	if (typeof window === 'undefined') {
		return 'en';
	}
	const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
	return (stored as SupportedLanguage) || 'en';
}

export function setUserLanguage(lang: SupportedLanguage) {
	if (typeof window === 'undefined') {
		return;
	}
	window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

export function getCategoryLabel(category: string): string {
	return CATEGORY_METADATA[category as PlantCategoryId]?.label ?? category;
}

export function getCategoryIcon(category: string): string {
	return CATEGORY_METADATA[category as PlantCategoryId]?.icon ?? '🪴';
}
