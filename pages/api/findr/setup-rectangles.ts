import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../lib/supabase/serverClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = getSupabaseServerClient();
    
    console.log('Starting ICES rectangles setup...');
    
    // First, let's check if the tables already exist
    const { data: existingTables, error: tableCheckError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['ices_rectangles', 'findr_rectangles']);
    
    if (tableCheckError) {
      console.log('Could not check existing tables (this is ok):', tableCheckError.message);
    }
    
    console.log('Existing tables:', existingTables);
    
    // Create the tables by inserting data (Supabase will auto-create if schema is in place)
    // First try to insert some sample data to see if tables exist
    const sampleRectangles = [
      { rectangle_code: '20C5', region: 'Portuguese Coast', center_lat: 37.5, center_lon: -7.5, distance_to_shore_km: 1.6 },
      { rectangle_code: '21C6', region: 'Portuguese Coast', center_lat: 37.5, center_lon: -8.5, distance_to_shore_km: 1.4 },
      { rectangle_code: '21D7', region: 'Galician Coast', center_lat: 42.5, center_lon: -8.0, distance_to_shore_km: 0.9 }
    ];
    
    // Try to insert into ices_rectangles
    console.log('Attempting to create/populate ices_rectangles...');
    const { data: icesData, error: icesError } = await supabase
      .from('ices_rectangles')
      .upsert(sampleRectangles, { 
        onConflict: 'rectangle_code',
        ignoreDuplicates: true 
      })
      .select();
    
    if (icesError) {
      console.log('ICES rectangles table may not exist, error:', icesError.message);
    } else {
      console.log('Successfully inserted into ices_rectangles:', icesData?.length || 0, 'records');
    }
    
    // Try to insert into findr_rectangles
    console.log('Attempting to create/populate findr_rectangles...');
    const { data: findrData, error: findrError } = await supabase
      .from('findr_rectangles')
      .upsert(sampleRectangles, { 
        onConflict: 'rectangle_code',
        ignoreDuplicates: true 
      })
      .select();
    
    if (findrError) {
      console.log('Findr rectangles table may not exist, error:', findrError.message);
    } else {
      console.log('Successfully inserted into findr_rectangles:', findrData?.length || 0, 'records');
    }
    
    // Test the rectangles API endpoint
    console.log('Testing rectangles API...');
    const response = await fetch(`${req.headers.origin || 'http://localhost:3001'}/api/findr/rectangles`);
    const apiResult = await response.json();
    
    return res.status(200).json({
      message: 'ICES rectangles setup attempted',
      icesError: icesError?.message || null,
      findrError: findrError?.message || null,
      icesInserted: icesData?.length || 0,
      findrInserted: findrData?.length || 0,
      apiTest: {
        status: response.status,
        result: apiResult
      }
    });
    
  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({ 
      error: 'Setup failed', 
      details: (error as Error).message 
    });
  }
}