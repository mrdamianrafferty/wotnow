// pages/api/fishing/predictions-mock.ts
// Mock fishing predictions API for testing without Supabase

import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { lat, lon, language = 'en' } = req.query
  const latitude = parseFloat(lat as string)
  const longitude = parseFloat(lon as string)

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Mock weather data for Asturias
  const mockWeather = {
    seaTemp: 16.5,
    windSpeedKnots: 8,
    windDirection: 230,
    waveHeight: 0.8,
    pressure: 1018,
    visibility: 8000,
    conditions: 'good',
    safetyWarnings: []
  }

  // Mock tidal data
  const mockTidal = {
    currentPhase: 'rising',
    nextHighTide: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    nextLowTide: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    tidalStrength: 'moderate',
    minutesToTideChange: 120,
    favorable: true
  }

  // Mock species data based on your CSV
  const mockPredictions = [
    {
      rank: 1,
      species: language === 'es' ? 'Lubina' : 'Sea Bass',
      scientificName: 'Dicentrarchus labrax',
      baseProbability: 65.4,
      weatherAdjustedProbability: 78.2,
      weatherImpact: 1.2,
      gear: ['spinning', 'bait', 'lures'],
      confidence: 85,
      advice: [
        {
          type: "perfect_timing",
          text: language === 'es' 
            ? "🎯 PERFECTO AHORA: Marea subiendo - ideal para lubina"
            : "🎯 PERFECT NOW: Rising tide - ideal for sea bass"
        },
        {
          type: "bait_recommendation", 
          text: language === 'es'
            ? "🪱 Mejor carnada: Cangrejo, gusana roja (agua templada - perfecta actividad)"
            : "🪱 Best bait: Crab, ragworm (warm water - perfect activity)"
        },
        {
          type: "location_depth",
          text: language === 'es'
            ? "📍 Ubicación: Líneas de rompiente, estuarios, cabos rocosos; 1-10 m"
            : "📍 Location: Surf lines, estuaries, rocky headlands; 1-10 m"
        }
      ],
      detailedAdvice: {
        timing: {
          best_time: "Dawn/dusk; warm months. Night over clean surf or estuary edges in summer.",
          tide_sensitivity: "Strong; best on flooding (mid–late flood) and first of the ebb around structure."
        },
        baits: {
          primary: "Crab, rag/lugworm, sandeel",
          natural_diet: "small fish; hunts sprats, prawns, shore crabs",
          full_description: "Crab, rag/lugworm, sandeel, small fish; hunts sprats, prawns, shore crabs."
        },
        environmental: {
          temperature_effects: "Active ≥12–13 °C; slows in cold spells; peak June–Oct in many regions.",
          weather_effects: "Feeds after onshore blow that stirs crabs/sandeels; too much swell/silt reduces success.",
          depth_info: "Surf lines, estuaries, rocky headlands; 1–10 m; often within casting range."
        },
        practical: {
          edibility_score: 9,
          restrictions: "Bag limits & seasonal rules common; typical EU/UK MLS ~42 cm—verify locally.",
          authority: "Check national authority (e.g., UK IFCA/MMO; Ireland SFPA; Spain MAPA; France OFB).",
          context: "Shore"
        },
        conservation: {
          status: "IUCN: LC (global). North‑East Atlantic stocks tightly managed; observe local bag/season rules.",
          fun_fact: "Roman elites farmed sea bass in coastal ponds; a VIP fish since antiquity."
        },
        species_specific: {
          eating_quality: 9,
          night_fishing: true,
          seasonal: true,
          depth_range: "1-10m"
        }
      }
    },
    {
      rank: 2,
      species: language === 'es' ? 'Caballa' : 'Mackerel',
      scientificName: 'Scomber scombrus',
      baseProbability: 58.7,
      weatherAdjustedProbability: 64.1,
      weatherImpact: 1.09,
      gear: ['feathers', 'spinning', 'bait'],
      confidence: 78,
      advice: [
        {
          type: "tidal_timing",
          text: language === 'es'
            ? "🌊 Marea: En cardúmenes durante luz del día ✅ (Favorable ahora)"
            : "🌊 Tide: Daylight when shoals are in ✅ (Favorable now)"
        },
        {
          type: "bait_recommendation",
          text: language === 'es'
            ? "🪱 Mejor carnada: Plumas, pequeños señuelos"
            : "🪱 Best bait: Feathers, small lures"
        }
      ],
      detailedAdvice: {
        timing: {
          best_time: "Daylight when shoals are in; dawn/evening peaks in summer.",
          tide_sensitivity: "Moderate; follows baitfish movements more than tidal phase."
        },
        baits: {
          primary: "Feathers, small lures, strip baits",
          natural_diet: "small schooling fish, zooplankton",
          full_description: "Feathers, small lures, strip baits; feeds on small schooling fish, zooplankton."
        },
        environmental: {
          temperature_effects: "Active in warming water; peak summer months.",
          weather_effects: "Calm conditions help locate shoals; avoid during storms.",
          depth_info: "Shoals close to piers/headlands; middle depths 5–20 m."
        },
        practical: {
          edibility_score: 8,
          restrictions: "Few formal restrictions; local rules may apply.",
          authority: "Check local fishing regulations",
          context: "Pier/Shore"
        },
        conservation: {
          status: "IUCN: LC (global). North‑East Atlantic stocks fluctuate; follow local advice.",
          fun_fact: "Can swim at speeds up to 32 mph when chasing prey in schools."
        },
        species_specific: {
          eating_quality: 8,
          night_fishing: false,
          seasonal: true,
          depth_range: "5-20m"
        }
      }
    },
    {
      rank: 3,
      species: language === 'es' ? 'Sargo' : 'Sea Bream',
      scientificName: 'Sparus aurata',
      baseProbability: 45.2,
      weatherAdjustedProbability: 52.8,
      weatherImpact: 1.17,
      gear: ['bottom', 'float', 'bait'],
      confidence: 72,
      advice: [
        {
          type: "bait_recommendation",
          text: language === 'es'
            ? "🪱 Mejor carnada: Gusana, cebo de fondo"
            : "🪱 Best bait: Ragworm, bottom baits"
        },
        {
          type: "eating_quality",
          text: language === 'es'
            ? "🍽️ Excelente para comer (9/10)"
            : "🍽️ Excellent eating (9/10)"
        }
      ],
      detailedAdvice: {
        timing: {
          best_time: "Dawn and dusk; warmer months preferred.",
          tide_sensitivity: "Moderate; feeds more actively during tide changes."
        },
        baits: {
          primary: "Ragworm, prawn, small crab",
          natural_diet: "crustaceans, mollusks, marine worms",
          full_description: "Ragworm, prawn, small crab; feeds on crustaceans, mollusks, marine worms."
        },
        environmental: {
          temperature_effects: "Prefers warmer water; most active 15-22°C.",
          weather_effects: "Calm conditions preferred; avoids rough surf.",
          depth_info: "Rocky areas, mixed ground; 2-15m depth typically."
        },
        practical: {
          edibility_score: 9,
          restrictions: "Size limits common; check local MLS.",
          authority: "Regional fishing authorities",
          context: "Shore/Boat"
        },
        conservation: {
          status: "IUCN: LC (global). Heavily managed in the Med; observe bag and size limits.",
          fun_fact: "Gilthead bream can change sex from male to female as they mature."
        },
        species_specific: {
          eating_quality: 9,
          night_fishing: false,
          seasonal: true,
          depth_range: "2-15m"
        }
      }
    }
  ]

  const response = {
    success: true,
    location: {
      lat: latitude,
      lon: longitude,
      nearestRectangle: 'MOCK_31F2'
    },
    weather: {
      ...mockWeather,
      tidal: mockTidal
    },
    predictions: mockPredictions,
    timestamp: new Date().toISOString(),
    cacheDuration: 900
  }

  res.setHeader('Cache-Control', 'public, max-age=60') // Short cache for testing
  res.status(200).json(response)
}
