// app/api/iss-next-night-pass/route.ts
import { NextRequest } from "next/server";

// N2YO API constants
const N2YO_API_URL = "https://api.n2yo.com/rest/v1/satellite/visualpasses";
const ISS_SAT_ID = 25544;
const DEFAULT_ALT = 0; // meters above sea level
const DEFAULT_DAYS = 2; // how many days ahead to check
const DEFAULT_MIN_VIS = 1; // minimum visibility in minutes

// Helper: fetch ISS passes for a location using N2YO
async function fetchIssPassesN2yo(lat: number, lon: number, alt: number, days: number, minVis: number, apiKey: string) {
  const url = `${N2YO_API_URL}/${ISS_SAT_ID}/${lat}/${lon}/${alt}/${days}/${minVis}?apiKey=${apiKey}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`N2YO error ${res.status}`);
  const data = await res.json();
  if (!data?.passes || !Array.isArray(data.passes)) throw new Error("Unexpected N2YO response");
  return data.passes.map((p: any) => ({
    risetime: new Date(p.startUTC * 1000),
    duration: p.duration,
    mag: p.mag,
    direction: p.direction,
    maxEl: p.maxEl,
    endUTC: new Date(p.endUTC * 1000),
  }));
}

// Helper: fetch sunrise/sunset for a location and date
async function fetchSunTimes(lat: number, lon: number, dateISO: string) {
  const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&date=${dateISO}&formatted=0`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Sunrise-Sunset error ${res.status}`);
  const j = await res.json();
  if (j.status !== "OK") throw new Error(`Sunrise-Sunset status: ${j.status}`);
  return {
    sunrise: new Date(j.results.sunrise),
    sunset: new Date(j.results.sunset),
  };
}

// Helper: is a time between sunset and next sunrise?
function isNight(risetime: Date, sunset: Date, nextSunrise: Date) {
  return risetime >= sunset && risetime <= nextSunrise;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get("lat"));
    const lon = Number(searchParams.get("lon"));
    const alt = Number(searchParams.get("alt")) || DEFAULT_ALT;
    const days = Number(searchParams.get("days")) || DEFAULT_DAYS;
    const minVis = Number(searchParams.get("minVis")) || DEFAULT_MIN_VIS;
    const apiKey = process.env.N2YO_API_KEY;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return Response.json({ error: "Please provide numeric ?lat= and ?lon=." }, { status: 400 });
    }
    if (!apiKey) {
      return Response.json({ error: "N2YO_API_KEY environment variable not set." }, { status: 500 });
    }
    // Get ISS passes for location from N2YO
    const passes = await fetchIssPassesN2yo(lat, lon, alt, days, minVis, apiKey);
    // Use sunsetISO and nextSunriseISO from query if provided, else fallback to today/tomorrow
    const sunsetISO = searchParams.get("sunsetISO");
    const nextSunriseISO = searchParams.get("nextSunriseISO");
    let sunset: Date, nextSunrise: Date;
    if (sunsetISO && !isNaN(Date.parse(sunsetISO))) {
      sunset = new Date(sunsetISO);
    } else {
      const today = new Date();
      const todayISO = today.toISOString().slice(0, 10);
      const sunToday = await fetchSunTimes(lat, lon, todayISO);
      sunset = sunToday.sunset;
    }
    if (nextSunriseISO && !isNaN(Date.parse(nextSunriseISO))) {
      nextSunrise = new Date(nextSunriseISO);
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowISO = tomorrow.toISOString().slice(0, 10);
      const sunTomorrow = await fetchSunTimes(lat, lon, tomorrowISO);
      nextSunrise = sunTomorrow.sunrise;
    }
    // Find next ISS pass during night
    const nextNightPass = passes.find(p => isNight(p.risetime, sunset, nextSunrise));
    if (!nextNightPass) {
      return Response.json({ ok: false, error: "No nighttime ISS pass found in next passes." }, { status: 404 });
    }
    return Response.json({
      ok: true,
      pass: {
        risetime: nextNightPass.risetime.toISOString(),
        duration: nextNightPass.duration,
        mag: nextNightPass.mag,
        direction: nextNightPass.direction,
        maxEl: nextNightPass.maxEl,
      },
      sunset: sunset.toISOString(),
      nextSunrise: nextSunrise.toISOString(),
    });
  } catch (err: any) {
    return Response.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
