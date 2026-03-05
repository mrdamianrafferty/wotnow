export const PLANT_SPECIES_LANGUAGE_FIELDS = {
  name_fr: 'fr',
  name_es: 'es',
  name_it: 'it',
  name_de: 'de',
  name_pt: 'pt',
  name_nl: 'nl',
  name_pl: 'pl',
} as const;

export type PlantSpeciesLanguageCode = typeof PLANT_SPECIES_LANGUAGE_FIELDS[keyof typeof PLANT_SPECIES_LANGUAGE_FIELDS];

// Perenual-specific types
export interface WateringBenchmark {
  value: string;
  unit: string;
}

export interface PlantDimensions {
  type: string;
  min_value: number;
  max_value: number;
  unit: string;
}

export interface HardinessLocation {
  full_url: string;
  full_iframe: string;
}

export interface PlantImage {
  license: number;
  license_name: string;
  license_url: string;
  original_url: string;
  regular_url: string;
  medium_url: string;
  small_url: string;
  thumbnail: string;
}

export interface CareGuideSection {
  id: number;
  type: string;
  description: string;
}

export type PlantSpeciesRow = {
  slug: string;
  name: string;
  scientific_name: string | null;
  description: string | null;
  advice: string | null;
  category: string | null;
  sun_requirements: string | null;
  soil_type: string | null;
  plant_size: string | null;
  usda_zone_min: number | null;
  usda_zone_max: number | null;
  image_key?: string | null;
  name_en_aliases: string[] | null;
  search_terms: string[] | null;
  
  // Perenual identifiers
  perenual_id: number | null;
  perenual_common_name: string | null;
  perenual_scientific_name: string[] | null;
  perenual_other_names: string[] | null;
  perenual_family: string | null;
  
  // Growth & Care
  growth_rate: string | null;
  maintenance: string | null;
  watering: string | null;
  watering_general_benchmark: WateringBenchmark | null;
  watering_period: string | null;
  drought_tolerant: boolean;
  salt_tolerant: boolean;
  thorny: boolean;
  invasive: boolean;
  tropical: boolean;
  indoor: boolean;
  care_level: string | null;
  
  // Dimensions
  dimension: string | null;
  dimensions: PlantDimensions | null;
  average_height_cm: number | null;
  maximum_height_cm: number | null;
  average_spread_cm: number | null;
  maximum_spread_cm: number | null;
  
  // Environmental preferences
  sunlight: string[] | null;
  soil: string[] | null;
  hardiness_min: number | null;
  hardiness_max: number | null;
  hardiness_location: HardinessLocation | null;
  
  // Flowering & Visual
  flowers: boolean;
  flowering_season: string | null;
  flower_color: string | null;
  cones: boolean;
  fruits: boolean;
  edible_fruit: boolean;
  edible_fruit_taste_profile: string | null;
  fruit_nutritional_value: string | null;
  fruit_color: string[] | null;
  harvest_season: string | null;
  harvest_method: string | null;
  leaf: boolean;
  leaf_color: string[] | null;
  edible_leaf: boolean;
  edible_leaf_taste_profile: string | null;
  leaf_nutritional_value: string | null;
  cuisine: boolean;
  cuisine_list: string | null;
  medicinal: boolean;
  medicinal_use: string | null;
  medicinal_method: string | null;
  
  // Toxicity
  poisonous_to_humans: number;
  poisonous_to_pets: number;
  poison_effects_to_humans: string | null;
  poison_effects_to_pets: string | null;
  poison_to_humans_cure: string | null;
  poison_to_pets_cure: string | null;
  
  // Wildlife
  attracts: string[] | null;
  pest_susceptibility: string[] | null;
  pest_susceptibility_api: string | null;
  
  // Propagation
  propagation: string[] | null;
  seeds: number;
  
  // Images
  perenual_default_image: PlantImage | null;
  perenual_other_images: string[] | null;
  
  // Care guides
  care_guides: CareGuideSection[] | null;
  
  // Sync metadata
  perenual_last_synced_at: string | null;

  // Companion planting
  companions_with: string[] | null;
  companions_avoid: string[] | null;

  // Rotation
  rotation_group: string | null;

  // Maturity
  days_to_maturity_min: number | null;
  days_to_maturity_max: number | null;
  maturity_basis: string | null;
  maturity_notes: string | null;
} & {
  [K in keyof typeof PLANT_SPECIES_LANGUAGE_FIELDS]: string | null;
};

export interface PlantSpecies {
  slug: string;
  name: string;
  scientificName: string | null;
  imageKey?: string | null;
  description: string | null;
  advice: string | null;
  category: string | null;
  sunRequirements: string | null;
  soilType: string | null;
  plantSize: string | null;
  usdaZoneMin: number | null;
  usdaZoneMax: number | null;
  aliases: string[];
  translations: Partial<Record<PlantSpeciesLanguageCode, string>>;
  searchTerms: string[];
  
  // Perenual identifiers
  perenualId: number | null;
  perenualFamily: string | null;
  otherNames: string[];
  
  // Growth & Care
  growthRate: string | null;
  maintenance: string | null;
  watering: string | null;
  wateringBenchmark: WateringBenchmark | null;
  wateringPeriod: string | null;
  droughtTolerant: boolean;
  saltTolerant: boolean;
  thorny: boolean;
  invasive: boolean;
  tropical: boolean;
  indoor: boolean;
  careLevel: string | null;
  
  // Dimensions
  dimension: string | null;
  dimensions: PlantDimensions | null;
  averageHeightCm: number | null;
  maximumHeightCm: number | null;
  averageSpreadCm: number | null;
  maximumSpreadCm: number | null;
  
  // Environmental preferences
  sunlight: string[];
  soil: string[];
  hardinessMin: number | null;
  hardinessMax: number | null;
  
  // Flowering & Visual
  flowers: boolean;
  floweringSeason: string | null;
  flowerColor: string | null;
  cones: boolean;
  fruits: boolean;
  edibleFruit: boolean;
  edibleFruitTasteProfile: string | null;
  fruitNutritionalValue: string | null;
  fruitColor: string[];
  harvestSeason: string | null;
  harvestMethod: string | null;
  leaf: boolean;
  leafColor: string[];
  edibleLeaf: boolean;
  edibleLeafTasteProfile: string | null;
  leafNutritionalValue: string | null;
  cuisine: boolean;
  cuisineList: string | null;
  medicinal: boolean;
  medicinalUse: string | null;
  medicinalMethod: string | null;
  
  // Toxicity (critical for safety)
  poisonousToHumans: number;
  poisonousToPets: number;
  poisonEffectsToHumans: string | null;
  poisonEffectsToPets: string | null;
  poisonToHumansCure: string | null;
  poisonToPetsCure: string | null;
  
  // Wildlife
  attracts: string[];
  pestSusceptibility: string[];
  
  // Propagation
  propagation: string[];
  seeds: number;
  
  // Images
  perenualImage: PlantImage | null;
  
  // Care guides
  careGuides: CareGuideSection[];
  
  // Sync metadata
  perenualLastSyncedAt: string | null;
  
  // Custom/community species fields (for user-contributed species not in main database)
  isCustomSpecies?: boolean;
  suggestionCount?: number;
  wikiUrl?: string | null;
  wikiImageUrl?: string | null;
  wikiImageLicense?: string | null;
  edibleParts?: string[] | null;
  propagationMethods?: string[] | null;

  // Companion planting
  companionsWith: string[];
  companionsAvoid: string[];

  // Rotation
  rotationGroup: string | null;

  // Maturity
  daysToMaturityMin: number | null;
  daysToMaturityMax: number | null;
  maturityBasis: string | null;
  maturityNotes: string | null;
}

export interface PlantSpeciesSearchResponse {
  species: PlantSpecies[];
  total: number;
}

export interface PlantSpeciesCategoriesResponse {
  categories: string[];
}

export function serializePlantSpecies(row: PlantSpeciesRow): PlantSpecies {
  const translations: Partial<Record<PlantSpeciesLanguageCode, string>> = {};

  (Object.keys(PLANT_SPECIES_LANGUAGE_FIELDS) as Array<keyof typeof PLANT_SPECIES_LANGUAGE_FIELDS>)
    .forEach((fieldKey) => {
      const value = row[fieldKey];
      if (value) {
        translations[PLANT_SPECIES_LANGUAGE_FIELDS[fieldKey]] = value;
      }
    });

  return {
    slug: row.slug,
    name: row.name,
    scientificName: row.scientific_name,
    imageKey: row.image_key ?? null,
    description: row.description,
    advice: row.advice,
    category: row.category,
    sunRequirements: row.sun_requirements,
    soilType: row.soil_type,
    plantSize: row.plant_size,
    usdaZoneMin: row.usda_zone_min,
    usdaZoneMax: row.usda_zone_max,
    aliases: row.name_en_aliases ?? [],
    translations,
    searchTerms: row.search_terms ?? [],
    
    // Perenual identifiers
    perenualId: row.perenual_id,
    perenualFamily: row.perenual_family,
    otherNames: row.perenual_other_names ?? [],
    
    // Growth & Care
    growthRate: row.growth_rate,
    maintenance: row.maintenance,
    watering: row.watering,
    wateringBenchmark: row.watering_general_benchmark,
    wateringPeriod: row.watering_period,
    droughtTolerant: row.drought_tolerant ?? false,
    saltTolerant: row.salt_tolerant ?? false,
    thorny: row.thorny ?? false,
    invasive: row.invasive ?? false,
    tropical: row.tropical ?? false,
    indoor: row.indoor ?? false,
    careLevel: row.care_level,
    
    // Dimensions
    dimension: row.dimension,
    dimensions: row.dimensions,
    averageHeightCm: row.average_height_cm,
    maximumHeightCm: row.maximum_height_cm,
    averageSpreadCm: row.average_spread_cm,
    maximumSpreadCm: row.maximum_spread_cm,
    
    // Environmental preferences
    sunlight: row.sunlight ?? [],
    soil: row.soil ?? [],
    hardinessMin: row.hardiness_min,
    hardinessMax: row.hardiness_max,
    
    // Flowering & Visual
    flowers: row.flowers ?? false,
    floweringSeason: row.flowering_season,
    flowerColor: row.flower_color,
    cones: row.cones ?? false,
    fruits: row.fruits ?? false,
    edibleFruit: row.edible_fruit ?? false,
    edibleFruitTasteProfile: row.edible_fruit_taste_profile,
    fruitNutritionalValue: row.fruit_nutritional_value,
    fruitColor: row.fruit_color ?? [],
    harvestSeason: row.harvest_season,
    harvestMethod: row.harvest_method,
    leaf: row.leaf ?? true,
    leafColor: row.leaf_color ?? [],
    edibleLeaf: row.edible_leaf ?? false,
    edibleLeafTasteProfile: row.edible_leaf_taste_profile,
    leafNutritionalValue: row.leaf_nutritional_value,
    cuisine: row.cuisine ?? false,
    cuisineList: row.cuisine_list,
    medicinal: row.medicinal ?? false,
    medicinalUse: row.medicinal_use,
    medicinalMethod: row.medicinal_method,
    
    // Toxicity
    poisonousToHumans: row.poisonous_to_humans ?? 0,
    poisonousToPets: row.poisonous_to_pets ?? 0,
    poisonEffectsToHumans: row.poison_effects_to_humans,
    poisonEffectsToPets: row.poison_effects_to_pets,
    poisonToHumansCure: row.poison_to_humans_cure,
    poisonToPetsCure: row.poison_to_pets_cure,
    
    // Wildlife
    attracts: row.attracts ?? [],
    pestSusceptibility: row.pest_susceptibility ?? [],
    
    // Propagation
    propagation: row.propagation ?? [],
    seeds: row.seeds ?? 0,
    
    // Images
    perenualImage: row.perenual_default_image,
    
    // Care guides
    careGuides: row.care_guides ?? [],
    
    // Sync metadata
    perenualLastSyncedAt: row.perenual_last_synced_at,

    // Companion planting
    companionsWith: row.companions_with ?? [],
    companionsAvoid: row.companions_avoid ?? [],

    // Rotation
    rotationGroup: row.rotation_group ?? null,

    // Maturity
    daysToMaturityMin: row.days_to_maturity_min ?? null,
    daysToMaturityMax: row.days_to_maturity_max ?? null,
    maturityBasis: row.maturity_basis ?? null,
    maturityNotes: row.maturity_notes ?? null,
  };
}
