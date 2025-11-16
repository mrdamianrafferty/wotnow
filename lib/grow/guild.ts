export interface PermacultureRole {
	code: string;
	name: string;
	description: string;
	icon: string;
	tips?: string[];
}

export interface GuildBlueprint {
	guild_id: string;
	guild_name: string;
	guild_description?: string;
	focal_common_name: string;
	focal_slug: string;
	focal_category?: string;
	climate_zones: string[];
	member_count: number;
}

export interface GuildCompanion {
	guildId: string;
	guildName: string;
	guildDescription?: string;
	focalName: string;
	focalSlug: string;
	focalCategory?: string;
	climateZoneCode?: string;
	companionName: string;
	companionSlug: string;
	companionCategory?: string;
	role: string;
	roleDisplay?: string;
	roleDescription?: string;
	benefits?: string[];
	notes?: string;
	rankInRole?: number;
}

const ROLE_CATALOG: Record<string, PermacultureRole> = {
	nitrogen_fixer: {
		code: 'nitrogen_fixer',
		name: 'Nitrogen Fixer',
		description: 'Improves soil fertility by pulling nitrogen from the air and storing it in the soil.',
		icon: '🟢',
		tips: ['Prune lightly each season to encourage vigorous regrowth.'],
	},
	dynamic_accumulator: {
		code: 'dynamic_accumulator',
		name: 'Dynamic Accumulator',
		description: 'Deep rooted plants that mine minerals and make them available to neighboring species.',
		icon: '⚗️',
	},
	groundcover: {
		code: 'groundcover',
		name: 'Living Groundcover',
		description: 'Spreads across the soil surface to retain moisture and suppress weeds.',
		icon: '🪴',
	},
	pollinator: {
		code: 'pollinator',
		name: 'Pollinator Magnet',
		description: 'Attracts bees and beneficial insects that boost yields and ecosystem health.',
		icon: '🐝',
	},
	pest_repellent: {
		code: 'pest_repellent',
		name: 'Pest Repellent',
		description: 'Scents or compounds deter common pests from focusing on your focal crop.',
		icon: '🛡️',
	},
	support_species: {
		code: 'support_species',
		name: 'Structural Support',
		description: 'Provides structural benefits such as shade, wind protection, or trellising.',
		icon: '🌳',
	},
	beneficial_insect_attractor: {
		code: 'beneficial_insect_attractor',
		name: 'Beneficial Insect Magnet',
		description: 'Feeds the predators that keep pest populations in check.',
		icon: '🦟',
	},
	biomass: {
		code: 'biomass',
		name: 'Biomass Builder',
		description: 'Fast growing plants ideal for chop-and-drop mulch cycles.',
		icon: '🍃',
	},
	vine_layer: {
		code: 'vine_layer',
		name: 'Vine Layer',
		description: 'Climbing species that take advantage of vertical space.',
		icon: '🪢',
	},
	ground_worker: {
		code: 'ground_worker',
		name: 'Ground Worker',
		description: 'Root specialists that aerate soil and cycle nutrients.',
		icon: '🪱',
	},
};

const GUILD_BLUEPRINTS: GuildBlueprint[] = [
	{
		guild_id: 'apple_guild',
		guild_name: 'Classic Apple Tree Guild',
		guild_description: 'Permaculture companion planting for common apple varieties.',
		focal_common_name: 'Apple Tree',
		focal_slug: 'apple-tree',
		focal_category: 'Fruit Tree',
		climate_zones: ['atlantic_mild', 'temperate_maritime', 'temperate_continental'],
		member_count: 8,
	},
	{
		guild_id: 'blueberry_guild',
		guild_name: 'Blueberry Meadow Guild',
		guild_description: 'Low-acid loving companions that protect blueberry shrubs.',
		focal_common_name: 'Highbush Blueberry',
		focal_slug: 'blueberry-highbush',
		focal_category: 'Berry Shrub',
		climate_zones: ['atlantic_mild', 'temperate_maritime', 'subarctic'],
		member_count: 6,
	},
];

const GUILD_COMPANIONS: GuildCompanion[] = [
	{
		guildId: 'apple_guild',
		guildName: 'Classic Apple Tree Guild',
		guildDescription: 'Permaculture companion planting for common apple varieties.',
		focalName: 'Apple Tree',
		focalSlug: 'apple-tree',
		focalCategory: 'Fruit Tree',
		climateZoneCode: 'atlantic_mild',
		companionName: 'Comfrey',
		companionSlug: 'comfrey',
		companionCategory: 'Dynamic Accumulator',
		role: 'dynamic_accumulator',
		notes: 'Chop-and-drop leaves feed the tree and suppress weeds.',
		rankInRole: 1,
	},
	{
		guildId: 'apple_guild',
		guildName: 'Classic Apple Tree Guild',
		guildDescription: 'Permaculture companion planting for common apple varieties.',
		focalName: 'Apple Tree',
		focalSlug: 'apple-tree',
		focalCategory: 'Fruit Tree',
		climateZoneCode: 'atlantic_mild',
		companionName: 'White Clover',
		companionSlug: 'white-clover',
		companionCategory: 'Groundcover',
		role: 'nitrogen_fixer',
		notes: 'Fixes nitrogen and attracts pollinators when mowed high.',
		rankInRole: 1,
	},
	{
		guildId: 'apple_guild',
		guildName: 'Classic Apple Tree Guild',
		guildDescription: 'Permaculture companion planting for common apple varieties.',
		focalName: 'Apple Tree',
		focalSlug: 'apple-tree',
		focalCategory: 'Fruit Tree',
		climateZoneCode: 'atlantic_mild',
		companionName: 'Daffodil',
		companionSlug: 'daffodil',
		companionCategory: 'Bulb',
		role: 'pest_repellent',
		notes: 'Bulb barrier discourages rodents from burrowing near the trunk.',
		rankInRole: 2,
	},
	{
		guildId: 'apple_guild',
		guildName: 'Classic Apple Tree Guild',
		guildDescription: 'Permaculture companion planting for common apple varieties.',
		focalName: 'Apple Tree',
		focalSlug: 'apple-tree',
		focalCategory: 'Fruit Tree',
		climateZoneCode: 'atlantic_mild',
		companionName: 'Yarrow',
		companionSlug: 'yarrow',
		companionCategory: 'Herb',
		role: 'beneficial_insect_attractor',
		notes: 'Umbel flowers bring in lacewings and parasitic wasps.',
		rankInRole: 1,
	},
	{
		guildId: 'apple_guild',
		guildName: 'Classic Apple Tree Guild',
		guildDescription: 'Permaculture companion planting for common apple varieties.',
		focalName: 'Apple Tree',
		focalSlug: 'apple-tree',
		focalCategory: 'Fruit Tree',
		climateZoneCode: 'atlantic_mild',
		companionName: 'Garlic Chives',
		companionSlug: 'garlic-chives',
		companionCategory: 'Herb',
		role: 'pest_repellent',
		notes: 'Sulfur compounds repel borers and other sap-sucking pests.',
		rankInRole: 1,
	},
	{
		guildId: 'blueberry_guild',
		guildName: 'Blueberry Meadow Guild',
		guildDescription: 'Low-acid loving companions that protect blueberry shrubs.',
		focalName: 'Highbush Blueberry',
		focalSlug: 'blueberry-highbush',
		focalCategory: 'Berry Shrub',
		climateZoneCode: 'atlantic_mild',
		companionName: 'Lowbush Blueberry',
		companionSlug: 'lowbush-blueberry',
		companionCategory: 'Berry Shrub',
		role: 'groundcover',
		notes: 'Spreads under shrubs to keep soil shaded and moist.',
		rankInRole: 1,
	},
	{
		guildId: 'blueberry_guild',
		guildName: 'Blueberry Meadow Guild',
		guildDescription: 'Low-acid loving companions that protect blueberry shrubs.',
		focalName: 'Highbush Blueberry',
		focalSlug: 'blueberry-highbush',
		focalCategory: 'Berry Shrub',
		climateZoneCode: 'atlantic_mild',
		companionName: 'Lupine',
		companionSlug: 'lupine',
		companionCategory: 'Nitrogen Fixer',
		role: 'nitrogen_fixer',
		notes: 'Adds nitrogen to acidic soils while providing spring blooms.',
		rankInRole: 1,
	},
	{
		guildId: 'blueberry_guild',
		guildName: 'Blueberry Meadow Guild',
		guildDescription: 'Low-acid loving companions that protect blueberry shrubs.',
		focalName: 'Highbush Blueberry',
		focalSlug: 'blueberry-highbush',
		focalCategory: 'Berry Shrub',
		climateZoneCode: 'atlantic_mild',
		companionName: 'Sweet Fern',
		companionSlug: 'sweet-fern',
		companionCategory: 'Shrub',
		role: 'pest_repellent',
		notes: 'Aromatic foliage discourages browsing deer.',
		rankInRole: 1,
	},
	{
		guildId: 'blueberry_guild',
		guildName: 'Blueberry Meadow Guild',
		guildDescription: 'Low-acid loving companions that protect blueberry shrubs.',
		focalName: 'Highbush Blueberry',
		focalSlug: 'blueberry-highbush',
		focalCategory: 'Berry Shrub',
		climateZoneCode: 'atlantic_mild',
		companionName: 'Creeping Thyme',
		companionSlug: 'creeping-thyme',
		companionCategory: 'Herb',
		role: 'groundcover',
		notes: 'Fragrant mat that suppresses weeds and invites pollinators.',
		rankInRole: 2,
	},
	{
		guildId: 'blueberry_guild',
		guildName: 'Blueberry Meadow Guild',
		guildDescription: 'Low-acid loving companions that protect blueberry shrubs.',
		focalName: 'Highbush Blueberry',
		focalSlug: 'blueberry-highbush',
		focalCategory: 'Berry Shrub',
		climateZoneCode: 'atlantic_mild',
		companionName: 'Fothergilla',
		companionSlug: 'fothergilla',
		companionCategory: 'Shrub',
		role: 'support_species',
		notes: 'Provides shoulder-season blooms and light shade for understory.',
		rankInRole: 1,
	},
];

const simulateNetworkDelay = async () => {
	await new Promise((resolve) => setTimeout(resolve, 150));
};

const normaliseZone = (zone: string) => zone.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

export async function getAvailableGuildBlueprints(climateZone: string): Promise<GuildBlueprint[]> {
	await simulateNetworkDelay();
	const zone = normaliseZone(climateZone);

	return GUILD_BLUEPRINTS.filter((blueprint) =>
		blueprint.climate_zones.length === 0 || blueprint.climate_zones.includes(zone)
	).map((blueprint) => ({
		...blueprint,
		member_count: GUILD_COMPANIONS.filter(
			(companion) => companion.guildId === blueprint.guild_id &&
				(!companion.climateZoneCode || normaliseZone(companion.climateZoneCode) === zone)
		).length,
	}));
}

export async function getGuildCompanions(focalSlug: string, climateZone: string): Promise<GuildCompanion[]> {
	await simulateNetworkDelay();
	const zone = normaliseZone(climateZone);
	const slug = normaliseZone(focalSlug);

	return GUILD_COMPANIONS.filter((companion) =>
		normaliseZone(companion.focalSlug) === slug &&
		(!companion.climateZoneCode || normaliseZone(companion.climateZoneCode) === zone)
	).map((companion) => ({ ...companion }));
}

export function getPermacultureRole(roleCode: string): PermacultureRole | undefined {
	return ROLE_CATALOG[roleCode] ?? ROLE_CATALOG.pest_repellent;
}
