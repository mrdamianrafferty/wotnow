import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseServerClient } from '../../lib/supabase/serverClient'

interface TestSupabaseResponse {
  success: boolean
  supabaseUrl: string | null
  usingServiceRole: boolean
  canQuerySpecies: boolean
  error?: string
}

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<TestSupabaseResponse>
) {
  try {
    const supabase = getSupabaseServerClient()
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || null
    const usingServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

    const { data, error } = await supabase
      .from('species')
      .select('species_code')
      .limit(1)

    if (error) {
      res.status(200).json({
        success: false,
        supabaseUrl,
        usingServiceRole,
        canQuerySpecies: false,
        error: error.message,
      })
      return
    }

    res.status(200).json({
      success: true,
      supabaseUrl,
      usingServiceRole,
      canQuerySpecies: Array.isArray(data) && data.length > 0,
    })
  } catch (error) {
    res.status(200).json({
      success: false,
      supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || null,
      usingServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      canQuerySpecies: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
