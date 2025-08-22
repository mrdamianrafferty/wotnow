// app/api/iss-visible/route.ts
import { NextRequest } from "next/server";

const ROUTE_VERSION = "iss-visible:v2-minimal+heartbeat+fallback";

type NightWindow = { start: Date; end: Date };

type IssPass = {
  risetime: Date;
  endtime: Date;
  durationSec: number;
  source: "open-notify" | "prediction";
};

type VisibleIssPass = IssPass & { nightWindow: NightWindow };

function toISODateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ---- Sunrise/Sunset (HTTPS) ----
async function fetchSunTimes(lat: number, lon: number, dateISO: string) {
  const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&date=${dateISO}&formatted=0`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Sunrise-Sunset error ${r.status}`);
  const j = await r.json();
  if (j.status !== "OK") throw new Error(`Sunrise-Sunset status: ${j.status}`);
  return {
    sunriseISO: j.results.sunrise as string | null,
    sunsetISO: j.results.sunset as string | null,
  };
}

function buildNightWindowsFromSunApi(
  days: Array<{ sunriseISO: string | null; sunsetISO: string | null }>,
  darknessBufferSec = 1800
): NightWindow[] {
  const windows: NightWindow[] = [];
  for (let i = 0; i < days.length - 1; i++) {
    const d0 = days[i];
    const d1 = days[i + 1];
    if (!d0.sunsetISO || !d1.sunriseISO) continue;
    const start = new Date(new Date(d0.sunsetISO).getTime() + darknessBufferSec * 1000);
    const end = new Date(new Date(d1.sunriseISO).getTime() - darknessBufferSec * 1000);
    if (isFinite(start.getTime()) && isFinite(end.getTime()) && start < end) windows.push({ start, end });
  }
  return windows;
}

// ---- Open Notify (HTTP; server-only) ----
async function fetchIssPassesOpenNotify(
  lat: number,
  lon: number,
  passes = 12,
  timeoutMs = 8000
): Promise<IssPass[]> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const url = `http://api.open-notify.org/iss-pass.json?lat=${lat}&lon=${lon}&n=${passes}`;
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`Open Notify error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    if (!data?.response || !Array.isArray(data.response)) throw new Error("Unexpected Open Notify response");
    return data.response.map((p: any) => {
      const rise = new Date((p.risetime as number) * 1000);
      const end = new Date(((p.risetime as number) + (p.duration as number)) * 1000);
      return { risetime: rise, endtime: end, durationSec: p.duration as number, source: "open-notify" };
    });
  } finally {
    clearTimeout(id);
  }
}

async function checkOpenNotifyUp(timeoutMs = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("http://api.open-notify.org/iss-now.json", { signal: controller.signal, cache: "no-store" });
    if (!res.ok) return { ok: false } as const;
    const data = await res.json();
    if (data?.message !== "success" || !data?.iss_position) return { ok: false } as const;
    return {
      ok: true as const,
      timestamp: data.timestamp as number,
      position: { latitude: Number(data.iss_position.latitude), longitude: Number(data.iss_position.longitude) },
    };
  } catch {
    return { ok: false } as const;
  } finally {
    clearTimeout(id);
  }
}

// ---- WhereTheISS.at fallback (HTTPS; no key) ----
const EARTH_RADIUS_KM = 6371.0;
function toRad(deg: number) { return (deg * Math.PI) / 180; }
function centralAngleRad(lat1: number, lon1: number, lat2: number, lon2: number) {
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function horizonCentralAngleRad(altKm: number) {
  return Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + Math.max(altKm, 0)));
}
async function fetchWhereIssPositions(timestamps: number[]) {
  const url = `https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=${timestamps.join(",")}&units=kilometers`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`where-the-iss-at error ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("where-the-iss-at bad payload");
  return data as Array<{ latitude: number; longitude: number; altitude: number; timestamp: number }>;
}
async function fetchWhereIssInChunks(allTimestamps: number[], chunkSize = 300) {
  const out: Array<{ latitude: number; longitude: number; altitude: number; timestamp: number }> = [];
  for (let i = 0; i < allTimestamps.length; i += chunkSize) {
    const chunk = allTimestamps.slice(i, i + chunkSize);
    const part = await fetchWhereIssPositions(chunk);
    out.push(...part);
  }
  return out;
}
async function predictPassesFromWhereISS(lat: number, lon: number, hoursAhead = 8, stepSec = 60): Promise<IssPass[]> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const end = now + Math.max(2, Math.min(24, hoursAhead)) * 3600;
    const timestamps: number[] = [];
    for (let t = now; t <= end; t += stepSec) timestamps.push(t);
    const positions = await fetchWhereIssInChunks(timestamps, 300);

    type Sample = { t: number; visible: boolean };
    const samples: Sample[] = positions.map(p => {
      const gamma = centralAngleRad(lat, lon, p.latitude, p.longitude);
      const theta = horizonCentralAngleRad(p.altitude);
      return { t: p.timestamp, visible: Number.isFinite(theta) && gamma <= theta };
    });

    const passes: IssPass[] = [];
    let segStart: number | null = null;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const prev = samples[i - 1];
      if (s.visible && segStart == null) segStart = s.t;
      const atEnd = i === samples.length - 1;
      if ((segStart != null && (!s.visible && prev?.visible)) || (segStart != null && atEnd && s.visible)) {
        const segEnd = atEnd && s.visible ? s.t : (prev!.t ?? s.t);
        const durationSec = Math.max(0, segEnd - segStart);
        if (durationSec >= Math.max(60, stepSec * 2)) {
          passes.push({ risetime: new Date(segStart * 1000), endtime: new Date(segEnd * 1000), durationSec, source: "prediction" });
        }
        segStart = null;
      }
    }
    passes.sort((a, b) => a.risetime.getTime() - b.risetime.getTime());
    return passes.slice(0, 24);
  } catch {
    return [];
  }
}

function filterPassesToNight(passes: IssPass[], nightWindows: NightWindow[]): VisibleIssPass[] {
  const out: VisibleIssPass[] = [];
  for (const pass of passes) {
    const mid = pass.risetime.getTime() + (pass.durationSec * 1000) / 2;
    for (const w of nightWindows) {
      if (mid >= w.start.getTime() && mid <= w.end.getTime()) { out.push({ ...pass, nightWindow: w }); break; }
    }
  }
  return out.sort((a, b) => a.risetime.getTime() - b.risetime.getTime());
}

function pickBestPerNight(nightPasses: VisibleIssPass[], maxPerNight = 2, minGapMinutes = 45): VisibleIssPass[] {
  const gapMs = minGapMinutes * 60 * 1000;
  const groups = new Map<string, VisibleIssPass[]>();
  for (const p of nightPasses) {
    const key = `${p.nightWindow.start.toISOString()}→${p.nightWindow.end.toISOString()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  const chosen: VisibleIssPass[] = [];
  for (const [, arr] of groups) {
    const sorted = [...arr].sort((a, b) => b.durationSec - a.durationSec || a.risetime.getTime() - b.risetime.getTime());
    const keep: VisibleIssPass[] = [];
    for (const cand of sorted) {
      if (keep.length >= maxPerNight) break;
      if (keep.every(k => Math.abs(k.risetime.getTime() - cand.risetime.getTime()) >= gapMs)) keep.push(cand);
    }
    for (const cand of sorted) {
      if (keep.length >= Math.min(maxPerNight, sorted.length)) break;
      if (!keep.includes(cand)) keep.push(cand);
    }
    chosen.push(...keep);
  }
  return chosen.sort((a, b) => a.risetime.getTime() - b.risetime.getTime());
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = Number(searchParams.get("lat"));
    const lon = Number(searchParams.get("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return Response.json({ error: "Please provide numeric ?lat= and ?lon=." }, { status: 400 });

    const passesParam = Number(searchParams.get("passes") ?? "14");
    const darknessBufferSec = Number(searchParams.get("darknessBufferSec") ?? "1800");
    const bestOnly = (searchParams.get("bestOnly") ?? "true").toLowerCase() === "true";
    const maxPerNight = Number(searchParams.get("maxPerNight") ?? "2");
    const minGapMinutes = Number(searchParams.get("minGapMinutes") ?? "45");
    const nights = Math.min(Math.max(Number(searchParams.get("nights") ?? "4"), 2), 7);

    // Sunrise/Sunset for N+1 days (tolerate per-day errors)
    const todayUTC = new Date();
    const dayPromises: Promise<{ sunriseISO: string | null; sunsetISO: string | null }>[] = [];
    for (let i = 0; i < nights + 1; i++) {
      const d = new Date(todayUTC.getTime() + i * 24 * 3600 * 1000);
      dayPromises.push(fetchSunTimes(lat, lon, toISODateUTC(d)));
    }
    const settled = await Promise.allSettled(dayPromises);
    const days: Array<{ sunriseISO: string | null; sunsetISO: string | null }> = [];
    const sunErrors: string[] = [];
    for (const s of settled) {
      if (s.status === "fulfilled") days.push(s.value); else sunErrors.push(String((s as any).reason?.message || (s as any).reason || "sun error"));
    }

    const nightWindows = buildNightWindowsFromSunApi(days, darknessBufferSec);
    if (!nightWindows.length) {
      return Response.json({ version: ROUTE_VERSION, lat, lon, nightsRequested: nights, count: 0, mode: bestOnly ? "best-per-night" : "all-night-passes", maxPerNight: bestOnly ? maxPerNight : undefined, minGapMinutes: bestOnly ? minGapMinutes : undefined, darknessBufferSec, passesRequested: passesParam, heartbeat: null, sunErrors, results: [] });
    }

    // Try Open Notify; on any failure use fallback
    const heartbeat = await checkOpenNotifyUp();
    let candidates: IssPass[] = [];
    if (heartbeat.ok) {
      try {
        candidates = await fetchIssPassesOpenNotify(lat, lon, passesParam);
      } catch {
        candidates = await predictPassesFromWhereISS(lat, lon);
      }
    } else {
      candidates = await predictPassesFromWhereISS(lat, lon);
    }

    const nightPasses = filterPassesToNight(candidates, nightWindows);
    const results = bestOnly ? pickBestPerNight(nightPasses, maxPerNight, minGapMinutes) : nightPasses;

    const payload = results.map(p => ({
      risetimeISO: p.risetime.toISOString(),
      endtimeISO: p.endtime.toISOString(),
      risetimeUnix: Math.floor(p.risetime.getTime() / 1000),
      endtimeUnix: Math.floor(p.endtime.getTime() / 1000),
      durationSec: p.durationSec,
      source: p.source,
      nightWindow: { startISO: p.nightWindow.start.toISOString(), endISO: p.nightWindow.end.toISOString() },
    }));

    return Response.json({
      version: ROUTE_VERSION,
      lat,
      lon,
      nightsRequested: nights,
      count: payload.length,
      mode: bestOnly ? "best-per-night" : "all-night-passes",
      maxPerNight: bestOnly ? maxPerNight : undefined,
      minGapMinutes: bestOnly ? minGapMinutes : undefined,
      darknessBufferSec,
      passesRequested: passesParam,
      heartbeat: (heartbeat as any).ok ? { timestamp: (heartbeat as any).timestamp, position: (heartbeat as any).position } : null,
      sunErrors,
      sourceUsed: candidates[0]?.source ?? ((heartbeat as any).ok ? "open-notify" : "prediction"),
      results: payload,
    });
  } catch (err: any) {
    return Response.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}