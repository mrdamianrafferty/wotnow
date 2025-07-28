"use client";
import { useEffect, useState } from "react";
import type { OWMForecastSlot, MarineRow } from "./types";
import dayjs from "dayjs";

/**
 * Fetches OpenWeather and Stormglass marine data using Next.js API routes.
 * Always uses /api/marine for marine data requests from the frontend.
 */
export function useForecastData(mainLat?: number, mainLon?: number, coastalLat?: number, coastalLon?: number) {
  const [slots, setSlots] = useState<OWMForecastSlot[]>([]);
  const [marine, setMarine] = useState<MarineRow[][]>([[], [], [], [], []]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // OpenWeather
    if (mainLat && mainLon) {
      fetch(`/api/owm?lat=${mainLat}&lon=${mainLon}&units=metric`)
        .then(r => r.json())
        .then(d => setSlots(d.list as OWMForecastSlot[]))
        .catch(() => setSlots([]));
    } else {
      setSlots([]);
    }

    // Always use /api/marine for marine data
    if (coastalLat && coastalLon) {
      fetch(`/api/marine?lat=${coastalLat}&lon=${coastalLon}`)
        .then(r => r.json())
        .then(d => {
          const rows: MarineRow[] = mapStormglass(d);
          const grouped: MarineRow[][] = [[], [], [], [], []];
          rows.forEach(r => {
            const diff = dayjs(r.iso).startOf("day")
              .diff(dayjs().startOf("day"), "day");
            if (diff >= 0 && diff < 5) grouped[diff].push(r);
          });
          setMarine(grouped);
        })
        .catch(() => setMarine([[], [], [], [], []]))
        .finally(() => setLoading(false));
    } else {
      setMarine([[], [], [], [], []]);
      setLoading(false);
    }
  }, [mainLat, mainLon, coastalLat, coastalLon]);

  return { slots, marine, loading };
}

function mapStormglass(json: any): MarineRow[] {
  const hours: any[] = json.hours ?? [];
  return hours.map((h: any) => {
    const iso = h.time as string;
    const local = new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const pick = (p: string) => Number(h[p]?.sg ?? h[p]?.noaa ?? 0);

    const water = pick("waterTemperature");
    const classify = (v: number) =>
      v < 15
        ? "very-cold"
        : v < 18
          ? "cold"
          : v < 20
            ? "cool"
            : v < 24
              ? "comfort"
              : v < 28
                ? "warm"
                : "hot";

    return {
      iso,
      local,
      water,
      className: classify(water),
      wave: pick("waveHeight"),
      wind: pick("windSpeed"),
      gust: pick("windGusts"),
      swell: pick("swellHeight"),
      swellDir: pick("swellDirection"),
      period: Math.round(pick("swellPeriod")),
      vis: Math.round(pick("visibility")),
      current: pick("currentSpeed").toFixed(1),
    } as MarineRow;
  });
}

import { useForecastData } from "../lib/useForecastData";

export default function WeatherPage({ mainLocation }) {
  // Always call the hook, even if mainLocation is undefined
  const { slots, marine, loading } = useForecastData(mainLocation?.lat, mainLocation?.lon);

  // ...rest of your component...
}