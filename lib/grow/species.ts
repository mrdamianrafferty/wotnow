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

export type PlantSpeciesRow = {
  slug: string;
  name: string;
  scientific_name: string | null;
  category: string | null;
  sun_requirements: string | null;
  soil_type: string | null;
  plant_size: string | null;
  usda_zone_min: number | null;
  usda_zone_max: number | null;
  name_en_aliases: string[] | null;
  search_terms: string[] | null;
} & {
  [K in keyof typeof PLANT_SPECIES_LANGUAGE_FIELDS]: string | null;
};

export interface PlantSpecies {
  slug: string;
  name: string;
  scientificName: string | null;
  category: string | null;
  sunRequirements: string | null;
  soilType: string | null;
  plantSize: string | null;
  usdaZoneMin: number | null;
  usdaZoneMax: number | null;
  aliases: string[];
  translations: Partial<Record<PlantSpeciesLanguageCode, string>>;
  searchTerms: string[];
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
    category: row.category,
    sunRequirements: row.sun_requirements,
    soilType: row.soil_type,
    plantSize: row.plant_size,
    usdaZoneMin: row.usda_zone_min,
    usdaZoneMax: row.usda_zone_max,
    aliases: row.name_en_aliases ?? [],
    translations,
    searchTerms: row.search_terms ?? [],
  };
}
