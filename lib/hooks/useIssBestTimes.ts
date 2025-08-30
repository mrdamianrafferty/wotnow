// Helper to format local time range
function formatLocalRange(startISO: string, endISO: string) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const fmt = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${fmt.format(start)}–${fmt.format(end)}`;
}

/**
 * ISS sighting paragraph component
 * Sits below other text paragraphs, only shown if there is a sighting tonight
 */
import React, { useEffect, useState } from "react";

type IssResult = {
  risetimeISO: string;
  endtimeISO: string;
  durationSec: number;
  nightWindow: { startISO: string; endISO: string };
};

export function IssSightingNote({ data }: { data: IssResult[] | null }) {
  if (!data || data.length === 0) return null;
  // Show only the first sighting for tonight
  const first = data[0];
  const range = formatLocalRange(first.risetimeISO, first.endtimeISO);
  const minutes = Math.round(first.durationSec / 60);
  return React.createElement(
    "span",
    null,
    `The ISS will be visible tonight from ${range} for about ${minutes} minutes.`
  );
}

export function useIssBestTimes(
  lat?: number,
  lon?: number,
  sunsetISO?: string,
  sunriseISO?: string,
  opts?: {
    maxPerNight?: number;
    minGapMinutes?: number;
    darknessBufferSec?: number;
  }
) {
  const [data, setData] = useState<IssResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lat == null || lon == null) return;
    const controller = new AbortController();
    
    // Build URL for iss-next-night-pass endpoint
    let url = `/api/iss-next-night-pass?lat=${lat}&lon=${lon}`;
    if (sunsetISO) url += `&sunsetISO=${sunsetISO}`;
    if (sunriseISO) url += `&nextSunriseISO=${sunriseISO}`;

    setLoading(true);
    setError(null);
    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async r => {
        // Always parse JSON, even if not ok
        let json: any = {};
        try {
          json = await r.json();
        } catch {}
        
        // Convert the response format from iss-next-night-pass to match our expected format
        let results: IssResult[] = [];
        if (json.ok && json.pass) {
          const pass = json.pass;
          const risetimeISO = pass.risetime;
          // Calculate end time based on duration
          const risetime = new Date(risetimeISO);
          const endtime = new Date(risetime.getTime() + (pass.duration * 1000));
          
          results = [{
            risetimeISO,
            endtimeISO: endtime.toISOString(),
            durationSec: pass.duration,
            nightWindow: {
              startISO: json.sunset,
              endISO: json.nextSunrise
            }
          }];
        }
        
        setData(results);
        if (!r.ok) setError(json.error || `ISS API: ${r.status}`);
      })
      .catch(e => {
        if (e.name !== "AbortError") setError(e.message || "Failed to load ISS times");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [lat, lon, sunsetISO, sunriseISO, opts?.maxPerNight, opts?.minGapMinutes, opts?.darknessBufferSec]);

  return { data, loading, error };
}
