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
  return (
    <span>
      The ISS will be visible tonight from {range} for about {minutes} minutes.
    </span>
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
    const { maxPerNight = 2, minGapMinutes = 45, darknessBufferSec = 1800 } = opts || {};
    const url = `/api/iss-visible?lat=${lat}&lon=${lon}&bestOnly=true&maxPerNight=${maxPerNight}&minGapMinutes=${minGapMinutes}&darknessBufferSec=${darknessBufferSec}`;

    setLoading(true);
    setError(null);
    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async r => {
        // Always parse JSON, even if not ok
        let json: any = {};
        try {
          json = await r.json();
        } catch {}
        let results: IssResult[] = json.results || [];
        // Filter to only sightings during night (between sunset and next sunrise)
        if (sunsetISO && sunriseISO) {
          const sunset = new Date(sunsetISO).getTime();
          const sunrise = new Date(sunriseISO).getTime();
          results = results.filter(sighting => {
            const risetime = new Date(sighting.risetimeISO).getTime();
            if (sunrise > sunset) {
              return risetime >= sunset && risetime <= sunrise;
            } else {
              return risetime >= sunset;
            }
          });
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
