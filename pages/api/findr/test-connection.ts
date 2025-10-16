import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../lib/supabase/serverClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabaseServerClient();
    
    // Test 1: Check if we can connect
    const { data: _testData, error: testError } = await supabase
      .from('ices_rectangles')
      .select('rectangle_code')
      .limit(1)
      .single();
    
    if (testError) {
      return res.status(500).json({
        test: 'database_connection',
        success: false,
        error: testError,
      });
    }
    
    // Test 2: Check if function exists
    const { data: funcData, error: funcError } = await supabase
      .rpc('get_environmental_predictions_basic', {
        p_rectangle_code: '31F1',
        p_date: '2025-10-16',
      });
    
    if (funcError) {
      return res.status(500).json({
        test: 'function_call',
        success: false,
        error: {
          code: funcError.code,
          message: funcError.message,
          details: funcError.details,
          hint: funcError.hint,
        },
      });
    }
    
    return res.status(200).json({
      test: 'all_tests',
      success: true,
      database_connected: true,
      function_exists: true,
      sample_prediction_count: Array.isArray(funcData) ? funcData.length : 0,
      first_prediction: Array.isArray(funcData) && funcData.length > 0 ? funcData[0] : null,
    });
    
  } catch (error) {
    return res.status(500).json({
      test: 'catch_block',
      success: false,
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
  }
}
