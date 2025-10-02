// pages/api/fishing/predictions.ts
// Fix your existing API to use the working RPC function + enhance with CSV advice

import { NextApiRequest, NextApiResponse } from 'next'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '../../../lib/supabase/serverClient'
import { getWeatherForFishingWithTides, getTidalAdviceContext } from '../../../lib/weather/stormglass'
import {
  getRectangleDayKey,
  normalizeRectangleRow,
  resolveAnchorFromRectangle,
  type IcesRectangleRow,
} from '../../../lib/weather/rectangleAnchors'

interface AdviceItem {
  type: string
  text: string
}

interface SpeciesAdviceBaits {
  primary?: string
  secondary?: string[]
  [key: string]: unknown
}

interface SpeciesAdviceTiming {
  best_time?: string
  [key: string]: unknown
}

interface SpeciesAdviceData {
  baits?: SpeciesAdviceBaits | null
  timing?: SpeciesAdviceTiming | null
  [key: string]: unknown
}

interface TidalInfo {
  currentPhase: string
  nextHighTide?: string
  nextLowTide?: string
  tidalStrength: string
  minutesToTideChange: number
  favorable: boolean
}

interface FishingPrediction {
  rank: number
  species: string
  scientificName: string
  baseProbability: number
  weatherAdjustedProbability: number
  weatherImpact: number
  gear: string[]
  confidence: number
  advice: AdviceItem[]
  detailedAdvice?: Record<string, unknown> | null
}

interface APIResponse {
  success: boolean
  location: {
    lat: number
    lon: number
    nearestRectangle: string
    anchor?: {
      lat: number
      lon: number
      source: string
    }
  }
  weather: {
    seaTemp: number
    windSpeedKnots: number
    windDirection: number
    waveHeight: number
    pressure: number
    visibility: number
    conditions: string
    safetyWarnings: string[]
    tidal?: TidalInfo
  }
  predictions: FishingPrediction[]
  timestamp: string
  cacheDuration: number
}

interface DatabasePrediction {
  species_name: string
  scientific_name: string
  probability: number
  gear: string[]
  confidence: number
  advice: AdviceItem[]
  species_code: string
}

interface Species {
  species_code: string
  tide_sensitivity: number
  temperature_sensitivity: number
  wind_sensitivity: number
  pressure_sensitivity: number
  optimal_temp_min?: number
  optimal_temp_max?: number
  optimal_wind_max?: number
  advice?: SpeciesAdviceData | null
  conservation_status?: string
  fun_fact?: string
  eating_quality?: number
}

interface TidalContext {
  favorableTide: boolean
  tidalAdvice: string[]
  urgency: 'low' | 'medium' | 'high'
}

interface WeatherWithTides {
  seaTemp: number
  windSpeedKnots: number
  windDirection: number
  waveHeight: number
  pressure: number
  visibility: number
  conditions: string
  safetyWarnings: string[]
  tides: {
    currentPhase: 'rising' | 'falling' | 'high_slack' | 'low_slack'
    nextHigh: { time: string; height: number } | null
    nextLow: { time: string; height: number } | null
    timeToNextChange: number
    currentStrength: 'weak' | 'moderate' | 'strong'
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = getSupabaseServerClient()
    const { lat, lon, language = 'en' } = req.query

    // Validate coordinates
    const latitude = parseFloat(lat as string)
    const longitude = parseFloat(lon as string)
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' })
    }

    // Validate coordinates are in European waters
    if (latitude < 36 || latitude > 71 || longitude < -10 || longitude > 30) {
      return res.status(400).json({ error: 'Coordinates outside European coverage area' })
    }

    console.log(`Getting fishing predictions for ${latitude}, ${longitude} in ${language}`)

    // Step 1: Find nearest ICES rectangle
    const nearestRectangle = await findNearestICESRectangle(supabase, latitude, longitude)
    if (!nearestRectangle) {
      return res.status(404).json({ error: 'No fishing data available for this location' })
    }

    const rectangleAnchor = resolveAnchorFromRectangle(nearestRectangle)
    console.log('Resolved Stormglass anchor', {
      rectangle: rectangleAnchor.rectangleCode,
      lat: rectangleAnchor.anchorLat,
      lon: rectangleAnchor.anchorLon,
      source: rectangleAnchor.source,
    })
    const cacheDay = getRectangleDayKey()

    // Step 2: Get current marine weather + tides from Stormglass
    console.log('Fetching weather and tidal data from Stormglass...')
    const weather = await getWeatherForFishingWithTides(latitude, longitude, {
      rectangle: rectangleAnchor,
      anchorLat: rectangleAnchor.anchorLat,
      anchorLon: rectangleAnchor.anchorLon,
      cacheDay,
    })
    const tidalContext = getTidalAdviceContext(weather.tides)

    // Step 3: Use your EXISTING working RPC function
    console.log(`Getting predictions for rectangle ${nearestRectangle.rectangle_code}`)
    const { data: basePredictions, error: supabaseError } = await supabase
      .rpc('get_fishing_predictions', {  // <- Using your existing function
        rectangle_code_input: nearestRectangle.rectangle_code,
        user_language: language as string
      })

    if (supabaseError) {
      console.error('Supabase error:', supabaseError)
      return res.status(500).json({ error: 'Failed to get fishing predictions' })
    }

    if (!basePredictions?.length) {
      return res.status(404).json({ error: 'No fishing data available for this area' })
    }

    // Step 4: Get enhanced species details (your CSV advice data)
    const { data: speciesDetails } = await supabase
      .from('species')
      .select('*')
      .in('species_code', basePredictions.map((p: DatabasePrediction) => getSpeciesCode(p.scientific_name)))

    const speciesDetailsArray = (speciesDetails ?? []) as Species[]

    // Step 5: Apply weather modifications + enhance with CSV advice
    const weatherAdjustedPredictions = basePredictions.map((prediction: DatabasePrediction, index: number) => {
      const speciesCode = getSpeciesCode(prediction.scientific_name)
      const species = speciesDetailsArray.find(speciesRow => speciesRow.species_code === speciesCode)
      
      let weatherImpact = 1.0
      let advice: AdviceItem[] = []

      // Use existing advice from your working system
      if (prediction.advice && Array.isArray(prediction.advice)) {
        advice = [...prediction.advice]
      }

      // Enhance with your CSV advice data if available
      if (species?.advice) {
        advice = enhanceAdviceWithCSVData(advice, species, weather, tidalContext, language as string)
      } else {
        // Fallback to current conditions enhancement
        advice = enhanceAdviceWithCurrentConditions(advice, weather, tidalContext, language as string)
      }

      if (species) {
        weatherImpact = calculateWeatherImpactWithTides(species, weather, tidalContext)
      }

      const adjustedProbability = Math.min(1.0, prediction.probability * weatherImpact)

      return {
        rank: index + 1,
        species: prediction.species_name,
        scientificName: prediction.scientific_name,
        baseProbability: Math.round(prediction.probability * 1000) / 10,
        weatherAdjustedProbability: Math.round(adjustedProbability * 1000) / 10,
        weatherImpact: Math.round(weatherImpact * 100) / 100,
        gear: prediction.gear || [],
        confidence: Math.round(prediction.confidence * 100),
        advice,
        detailedAdvice: species?.advice || null // Include your CSV advice
      }
    })

    // Sort by weather-adjusted probability
    weatherAdjustedPredictions.sort((a: FishingPrediction, b: FishingPrediction) => b.weatherAdjustedProbability - a.weatherAdjustedProbability)

    // Update ranks after sorting
    weatherAdjustedPredictions.forEach((pred: FishingPrediction, index: number) => {
      pred.rank = index + 1
    })

    // Step 6: Cache the results in Supabase (optional)
    try {
      await cacheWeatherPredictions(supabase, nearestRectangle.id, weather, weatherAdjustedPredictions)
    } catch (error) {
      console.warn('Failed to cache predictions:', error)
    }

    const response: APIResponse = {
      success: true,
      location: {
        lat: latitude,
        lon: longitude,
        nearestRectangle: nearestRectangle.rectangle_code,
        anchor: {
          lat: rectangleAnchor.anchorLat,
          lon: rectangleAnchor.anchorLon,
          source: rectangleAnchor.source,
        },
      },
      weather: {
        seaTemp: weather.seaTemp,
        windSpeedKnots: weather.windSpeedKnots,
        windDirection: weather.windDirection,
        waveHeight: weather.waveHeight,
        pressure: weather.pressure,
        visibility: weather.visibility,
        conditions: weather.conditions,
        safetyWarnings: weather.safetyWarnings,
        tidal: {
          currentPhase: weather.tides.currentPhase,
          nextHighTide: weather.tides.nextHigh?.time,
          nextLowTide: weather.tides.nextLow?.time,
          tidalStrength: weather.tides.currentStrength,
          minutesToTideChange: weather.tides.timeToNextChange,
          favorable: tidalContext.favorableTide
        }
      },
      predictions: weatherAdjustedPredictions.slice(0, 10), // Top 10
      timestamp: new Date().toISOString(),
      cacheDuration: 900
    }

    // Set cache headers
    res.setHeader('Cache-Control', 'public, max-age=900')
    res.status(200).json(response)

  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    })
  }
}

/**
 * Enhance advice with your CSV data
 */
function enhanceAdviceWithCSVData(
  advice: AdviceItem[],
  species: Species,
  weather: WeatherWithTides,
  tidalContext: TidalContext,
  language: string
): AdviceItem[] {
  const enhanced = [...advice]
  
  // Add CSV-based advice
  if (species.advice?.baits?.primary) {
    enhanced.unshift({
      type: "csv_bait",
      text: language === 'es' 
        ? `🪱 Mejor carnada: ${species.advice.baits.primary}`
        : `🪱 Best bait: ${species.advice.baits.primary}`
    })
  }
  
  if (species.advice?.timing?.best_time) {
    enhanced.push({
      type: "csv_timing",
      text: language === 'es'
        ? `⏰ Mejor momento: ${species.advice.timing.best_time}`
        : `⏰ Best time: ${species.advice.timing.best_time}`
    })
  }
  
  if (typeof species.eating_quality === 'number' && species.eating_quality >= 8) {
    enhanced.push({
      type: "eating_quality",
      text: language === 'es'
        ? `🍽️ Excelente para comer (${species.eating_quality}/10)`
        : `🍽️ Excellent eating (${species.eating_quality}/10)`
    })
  }
  
  // Add urgent tidal timing advice at the top
  if (tidalContext.urgency === 'high' && tidalContext.favorableTide) {
    enhanced.unshift({
      type: "tidal_urgent",
      text: language === 'es' 
        ? `⏰ AHORA: ${tidalContext.tidalAdvice[0]}` 
        : `⏰ NOW: ${tidalContext.tidalAdvice[0]}`
    })
  }
  
  return enhanced.slice(0, 6) // Limit to 6 advice items
}

/**
 * Enhance advice with current conditions (fallback)
 */
function enhanceAdviceWithCurrentConditions(
  advice: AdviceItem[],
  weather: WeatherWithTides,
  tidalContext: TidalContext,
  language: string
): AdviceItem[] {
  const enhanced = [...advice]
  
  // Add urgent tidal timing advice at the top
  if (tidalContext.urgency === 'high' && tidalContext.favorableTide) {
    enhanced.unshift({
      type: "tidal_urgent",
      text: language === 'es' 
        ? `⏰ AHORA: ${tidalContext.tidalAdvice[0]}` 
        : `⏰ NOW: ${tidalContext.tidalAdvice[0]}`
    })
  }
  
  // Add safety warnings for dangerous conditions
  if (weather.conditions === 'dangerous') {
    enhanced.unshift({
      type: "safety_warning",
      text: language === 'es'
        ? '⚠️ Condiciones peligrosas - considera posponer'
        : '⚠️ Dangerous conditions - consider postponing'
    })
  }
  
  return enhanced.slice(0, 6)
}

/**
 * Calculate weather impact with tidal data
 */
function calculateWeatherImpactWithTides(
  species: Species, 
  weather: WeatherWithTides, 
  tidalContext: TidalContext
): number {
  let impact = 1.0
  
  // Base weather impact
  if (weather.conditions === 'excellent') impact *= 1.1
  else if (weather.conditions === 'dangerous') impact *= 0.2
  else if (weather.conditions === 'poor') impact *= 0.7
  
  // Tidal impact based on species sensitivity
  const tideSensitivity = species.tide_sensitivity || 0.5
  
  if (tidalContext.favorableTide) {
    impact *= (1 + tideSensitivity * 0.4) // Up to 40% boost
    
    if (tidalContext.urgency === 'high') {
      impact *= 1.25 // Additional 25% for perfect timing
    }
  } else if (weather.tides.currentPhase === 'high_slack' || weather.tides.currentPhase === 'low_slack') {
    impact *= (1 - tideSensitivity * 0.3) // Up to 30% reduction
  }
  
  return Math.max(0.1, Math.min(2.0, impact))
}

// Keep all your existing helper functions
async function findNearestICESRectangle(
  supabase: SupabaseClient,
  lat: number,
  lon: number
): Promise<IcesRectangleRow | null> {
  const { data, error } = await supabase
    .from('ices_rectangles')
    .select('*')
    .gte('lat_south', lat - 1)
    .lte('lat_north', lat + 1)
    .gte('lon_west', lon - 2)
    .lte('lon_east', lon + 2)
    .eq('is_coastal', true)
    .limit(10)

  if (error || !data?.length) {
    console.error('No ICES rectangles found:', error)
    return null
  }

  const rows = (data ?? []).map((row) => normalizeRectangleRow(row as Record<string, unknown>))

  let closest = rows[0]
  let minDistance = calculateDistance(lat, lon, closest.center_lat, closest.center_lon)

  for (const rectangle of rows.slice(1)) {
    const distance = calculateDistance(lat, lon, rectangle.center_lat, rectangle.center_lon)
    if (distance < minDistance) {
      minDistance = distance
      closest = rectangle
    }
  }

  return closest
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function getSpeciesCode(scientificName: string): string {
  const parts = scientificName.split(' ')
  if (parts.length >= 2) {
    return (parts[0].substring(0, 3) + parts[1].substring(0, 1)).toUpperCase()
  }
  return scientificName.substring(0, 3).toUpperCase()
}

async function cacheWeatherPredictions(
  supabase: SupabaseClient, 
  rectangleId: string, 
  weather: WeatherWithTides, 
  predictions: FishingPrediction[]
) {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

  for (const prediction of predictions.slice(0, 5)) {
    await supabase
      .from('weather_predictions')
      .upsert({
        rectangle_id: rectangleId,
        species_id: prediction.scientificName,
        prediction_date: new Date().toISOString().split('T')[0],
        sea_temp_c: weather.seaTemp,
        wind_speed_knots: Math.round(weather.windSpeedKnots),
        pressure_hpa: weather.pressure,
        adjusted_probability: prediction.weatherAdjustedProbability / 100,
        weather_modifier: prediction.weatherImpact,
        confidence: prediction.confidence / 100,
        expires_at: expiresAt.toISOString()
      }, {
        onConflict: 'rectangle_id,species_id,prediction_date'
      })
  }
}