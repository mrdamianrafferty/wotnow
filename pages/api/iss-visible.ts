import type { NextApiRequest, NextApiResponse } from 'next';

// Types
interface NightWindow {
  startISO: string;
  endISO: string;
}

interface IssPass {
  risetimeISO: string;
  endtimeISO: string;
  durationSec: number;
  nightWindow: NightWindow;
  source: "open-notify" | "prediction";
}

interface IssVisibleResponse {
  ok: boolean;
  results: IssPass[];
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<IssVisibleResponse>) {
  const { 
    lat, 
    lon, 
    bestOnly = 'true', 
    maxPerNight = '2', 
    minGapMinutes = '45',
    darknessBufferSec = '1800', 
    nights = '4'
  } = req.query;

  // Validate required parameters
  if (!lat || !lon) {
    return res.status(400).json({ 
      ok: false, 
      results: [],
      error: 'Missing required parameters: lat and lon are required' 
    });
  }

  try {
    // Convert parameters
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    const wantBestOnly = (bestOnly as string) === 'true';
    const maxPassesPerNight = parseInt(maxPerNight as string, 10);
    const minGapMin = parseInt(minGapMinutes as string, 10);
    const darknessBuffer = parseInt(darknessBufferSec as string, 10);
    const numNights = Math.min(Math.max(parseInt(nights as string, 10), 1), 7); // Limit to 1-7 nights
    
    // Validate parameter formats
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ 
        ok: false, 
        results: [],
        error: 'Invalid parameters: lat and lon must be numbers' 
      });
    }

    // Calculate night windows for each night
    // For this demo, we'll use a simplified approach to generate night windows
    // In a real implementation, you'd use actual sunset/sunrise calculations
    const nightWindows = [];
    const now = new Date();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < numNights; i++) {
      const date = new Date(now.getTime() + i * MS_PER_DAY);
      date.setHours(20, 0, 0, 0); // Simplified sunset time (8 PM)
      const sunsetTime = date.getTime();
      
      date.setHours(6, 0, 0, 0); // Simplified sunrise time next day (6 AM)
      date.setDate(date.getDate() + 1);
      const sunriseTime = date.getTime();
      
      nightWindows.push({
        startISO: new Date(sunsetTime + darknessBuffer * 1000).toISOString(),
        endISO: new Date(sunriseTime - darknessBuffer * 1000).toISOString()
      });
    }

    // Call the Open Notify API to get ISS pass predictions
    const apiUrl = `http://api.open-notify.org/iss-pass.json?lat=${latitude}&lon=${longitude}&alt=0&n=100`;
    
    const response = await fetch(apiUrl, { cache: 'no-store' });
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        ok: false, 
        results: [],
        error: `Open Notify API error: ${response.status}` 
      });
    }

    const data = await response.json();
    
    if (!data?.response || !Array.isArray(data.response)) {
      return res.status(502).json({ 
        ok: false, 
        results: [],
        error: 'Unexpected response format from Open Notify API' 
      });
    }

    // Process each night window
    let allVisiblePasses: IssPass[] = [];
    
    nightWindows.forEach(window => {
      const windowStart = new Date(window.startISO).getTime();
      const windowEnd = new Date(window.endISO).getTime();
      
      // Filter passes that occur during this night window
      const nightPasses = data.response
        .filter((pass: any) => {
          const passStartTime = pass.risetime * 1000; // Convert from Unix timestamp to milliseconds
          const passEndTime = passStartTime + (pass.duration * 1000);
          
          // Pass must start during the night window
          return passStartTime >= windowStart && passStartTime <= windowEnd;
        })
        .map((pass: any) => {
          const passStartTime = pass.risetime * 1000;
          const passEndTime = passStartTime + (pass.duration * 1000);
          
          return {
            risetimeISO: new Date(passStartTime).toISOString(),
            endtimeISO: new Date(passEndTime).toISOString(),
            durationSec: pass.duration,
            nightWindow: window,
            source: "open-notify" as const
          };
        });
      
      if (wantBestOnly) {
        // If best only, sort by duration (longer passes are usually higher in the sky and better visible)
        const sortedPasses = [...nightPasses].sort((a, b) => b.durationSec - a.durationSec);
        
        // Take only the requested number of passes per night, respecting minimum gap
        const bestPasses: IssPass[] = [];
        let lastPassTime = 0;
        
        for (const pass of sortedPasses) {
          const passTime = new Date(pass.risetimeISO).getTime();
          
          // Ensure minimum gap between passes
          if (bestPasses.length === 0 || (passTime - lastPassTime) >= (minGapMin * 60 * 1000)) {
            bestPasses.push(pass);
            lastPassTime = passTime;
            
            // Stop once we have enough passes for this night
            if (bestPasses.length >= maxPassesPerNight) break;
          }
        }
        
        allVisiblePasses = [...allVisiblePasses, ...bestPasses];
      } else {
        // If not best only, include all passes
        allVisiblePasses = [...allVisiblePasses, ...nightPasses];
      }
    });

    // Sort all passes by time
    allVisiblePasses.sort((a, b) => {
      return new Date(a.risetimeISO).getTime() - new Date(b.risetimeISO).getTime();
    });

    res.status(200).json({
      ok: true,
      results: allVisiblePasses
    });
    
  } catch (error: any) {
    console.error('Error in ISS visible API:', error);
    res.status(500).json({ 
      ok: false, 
      results: [],
      error: error?.message || 'Internal server error' 
    });
  }
}
