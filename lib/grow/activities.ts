// Activity structure and categories for the gardening weather app

export interface ActivityType {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  isWaterActivity: boolean;
  weatherFactors: {
    temperature: { min?: number; max?: number; optimal?: number };
    precipitation: { max?: number; min?: number }; // mm/hour
    windSpeed: { min?: number; max?: number; optimal?: number }; // km/h
    cloudCover: { max?: number; min?: number }; // percentage
    humidity: { min?: number; max?: number };
    uvIndex: { min?: number; max?: number };
    visibility: { min?: number }; // km
    soilTemp?: { min?: number; max?: number }; // C
    frostRisk?: boolean; // true if frost is bad
  };
}

// The full set of gardening activity categories
export const mainCategories = [
  {
    key: "Planting & Sowing",
    icon: "🌱",
    subcategories: [
      {
        key: "Seeds & Seedlings",
        icon: "🌾",
        acts: [
          "direct_sowing",
          "transplanting_seedlings",
          "starting_seeds_indoors",
          "starting_seeds_outdoors",
          "planting_vegetable_starts",
          "planting_herb_starts",
        ],
      },
      {
        key: "Trees & Shrubs",
        icon: "🌳",
        acts: [
          "planting_trees",
          "planting_shrubs",
          "planting_roses",
          "planting_fruit_trees",
          "planting_berry_bushes",
        ],
      },
      {
        key: "Flowers & Bulbs",
        icon: "🌷",
        acts: [
          "planting_annuals",
          "planting_perennials",
          "planting_bulbs",
          "planting_container_flowers",
          "deadheading_flowers",
        ],
      },
    ],
  },
  {
    key: "Garden Maintenance",
    icon: "🪴",
    subcategories: [
      {
        key: "Watering",
        icon: "💧",
        acts: [
          "watering_garden",
          "watering_containers",
          "installing_drip_irrigation",
          "hand_watering",
          "deep_watering_trees",
        ],
      },
      {
        key: "Weeding & Mulching",
        icon: "🌿",
        acts: [
          "weeding",
          "hand_weeding",
          "mulching",
          "sheet_mulching",
          "composting_weeds",
        ],
      },
      {
        key: "Pruning & Trimming",
        icon: "✂️",
        acts: [
          "pruning_roses",
          "pruning_fruit_trees",
          "trimming_hedges",
          "deadheading",
          "thinning_seedlings",
          "pruning_perennials",
        ],
      },
    ],
  },
  {
    key: "Soil & Composting",
    icon: "🪱",
    subcategories: [
      {
        key: "Soil Care",
        icon: "🏜️",
        acts: [
          "tilling_soil",
          "amending_soil",
          "testing_soil",
          "aerating_lawn",
          "building_raised_beds",
        ],
      },
      {
        key: "Composting",
        icon: "♻️",
        acts: [
          "turning_compost",
          "building_compost_pile",
          "worm_composting",
          "collecting_kitchen_scraps",
          "applying_compost",
        ],
      },
    ],
  },
  {
    key: "Lawn Care",
    icon: "🌾",
    subcategories: [
      {
        key: "Mowing & Edging",
        icon: "🚜",
        acts: [
          "mowing_lawn",
          "edging_lawn",
          "trimming_grass",
          "raking_lawn",
        ],
      },
      {
        key: "Lawn Treatment",
        icon: "🌱",
        acts: [
          "fertilizing_lawn",
          "seeding_lawn",
          "aerating_lawn",
          "dethatching_lawn",
          "treating_lawn_pests",
        ],
      },
    ],
  },
  {
    key: "Harvesting",
    icon: "🧺",
    subcategories: [
      {
        key: "Vegetables",
        icon: "🥕",
        acts: [
          "harvesting_tomatoes",
          "harvesting_leafy_greens",
          "harvesting_root_vegetables",
          "harvesting_squash",
          "harvesting_beans_peas",
        ],
      },
      {
        key: "Fruits & Herbs",
        icon: "🍓",
        acts: [
          "harvesting_berries",
          "harvesting_tree_fruit",
          "harvesting_herbs",
          "harvesting_flowers",
          "collecting_seeds",
        ],
      },
    ],
  },
  {
    key: "Pest & Disease Control",
    icon: "🐛",
    subcategories: [
      {
        key: "Pest Management",
        icon: "🦗",
        acts: [
          "applying_organic_pesticides",
          "handpicking_pests",
          "installing_pest_barriers",
          "companion_planting",
          "beneficial_insect_release",
        ],
      },
      {
        key: "Disease Prevention",
        icon: "🍄",
        acts: [
          "treating_fungal_diseases",
          "removing_diseased_plants",
          "applying_preventive_sprays",
          "improving_air_circulation",
        ],
      },
    ],
  },
  {
    key: "Specialty Gardening",
    icon: "🌸",
    subcategories: [
      {
        key: "Container & Indoor",
        icon: "🪴",
        acts: [
          "container_gardening",
          "indoor_plant_care",
          "potting_plants",
          "repotting",
          "balcony_gardening",
        ],
      },
      {
        key: "Specialized Gardens",
        icon: "🏡",
        acts: [
          "greenhouse_gardening",
          "vertical_gardening",
          "raised_bed_gardening",
          "hydroponic_gardening",
          "square_foot_gardening",
        ],
      },
    ],
  },
  {
    key: "Garden Design & Planning",
    icon: "📐",
    subcategories: [
      {
        key: "Design Work",
        icon: "✏️",
        acts: [
          "garden_planning",
          "landscape_design",
          "creating_garden_beds",
          "installing_pathways",
          "building_trellises",
        ],
      },
      {
        key: "Infrastructure",
        icon: "🛠️",
        acts: [
          "building_raised_beds",
          "installing_irrigation",
          "building_cold_frames",
          "constructing_greenhouse",
          "making_garden_structures",
        ],
      },
    ],
  },
];

// No water activities for gardening, but keeping structure for compatibility
export const waterActivityIds: string[] = [];

// Detailed activity definitions with weather preferences for gardening
export const activityTypes: Record<string, ActivityType> = {
  // Seeds & Seedlings
  direct_sowing: {
    id: "direct_sowing",
    name: "Direct Sowing Seeds",
    category: "Planting & Sowing",
    subcategory: "Seeds & Seedlings",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 10, max: 25, optimal: 18 },
      precipitation: { max: 1 },
      windSpeed: { max: 15 },
      cloudCover: { max: 80 },
      humidity: { min: 40, max: 85 },
      uvIndex: { max: 8 },
      visibility: { min: 5 },
      frostRisk: true
    }
  },
  transplanting_seedlings: {
    id: "transplanting_seedlings",
    name: "Transplanting Seedlings",
    category: "Planting & Sowing",
    subcategory: "Seeds & Seedlings",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 12, max: 25, optimal: 18 },
      precipitation: { max: 0.5 },
      windSpeed: { max: 20 },
      cloudCover: { min: 30, max: 90 }, // Prefer some cloud cover to reduce transplant shock
      humidity: { min: 50, max: 90 },
      uvIndex: { max: 7 },
      visibility: { min: 8 },
      frostRisk: true
    }
  },
  starting_seeds_indoors: {
    id: "starting_seeds_indoors",
    name: "Starting Seeds Indoors",
    category: "Planting & Sowing",
    subcategory: "Seeds & Seedlings",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: -20, max: 45 }, // Indoor activity
      precipitation: { max: 100 },
      windSpeed: { max: 100 },
      cloudCover: { max: 100 },
      humidity: { max: 100 },
      uvIndex: { max: 12 },
      visibility: { min: 0 }
    }
  },

  // Trees & Shrubs
  planting_trees: {
    id: "planting_trees",
    name: "Planting Trees",
    category: "Planting & Sowing",
    subcategory: "Trees & Shrubs",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 5, max: 25, optimal: 15 },
      precipitation: { max: 2 },
      windSpeed: { max: 25 },
      cloudCover: { max: 90 },
      humidity: { min: 40, max: 90 },
      uvIndex: { max: 8 },
      visibility: { min: 5 },
      frostRisk: false // Can plant in early spring
    }
  },
  planting_fruit_trees: {
    id: "planting_fruit_trees",
    name: "Planting Fruit Trees",
    category: "Planting & Sowing",
    subcategory: "Trees & Shrubs",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 5, max: 22, optimal: 15 },
      precipitation: { max: 2 },
      windSpeed: { max: 25 },
      cloudCover: { max: 85 },
      humidity: { min: 40, max: 85 },
      uvIndex: { max: 8 },
      visibility: { min: 5 },
      frostRisk: false
    }
  },

  // Flowers & Bulbs
  planting_annuals: {
    id: "planting_annuals",
    name: "Planting Annual Flowers",
    category: "Planting & Sowing",
    subcategory: "Flowers & Bulbs",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 12, max: 28, optimal: 20 },
      precipitation: { max: 1 },
      windSpeed: { max: 20 },
      cloudCover: { max: 80 },
      humidity: { min: 40, max: 85 },
      uvIndex: { max: 8 },
      visibility: { min: 5 },
      frostRisk: true
    }
  },
  planting_bulbs: {
    id: "planting_bulbs",
    name: "Planting Bulbs",
    category: "Planting & Sowing",
    subcategory: "Flowers & Bulbs",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 0, max: 18, optimal: 10 },
      precipitation: { max: 3 },
      windSpeed: { max: 30 },
      cloudCover: { max: 95 },
      humidity: { min: 30, max: 90 },
      uvIndex: { max: 8 },
      visibility: { min: 3 },
      frostRisk: false
    }
  },
  deadheading_flowers: {
    id: "deadheading_flowers",
    name: "Deadheading Flowers",
    category: "Planting & Sowing",
    subcategory: "Flowers & Bulbs",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 10, max: 32, optimal: 22 },
      precipitation: { max: 0.5 },
      windSpeed: { max: 25 },
      cloudCover: { max: 85 },
      humidity: { max: 85 },
      uvIndex: { max: 9 },
      visibility: { min: 5 }
    }
  },

  // Watering
  watering_garden: {
    id: "watering_garden",
    name: "Watering Garden",
    category: "Garden Maintenance",
    subcategory: "Watering",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 5, max: 40, optimal: 20 },
      precipitation: { max: 0.5 }, // Don't water if it's raining
      windSpeed: { max: 20 }, // Too much wind wastes water
      cloudCover: { min: 20, max: 100 }, // Better to water when not in full sun
      humidity: { max: 85 },
      uvIndex: { max: 9 },
      visibility: { min: 3 }
    }
  },
  hand_watering: {
    id: "hand_watering",
    name: "Hand Watering",
    category: "Garden Maintenance",
    subcategory: "Watering",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 5, max: 35, optimal: 22 },
      precipitation: { max: 0.5 },
      windSpeed: { max: 25 },
      cloudCover: { min: 20, max: 90 },
      humidity: { max: 85 },
      uvIndex: { max: 9 },
      visibility: { min: 5 }
    }
  },

  // Weeding & Mulching
  weeding: {
    id: "weeding",
    name: "Weeding",
    category: "Garden Maintenance",
    subcategory: "Weeding & Mulching",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 5, max: 32, optimal: 20 },
      precipitation: { min: 0.5, max: 3 }, // Easier after rain when soil is moist
      windSpeed: { max: 25 },
      cloudCover: { max: 90 },
      humidity: { min: 40, max: 90 },
      uvIndex: { max: 9 },
      visibility: { min: 3 }
    }
  },
  mulching: {
    id: "mulching",
    name: "Mulching",
    category: "Garden Maintenance",
    subcategory: "Weeding & Mulching",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 0, max: 30, optimal: 18 },
      precipitation: { max: 1 },
      windSpeed: { max: 20 }, // Wind can blow mulch around
      cloudCover: { max: 90 },
      humidity: { max: 85 },
      uvIndex: { max: 9 },
      visibility: { min: 5 }
    }
  },

  // Pruning & Trimming
  pruning_roses: {
    id: "pruning_roses",
    name: "Pruning Roses",
    category: "Garden Maintenance",
    subcategory: "Pruning & Trimming",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 0, max: 25, optimal: 12 },
      precipitation: { max: 1 },
      windSpeed: { max: 25 },
      cloudCover: { max: 90 },
      humidity: { max: 85 },
      uvIndex: { max: 8 },
      visibility: { min: 5 },
      frostRisk: false
    }
  },
  pruning_fruit_trees: {
    id: "pruning_fruit_trees",
    name: "Pruning Fruit Trees",
    category: "Garden Maintenance",
    subcategory: "Pruning & Trimming",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: -5, max: 20, optimal: 10 },
      precipitation: { max: 2 },
      windSpeed: { max: 30 },
      cloudCover: { max: 95 },
      humidity: { max: 90 },
      uvIndex: { max: 8 },
      visibility: { min: 3 },
      frostRisk: false
    }
  },
  trimming_hedges: {
    id: "trimming_hedges",
    name: "Trimming Hedges",
    category: "Garden Maintenance",
    subcategory: "Pruning & Trimming",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 5, max: 30, optimal: 20 },
      precipitation: { max: 1 },
      windSpeed: { max: 25 },
      cloudCover: { max: 85 },
      humidity: { max: 85 },
      uvIndex: { max: 9 },
      visibility: { min: 5 }
    }
  },

  // Soil Care
  tilling_soil: {
    id: "tilling_soil",
    name: "Tilling Soil",
    category: "Soil & Composting",
    subcategory: "Soil Care",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 5, max: 28, optimal: 18 },
      precipitation: { max: 0.5 }, // Soil should be dry enough to work
      windSpeed: { max: 30 },
      cloudCover: { max: 90 },
      humidity: { max: 80 },
      uvIndex: { max: 9 },
      visibility: { min: 5 }
    }
  },
  amending_soil: {
    id: "amending_soil",
    name: "Amending Soil",
    category: "Soil & Composting",
    subcategory: "Soil Care",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 0, max: 30, optimal: 15 },
      precipitation: { max: 1 },
      windSpeed: { max: 25 },
      cloudCover: { max: 90 },
      humidity: { max: 85 },
      uvIndex: { max: 9 },
      visibility: { min: 5 }
    }
  },
  building_raised_beds: {
    id: "building_raised_beds",
    name: "Building Raised Beds",
    category: "Soil & Composting",
    subcategory: "Soil Care",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 5, max: 32, optimal: 20 },
      precipitation: { max: 1 },
      windSpeed: { max: 30 },
      cloudCover: { max: 90 },
      humidity: { max: 85 },
      uvIndex: { max: 9 },
      visibility: { min: 5 }
    }
  },

  // Composting
  turning_compost: {
    id: "turning_compost",
    name: "Turning Compost",
    category: "Soil & Composting",
    subcategory: "Composting",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 0, max: 32, optimal: 18 },
      precipitation: { max: 2 },
      windSpeed: { max: 30 },
      cloudCover: { max: 95 },
      humidity: { max: 90 },
      uvIndex: { max: 9 },
      visibility: { min: 3 }
    }
  },
  applying_compost: {
    id: "applying_compost",
    name: "Applying Compost",
    category: "Soil & Composting",
    subcategory: "Composting",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 5, max: 30, optimal: 18 },
      precipitation: { max: 1 },
      windSpeed: { max: 20 },
      cloudCover: { max: 90 },
      humidity: { max: 85 },
      uvIndex: { max: 9 },
      visibility: { min: 5 }
    }
  },

  // Lawn Care - Mowing & Edging
  mowing_lawn: {
    id: "mowing_lawn",
    name: "Mowing Lawn",
    category: "Lawn Care",
    subcategory: "Mowing & Edging",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 8, max: 32, optimal: 22 },
      precipitation: { max: 0.5 }, // Don't mow wet grass
      windSpeed: { max: 25 },
      cloudCover: { max: 90 },
      humidity: { max: 85 },
      uvIndex: { max: 9 },
      visibility: { min: 5 }
    }
  },
  edging_lawn: {
    id: "edging_lawn",
    name: "Edging Lawn",
    category: "Lawn Care",
    subcategory: "Mowing & Edging",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 8, max: 32, optimal: 20 },
      precipitation: { max: 0.5 },
      windSpeed: { max: 25 },
      cloudCover: { max: 85 },
      humidity: { max: 85 },
      uvIndex: { max: 9 },
      visibility: { min: 5 }
    }
  },

  // Lawn Treatment
  fertilizing_lawn: {
    id: "fertilizing_lawn",
    name: "Fertilizing Lawn",
    category: "Lawn Care",
    subcategory: "Lawn Treatment",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 10, max: 28, optimal: 18 },
      precipitation: { min: 0, max: 0.5 }, // Light rain after is good
      windSpeed: { max: 15 }, // Low wind to prevent drift
      cloudCover: { max: 90 },
      humidity: { min: 40, max: 85 },
      uvIndex: { max: 8 },
      visibility: { min: 5 }
    }
  },
  seeding_lawn: {
    id: "seeding_lawn",
    name: "Seeding Lawn",
    category: "Lawn Care",
    subcategory: "Lawn Treatment",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 10, max: 25, optimal: 18 },
      precipitation: { max: 1 },
      windSpeed: { max: 15 },
      cloudCover: { max: 85 },
      humidity: { min: 50, max: 85 },
      uvIndex: { max: 8 },
      visibility: { min: 5 },
      frostRisk: true
    }
  },

  // Harvesting - Vegetables
  harvesting_tomatoes: {
    id: "harvesting_tomatoes",
    name: "Harvesting Tomatoes",
    category: "Harvesting",
    subcategory: "Vegetables",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 10, max: 35, optimal: 22 },
      precipitation: { max: 1 },
      windSpeed: { max: 25 },
      cloudCover: { max: 85 },
      humidity: { max: 85 },
      uvIndex: { max: 10 },
      visibility: { min: 5 }
    }
  },
  harvesting_leafy_greens: {
    id: "harvesting_leafy_greens",
    name: "Harvesting Leafy Greens",
    category: "Harvesting",
    subcategory: "Vegetables",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 5, max: 28, optimal: 18 },
      precipitation: { max: 1 },
      windSpeed: { max: 25 },
      cloudCover: { max: 90 },
      humidity: { max: 85 },
      uvIndex: { max: 9 },
      visibility: { min: 5 }
    }
  },

  // Harvesting - Fruits & Herbs
  harvesting_berries: {
    id: "harvesting_berries",
    name: "Harvesting Berries",
    category: "Harvesting",
    subcategory: "Fruits & Herbs",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 12, max: 32, optimal: 22 },
      precipitation: { max: 0.5 },
      windSpeed: { max: 20 },
      cloudCover: { max: 80 },
      humidity: { max: 85 },
      uvIndex: { max: 9 },
      visibility: { min: 5 }
    }
  },
  harvesting_herbs: {
    id: "harvesting_herbs",
    name: "Harvesting Herbs",
    category: "Harvesting",
    subcategory: "Fruits & Herbs",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 10, max: 32, optimal: 22 },
      precipitation: { max: 0.5 },
      windSpeed: { max: 25 },
      cloudCover: { max: 85 },
      humidity: { max: 85 },
      uvIndex: { max: 9 },
      visibility: { min: 5 }
    }
  },

  // Pest Management
  applying_organic_pesticides: {
    id: "applying_organic_pesticides",
    name: "Applying Organic Pesticides",
    category: "Pest & Disease Control",
    subcategory: "Pest Management",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 10, max: 28, optimal: 20 },
      precipitation: { max: 0 }, // Need dry conditions
      windSpeed: { max: 10 }, // Very low wind to prevent drift
      cloudCover: { min: 30, max: 90 }, // Avoid full sun for some sprays
      humidity: { min: 40, max: 80 },
      uvIndex: { max: 7 },
      visibility: { min: 8 }
    }
  },
  handpicking_pests: {
    id: "handpicking_pests",
    name: "Handpicking Pests",
    category: "Pest & Disease Control",
    subcategory: "Pest Management",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 8, max: 32, optimal: 20 },
      precipitation: { max: 1 },
      windSpeed: { max: 30 },
      cloudCover: { max: 90 },
      humidity: { max: 90 },
      uvIndex: { max: 9 },
      visibility: { min: 5 }
    }
  },

  // Disease Prevention
  treating_fungal_diseases: {
    id: "treating_fungal_diseases",
    name: "Treating Fungal Diseases",
    category: "Pest & Disease Control",
    subcategory: "Disease Prevention",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 10, max: 28, optimal: 20 },
      precipitation: { max: 0 },
      windSpeed: { max: 10 },
      cloudCover: { min: 20, max: 85 },
      humidity: { min: 40, max: 75 },
      uvIndex: { max: 7 },
      visibility: { min: 8 }
    }
  },

  // Container & Indoor
  container_gardening: {
    id: "container_gardening",
    name: "Container Gardening",
    category: "Specialty Gardening",
    subcategory: "Container & Indoor",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 10, max: 32, optimal: 22 },
      precipitation: { max: 2 },
      windSpeed: { max: 30 },
      cloudCover: { max: 90 },
      humidity: { max: 85 },
      uvIndex: { max: 9 },
      visibility: { min: 3 }
    }
  },
  indoor_plant_care: {
    id: "indoor_plant_care",
    name: "Indoor Plant Care",
    category: "Specialty Gardening",
    subcategory: "Container & Indoor",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: -20, max: 45 }, // Indoor activity
      precipitation: { max: 100 },
      windSpeed: { max: 100 },
      cloudCover: { max: 100 },
      humidity: { max: 100 },
      uvIndex: { max: 12 },
      visibility: { min: 0 }
    }
  },

  // Specialized Gardens
  greenhouse_gardening: {
    id: "greenhouse_gardening",
    name: "Greenhouse Gardening",
    category: "Specialty Gardening",
    subcategory: "Specialized Gardens",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: -10, max: 40, optimal: 20 },
      precipitation: { max: 100 }, // Protected
      windSpeed: { max: 100 }, // Protected
      cloudCover: { max: 100 },
      humidity: { max: 100 },
      uvIndex: { max: 12 },
      visibility: { min: 0 }
    }
  },
  vertical_gardening: {
    id: "vertical_gardening",
    name: "Vertical Gardening",
    category: "Specialty Gardening",
    subcategory: "Specialized Gardens",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 10, max: 32, optimal: 22 },
      precipitation: { max: 1 },
      windSpeed: { max: 25 },
      cloudCover: { max: 85 },
      humidity: { max: 85 },
      uvIndex: { max: 9 },
      visibility: { min: 5 }
    }
  },

  // Design Work
  garden_planning: {
    id: "garden_planning",
    name: "Garden Planning",
    category: "Garden Design & Planning",
    subcategory: "Design Work",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: -20, max: 45 }, // Can be done indoors
      precipitation: { max: 100 },
      windSpeed: { max: 100 },
      cloudCover: { max: 100 },
      humidity: { max: 100 },
      uvIndex: { max: 12 },
      visibility: { min: 0 }
    }
  },
  creating_garden_beds: {
    id: "creating_garden_beds",
    name: "Creating Garden Beds",
    category: "Garden Design & Planning",
    subcategory: "Design Work",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 5, max: 30, optimal: 18 },
      precipitation: { max: 1 },
      windSpeed: { max: 30 },
      cloudCover: { max: 90 },
      humidity: { max: 85 },
      uvIndex: { max: 9 },
      visibility: { min: 5 }
    }
  },

  // Infrastructure
  installing_irrigation: {
    id: "installing_irrigation",
    name: "Installing Irrigation",
    category: "Garden Design & Planning",
    subcategory: "Infrastructure",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 8, max: 32, optimal: 20 },
      precipitation: { max: 0.5 },
      windSpeed: { max: 25 },
      cloudCover: { max: 85 },
      humidity: { max: 85 },
      uvIndex: { max: 9 },
      visibility: { min: 5 }
    }
  },
  building_cold_frames: {
    id: "building_cold_frames",
    name: "Building Cold Frames",
    category: "Garden Design & Planning",
    subcategory: "Infrastructure",
    isWaterActivity: false,
    weatherFactors: {
      temperature: { min: 0, max: 25, optimal: 15 },
      precipitation: { max: 1 },
      windSpeed: { max: 30 },
      cloudCover: { max: 90 },
      humidity: { max: 85 },
      uvIndex: { max: 8 },
      visibility: { min: 5 }
    }
  },
};

// Helper function to get all activity IDs
export const getAllActivityIds = (): string[] => {
  const allIds: string[] = [];
  mainCategories.forEach(category => {
    category.subcategories.forEach(subcategory => {
      allIds.push(...subcategory.acts);
    });
  });
  return allIds;
};

// Helper function to get activity by ID
export const getActivityById = (id: string): ActivityType | undefined => {
  return activityTypes[id];
};

// Helper function to get activities by category
export const getActivitiesByCategory = (categoryKey: string): string[] => {
  const category = mainCategories.find(cat => cat.key === categoryKey);
  if (!category) return [];
  
  const allIds: string[] = [];
  category.subcategories.forEach(subcategory => {
    allIds.push(...subcategory.acts);
  });
  return allIds;
};

// Helper function to get water activities (none for gardening)
export const getWaterActivities = (): string[] => {
  return waterActivityIds;
};

// Helper function to check if activity is water-based
export const isWaterActivity = (activityId: string): boolean => {
  return waterActivityIds.includes(activityId);
};