// pages/api/debug-database.ts
// Targeted test for your specific database setup

import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

type UnknownRecord = Record<string, unknown>

type ConnectionCheck = {
  success: boolean
  error?: string
}

type DebugResults = {
  connection: ConnectionCheck | null
  icesRectangles: {
    exists: boolean
    count: number
    sample?: UnknownRecord[]
    error?: string
    asturiasNearby?: UnknownRecord[]
  } | null
  species: {
    exists: boolean
    count: number
    sample?: UnknownRecord[]
    hasAdvice: boolean
    hasSpanishNames: boolean
    error?: string
  } | null
  speciesStaging: {
    exists: boolean
    count: number
    sample?: UnknownRecord
    error?: string
  } | null
  asturiasCoverage: {
    rectanglesFound: number
    nearestRectangle: UnknownRecord | null
    error?: string
  } | null
  recommendations: string[]
  overallStatus?: {
    readyForPredictions: boolean
    nextSteps: string[]
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 Testing your specific database setup...')
    
    // Use your current environment variables
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                       process.env.SUPABASE_ANON_KEY || 
                       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      res.status(500).json({
        error: 'Supabase credentials are missing',
        details: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon key) before running this check.'
      })
      return
    }

    console.log('Config check:')
    console.log('- URL:', supabaseUrl?.substring(0, 30) + '...')
    console.log('- Key type:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon')

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const results: DebugResults = {
      connection: null,
      icesRectangles: null,
      species: null,
      speciesStaging: null,
      asturiasCoverage: null,
      recommendations: []
    }

    // Test 1: Basic connection
    console.log('📡 Testing basic connection...')
    try {
      const { error } = await supabase.from('ices_rectangles').select('count').limit(1)
      results.connection = { success: !error, error: error?.message }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.connection = { success: false, error: message }
    }

    // Test 2: ICES Rectangles data (you have the table)
    console.log('🗺️ Checking ICES rectangles...')
    try {
      const { data: rectangles, error } = await supabase
        .from('ices_rectangles')
        .select('rectangle_code, region, center_lat, center_lon, is_coastal')
        .order('rectangle_code')
        .limit(10)

      results.icesRectangles = {
        exists: !error,
        count: rectangles?.length || 0,
        sample: rectangles?.slice(0, 3),
        error: error?.message,
        asturiasNearby: rectangles?.filter(r => 
          r.center_lat >= 42 && r.center_lat <= 45 && 
          r.center_lon >= -8 && r.center_lon <= -3
        ) || []
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.icesRectangles = { exists: false, count: 0, error: message }
    }

    // Test 3: Species table (main production table)
    console.log('🐟 Checking species table...')
    try {
      const { data: species, error } = await supabase
        .from('species')
        .select('scientific_name, name_en, name_es, advice, conservation_status')
        .limit(5)

      results.species = {
        exists: !error,
        count: species?.length || 0,
        sample: species?.slice(0, 2),
        hasAdvice: species?.some(s => s.advice && Object.keys(s.advice).length > 0) || false,
        hasSpanishNames: species?.some(s => s.name_es) || false,
        error: error?.message
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.species = { exists: false, count: 0, hasAdvice: false, hasSpanishNames: false, error: message }
    }

    // Test 4: Species staging tables (your CSV import tables)
    console.log('📊 Checking species staging tables...')
    try {
      const { data: staging, error } = await supabase
        .from('species_advice_staging_clean')
        .select('scientific_name, species, conservation_status, fun_fact')
        .limit(3)

      results.speciesStaging = {
        exists: !error,
        count: staging?.length || 0,
        sample: staging?.[0],
        error: error?.message
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.speciesStaging = { exists: false, count: 0, error: message, sample: undefined }
    }

    // Test 5: Test Asturias coordinates specifically
    console.log('📍 Testing Asturias area coverage...')
    const asturiasLat = 43.5322
    const asturiasLon = -5.6611
    
    try {
      const { data: nearbyRects, error } = await supabase
        .from('ices_rectangles')
        .select('rectangle_code, region, center_lat, center_lon')
        .gte('lat_south', asturiasLat - 1)
        .lte('lat_north', asturiasLat + 1)
        .gte('lon_west', asturiasLon - 2)
        .lte('lon_east', asturiasLon + 2)
        .eq('is_coastal', true)
        .limit(5)

      results.asturiasCoverage = {
        rectanglesFound: nearbyRects?.length || 0,
        nearestRectangle: nearbyRects?.[0] || null,
        error: error?.message || undefined
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.asturiasCoverage = { rectanglesFound: 0, nearestRectangle: null, error: message }
    }

    // Generate recommendations based on what we found
    if (!results.connection?.success) {
      results.recommendations.push('❌ Basic connection failed - check environment variables')
    }
    
    if (!results.icesRectangles?.exists) {
      results.recommendations.push('❌ ICES rectangles table not accessible')
    } else if (results.icesRectangles?.count === 0) {
      results.recommendations.push('⚠️ ICES rectangles table empty - need to populate with data')
    } else {
      results.recommendations.push(`✅ ICES rectangles working (${results.icesRectangles?.count} found)`)
    }

    if (!results.species?.exists) {
      results.recommendations.push('❌ Species table not accessible - may need service role key')
    } else if (results.species?.count === 0) {
      results.recommendations.push('⚠️ Species table empty - run CSV integration SQL')
    } else if (!results.species?.hasAdvice) {
      results.recommendations.push('⚠️ Species table lacks advice data - complete CSV integration')
    } else {
      results.recommendations.push(`✅ Species table working with advice (${results.species?.count} species)`)
    }

    if (results.speciesStaging?.exists && (results.speciesStaging?.count ?? 0) > 0) {
      results.recommendations.push(`📊 Staging data available (${results.speciesStaging?.count ?? 0} entries) - ready for integration`)
    }

    if (results.asturiasCoverage?.rectanglesFound === 0) {
      results.recommendations.push('⚠️ No ICES coverage for Asturias area - may need more rectangle data')
    } else {
      results.recommendations.push(`✅ Asturias area covered (${results.asturiasCoverage.rectanglesFound} rectangles)`)
    }

    // Overall status
    const canMakePredictions = 
      Boolean(results.connection?.success) && 
      (results.icesRectangles?.count ?? 0) > 0 && 
      (results.species?.count ?? 0) > 0 &&
      (results.asturiasCoverage?.rectanglesFound ?? 0) > 0

    results.overallStatus = {
      readyForPredictions: canMakePredictions,
      nextSteps: canMakePredictions ? 
        ['🚀 Ready to test fishing predictions!'] :
        ['🔧 Fix the issues above first']
    }

    console.log('✅ Database test completed')
    
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      environment: {
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasStormglassKey: !!process.env.STORMGLASS_SECRET_KEY,
        nodeEnv: process.env.NODE_ENV
      }
    })

  } catch (error) {
    console.error('❌ Database test failed:', error)
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    res.status(500).json({
      error: 'Database test failed',
      details: message,
      stack: stack?.split('\n').slice(0, 5) // First 5 lines only
    })
  }
}