import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("ingest-conditions function starting");
console.log("Deno version:", typeof Deno !== "undefined" && Deno?.version ? Deno.version : "not defined");
console.log("Available env keys:", Object.keys(typeof Deno !== "undefined" && Deno?.env?.toObject ? Deno.env.toObject() : {}));

const env = typeof Deno !== "undefined" && Deno.env ? Deno.env.toObject() : process.env ?? {};
const SUPABASE_URL = env.SUPABASE_URL;
const SERVICE_KEY =
  env.SERVICE_ROLE_KEY ??
  env.SUPABASE_SERVICE_ROLE_KEY ??
  env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or service credentials (SERVICE_ROLE_KEY/SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY)");
  throw new Error("Supabase credentials are not configured for the ingest-conditions function");
}

type IngestRequestPayload = {
  bbox?: [number, number, number, number];
  providers?: string[];
  vars?: string[];
  limit?: number;
};

serve(async (req) => {
  const rawPayload = await req.json().catch(() => null);
  const payload: IngestRequestPayload =
    rawPayload && typeof rawPayload === "object"
      ? (rawPayload as IngestRequestPayload)
      : {};

  const bbox = Array.isArray(payload?.bbox) && payload.bbox.length === 4
    ? (payload.bbox as [number, number, number, number])
    : null; // [minLon, minLat, maxLon, maxLat]

  const providers = Array.isArray(payload?.providers) ? payload.providers as string[] : ["NOAA","CMEMS"];
  const vars = Array.isArray(payload?.vars) ? payload.vars as string[] : ["surface_temperature_c","salinity_psu","oxygen_mg_l","chlorophyll_mg_m3"];
  const maxPoints = Number(payload?.limit ?? env.INGEST_MAX_POINTS ?? 1000);

  console.log("ingest-conditions request:", { bbox, providers, vars, maxPoints });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  try {
    // Pull a manageable batch of cells; we'll filter by bbox in-memory since aliases aren't filterable server-side.
    const { data: cells, error: cellsError } = await supabase
      .from("grid_025deg")
      .select("cell_id, lat_min, lat_max, lon_min, lon_max")
      .limit(Number(env.GRID_FETCH_LIMIT ?? 50000));

    if (cellsError) {
      console.error("Failed to load grid cells", cellsError);
      return jsonResponse({ error: "Failed to load grid cells", details: cellsError }, 500);
    }

    const rawCells: RawGridRow[] = Array.isArray(cells) ? (cells as RawGridRow[]) : [];
    let candidateCells = rawCells
      .map(buildGridCellFromBounds)
      .filter((c): c is GridCell => Boolean(c));

    // Apply bbox if provided: [minLon, minLat, maxLon, maxLat]
    if (bbox) {
      const [minLon, minLat, maxLon, maxLat] = bbox;
      candidateCells = candidateCells.filter(c =>
        c.lon >= Math.min(minLon, maxLon) &&
        c.lon <= Math.max(minLon, maxLon) &&
        c.lat >= Math.min(minLat, maxLat) &&
        c.lat <= Math.max(minLat, maxLat)
      );
    }

    if (candidateCells.length === 0) {
      return jsonResponse({ message: "No grid cells in selection" });
    }

    const diagnostics: IngestDiagnostics = {
      rawCellsFetched: rawCells.length,
      candidateCells: candidateCells.length,
      truncatedTo: candidateCells.length,
      bboxApplied: Boolean(bbox),
      providers,
    };

    shuffleInPlace(candidateCells);

    // Cap the number of sampled cells to avoid timeouts
    if (candidateCells.length > maxPoints) {
      candidateCells = candidateCells.slice(0, maxPoints);
      diagnostics.truncatedTo = candidateCells.length;
    }

    const sampledRows = await fetchAndSampleProviders(candidateCells, { providers, vars }, diagnostics);

    if (sampledRows.length === 0) {
      return jsonResponse({ message: "No provider data returned", diagnostics });
    }

    const { error: upsertError } = await supabase
      .from("grid_conditions_latest")
      .upsert(sampledRows, { onConflict: "cell_id" });

    if (upsertError) {
      console.error("Upsert failed", upsertError);
      return jsonResponse({ error: "Failed to persist conditions", diagnostics }, 500);
    }

    return jsonResponse({ upserted: sampledRows.length, diagnostics });
  } catch (error) {
    console.error("Unexpected error during ingest", error);
    return jsonResponse({ error: "Unexpected ingest error" }, 500);
  }
});

async function fetchAndSampleProviders(
  cells: GridCell[],
  opts: { providers: string[]; vars: string[] },
  diagnostics: IngestDiagnostics
): Promise<ConditionRow[]> {
  const aggregator = new Map<string, ConditionRow>();

  const tasks: Array<Promise<ProviderSample[]>> = [];
  if (opts.providers.includes("NOAA")) {
    diagnostics.noaa = { sampledCells: 0, attempted: 0, successes: 0, errors: [] };
    tasks.push(fetchNoaaSurfaceTemperatures(cells, opts.vars, diagnostics.noaa));
  }
  if (opts.providers.includes("CMEMS")) {
    diagnostics.cmems = { sampledCells: 0, attempted: 0, successes: 0, errors: [] };
    tasks.push(fetchCmemsMetrics(cells, opts.vars, diagnostics.cmems));
  }
  const providerResults = await Promise.all(tasks);
  const [noaaSamples = [], cmemsSamples = []] = providerResults.length === 2 ? providerResults : [providerResults[0] ?? [], providerResults[1] ?? []];

  for (const sample of [...noaaSamples, ...cmemsSamples]) {
    const existing: ConditionRow = aggregator.get(sample.cell_id) ?? { cell_id: sample.cell_id };
    if (sample.collected_at && (!existing.collected_at || existing.collected_at < sample.collected_at)) {
      existing.collected_at = sample.collected_at;
    }

    for (const [key, value] of Object.entries(sample.values) as Array<[keyof ConditionRow, ConditionRow[keyof ConditionRow]]>) {
      if (value !== undefined) {
        existing[key] = value;
      }
    }

    if (sample.source) {
      existing.sources = Array.from(new Set([...(existing.sources ?? []), sample.source]));
    }

    if (!existing.quality) {
      existing.quality = "medium";
    }

    aggregator.set(sample.cell_id, existing);
  }

  return Array.from(aggregator.values());
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// NOAA ERDDAP (MUR SST) ------------------------------------------------------

const NOAA_ERDDAP_BASE_URL = env.NOAA_ERDDAP_BASE_URL ?? "https://coastwatch.pfeg.noaa.gov/erddap";
const NOAA_DEFAULT_DATASET_ID = "ncdcOisst21Agg_LonPM180";
const NOAA_DEFAULT_VARIABLE = "sst";
const NOAA_DATASET_ID = (() => {
  const configured = env.NOAA_ERDDAP_DATASET_ID?.trim();
  if (configured && configured !== "jplMURSST41_L4") return configured;
  return NOAA_DEFAULT_DATASET_ID;
})();
const NOAA_VARIABLE = (() => {
  const configured = env.NOAA_ERDDAP_VARIABLE?.trim();
  if (configured && configured !== "analysed_sst") return configured;
  return NOAA_DEFAULT_VARIABLE;
})();
const NOAA_DEPTH_DIMENSION = env.NOAA_ERDDAP_DEPTH_DIMENSION ?? "zlev";
const NOAA_DEPTH_VALUE = env.NOAA_ERDDAP_DEPTH_VALUE ?? "0";
const NOAA_SEARCH_RADIUS = Number(env.NOAA_ERDDAP_SEARCH_RADIUS ?? "0.25");
const NOAA_CONCURRENCY = Number(env.NOAA_ERDDAP_CONCURRENCY ?? "4");
const NOAA_INTERFACE = (env.NOAA_ERDDAP_INTERFACE ?? "griddap").toLowerCase();
const NOAA_TIME_WINDOW_HOURS = Number(env.NOAA_ERDDAP_TIME_WINDOW_HOURS ?? "12");
const NOAA_TIME_OFFSETS: number[] = (env.NOAA_ERDDAP_TIME_OFFSETS ?? "0,24,72,168,336,720,1440,2160")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value >= 0);

async function fetchNoaaSurfaceTemperatures(cells: GridCell[], vars: string[], diagnostics?: ProviderDiagnostics): Promise<ProviderSample[]> {
  const results: ProviderSample[] = [];

  if (!vars.includes("surface_temperature_c")) {
    if (diagnostics) diagnostics.sampledCells = 0;
    return results;
  }

  const limitedCells = cells.slice(0, Number(env.NOAA_ERDDAP_MAX_POINTS ?? "500"));
  if (diagnostics) diagnostics.sampledCells = limitedCells.length;

  await mapWithConcurrency(limitedCells, NOAA_CONCURRENCY, async (cell) => {
    const sample = await fetchNoaaForCell(cell, diagnostics);
    if (sample) results.push(sample);
  });

  return results;
}

async function fetchNoaaForCell(cell: GridCell, diagnostics?: ProviderDiagnostics): Promise<ProviderSample | null> {
  const offsets = NOAA_TIME_OFFSETS.length > 0 ? NOAA_TIME_OFFSETS : [0];
  const windowMs = Math.max(NOAA_TIME_WINDOW_HOURS, 1) * 60 * 60 * 1000;
  const now = new Date();

  for (const offsetHours of offsets) {
    if (diagnostics) diagnostics.attempted++;

    const centerTime = new Date(now.getTime() - offsetHours * 60 * 60 * 1000);
    const startTime = new Date(Math.min(centerTime.getTime(), now.getTime()) - windowMs);
    const endTime = new Date(Math.min(centerTime.getTime() + windowMs, now.getTime()));
    if (startTime > endTime) {
      startTime.setTime(endTime.getTime() - windowMs);
    }

    const normalizedBase = NOAA_ERDDAP_BASE_URL.replace(/\/+$/, "");
    const apiRoot = normalizedBase.endsWith("/erddap")
      ? normalizedBase
      : `${normalizedBase}/erddap`;
    const interfaceSegment = NOAA_INTERFACE === "tabledap" ? "tabledap" : "griddap";
    const url = new URL(`${apiRoot}/${interfaceSegment}/${NOAA_DATASET_ID}.json`);

    const latCenter = clamp(cell.lat, -90, 90);
    const lonCenter = wrapLongitude(cell.lon);

    // Snap to ERDDAP grid increments (use 0.001 precision to keep quarter-degree offsets like *.125)
    const latIndex = Number(latCenter.toFixed(3));
    const lonIndex = Number(lonCenter.toFixed(3));
    const depthValue = NOAA_DEPTH_DIMENSION ? Number(Number(NOAA_DEPTH_VALUE).toFixed(3)) : null;

    if (NOAA_INTERFACE === "tabledap") {
      const params: string[] = [
        `time,${NOAA_VARIABLE}`,
        `time>=${startTime.toISOString()}`,
        `time<=${endTime.toISOString()}`,
        `latitude>=${(latCenter - NOAA_SEARCH_RADIUS).toFixed(3)}`,
        `latitude<=${(latCenter + NOAA_SEARCH_RADIUS).toFixed(3)}`,
        `longitude>=${wrapLongitude(lonCenter - NOAA_SEARCH_RADIUS).toFixed(3)}`,
        `longitude<=${wrapLongitude(lonCenter + NOAA_SEARCH_RADIUS).toFixed(3)}`,
        `orderByClosest(%22time,latitude,longitude%22)`,
        `limit=1`,
      ];
      if (depthValue !== null) {
        params.push(`${NOAA_DEPTH_DIMENSION}=${depthValue.toFixed(3)}`);
      }
      url.search = `?${params.join("&")}`;
    } else {
      const timeSlice = `[(${startTime.toISOString()}):1:(${endTime.toISOString()})]`;
      const depthSlice = depthValue !== null ? `[(${depthValue.toFixed(3)}):1:(${depthValue.toFixed(3)})]` : "";
      const latSlice = `[(${latIndex.toFixed(3)}):1:(${latIndex.toFixed(3)})]`;
      const lonSlice = `[(${lonIndex.toFixed(3)}):1:(${lonIndex.toFixed(3)})]`;
      url.search = `?${NOAA_VARIABLE}${timeSlice}${depthSlice}${latSlice}${lonSlice}`;
    }

    try {
      const resp = await fetch(url.toString());
      if (!resp.ok) {
        const warning = `HTTP ${resp.status} ${resp.statusText} for cell ${cell.cell_id} (offset ${offsetHours}h)`;
        recordProviderError(diagnostics, warning);
        console.warn("NOAA ERDDAP request failed", resp.status, resp.statusText, { cell: cell.cell_id, offsetHours });
        continue;
      }

      const json = await resp.json();
      const rows: unknown[] = json?.table?.rows ?? [];
      if (!Array.isArray(rows) || rows.length === 0) {
        recordProviderError(diagnostics, `No rows returned for cell ${cell.cell_id} (offset ${offsetHours}h)`);
        continue;
      }

      const firstRow = rows[0] as unknown[];
      const timeValue = String(firstRow[0]);
      const temperature = Number(firstRow[firstRow.length - 1]);
      if (temperature == null || Number.isNaN(temperature)) {
        recordProviderError(diagnostics, `Invalid temperature for cell ${cell.cell_id} (offset ${offsetHours}h)`);
        continue;
      }

      let celsius = Number(temperature);
      if (celsius > 200) {
        celsius -= 273.15; // Convert Kelvin datasets
      }
      if (diagnostics) diagnostics.successes++;

      return {
        cell_id: cell.cell_id,
        collected_at: timeValue,
        source: `${NOAA_DATASET_ID}.${NOAA_VARIABLE}`,
        values: {
          surface_temperature_c: Number(celsius.toFixed(3)),
        },
      };
    } catch (error) {
      console.error("ERDDAP fetch error", error);
      recordProviderError(diagnostics, `Fetch error for cell ${cell.cell_id} (offset ${offsetHours}h): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return null;
}

// CMEMS (Thredds NCSS) -------------------------------------------------------

const CMEMS_NCSS_BASE_URL =
  env.CMEMS_NCSS_BASE_URL ??
  "https://nrt.cmems-du.eu/thredds/ncss/IBI_ANALYSISFORECAST_BGC_005_004/cmems_mod_ibi_bgc_anfc_0.027deg-3D_P1D-m.nc";
const CMEMS_USERNAME = env.CMEMS_USERNAME;
const CMEMS_PASSWORD = env.CMEMS_PASSWORD;
const CMEMS_LOOKBACK_HOURS = Number(env.CMEMS_LOOKBACK_HOURS ?? "24");
const CMEMS_CONCURRENCY = Number(env.CMEMS_CONCURRENCY ?? "3");

const CMEMS_VARIABLE_MAP: Record<string, keyof ConditionRow> = {
  thetao: "bottom_temperature_c",
  so: "salinity_psu",
  o2: "oxygen_mg_l",
  chl: "chlorophyll_mg_m3",
  no3: "nitrate_umol_l",
  po4: "phosphate_umol_l",
  phyc: "phytoplankton_index",
};

async function fetchCmemsMetrics(cells: GridCell[], vars: string[], diagnostics?: ProviderDiagnostics): Promise<ProviderSample[]> {
  if (!CMEMS_NCSS_BASE_URL || !CMEMS_USERNAME || !CMEMS_PASSWORD) {
    console.warn("CMEMS credentials not configured – skipping CMEMS sampling");
    recordProviderError(diagnostics, "CMEMS credentials not configured");
    return [];
  }

  // Filter requested variables to those we support
  const requestedSet = new Set(vars);
  const filteredVarEntries = Object.entries(CMEMS_VARIABLE_MAP).filter(([, mappedField]) => requestedSet.has(mappedField));
  if (filteredVarEntries.length === 0) {
    console.log("CMEMS: no requested variables matched supported map; skipping");
    return [];
  }
  const varList = filteredVarEntries.map(([variableKey]) => variableKey);
  const fieldMap: Record<string, keyof ConditionRow> = Object.fromEntries(filteredVarEntries) as Record<string, keyof ConditionRow>;

  const authHeader = "Basic " + btoa(`${CMEMS_USERNAME}:${CMEMS_PASSWORD}`);
  const results: ProviderSample[] = [];
  const time = new Date();
  const lookback = new Date(time.getTime() - CMEMS_LOOKBACK_HOURS * 60 * 60 * 1000);

  if (diagnostics) diagnostics.sampledCells = cells.length;

  await mapWithConcurrency(cells, CMEMS_CONCURRENCY, async (cell) => {
    const sample = await fetchCmemsForCell({ cell, time, lookback, authHeader, varList, fieldMap, diagnostics });
    if (sample) results.push(sample);
  });

  return results;
}

async function fetchCmemsForCell(params: { cell: GridCell; time: Date; lookback: Date; authHeader: string; varList: string[]; fieldMap: Record<string, keyof ConditionRow> ; diagnostics?: ProviderDiagnostics }): Promise<ProviderSample | null> {
  const { cell, time, lookback, authHeader, diagnostics } = params;
  if (diagnostics) diagnostics.attempted++;

  const url = new URL(CMEMS_NCSS_BASE_URL!);

  for (const variable of params.varList) {
    url.searchParams.append("var", variable);
  }

  url.searchParams.set("accept", "csv");
  url.searchParams.set("latitude", cell.lat.toFixed(3));
  url.searchParams.set("longitude", wrapLongitude(cell.lon).toFixed(3));
  url.searchParams.set("time", time.toISOString());
  url.searchParams.set("time_start", lookback.toISOString());
  url.searchParams.set("time_end", time.toISOString());
  url.searchParams.set("point", "true");
  url.searchParams.set("addLatLon", "true");
  url.searchParams.set("orderByClosest", "time");
  url.searchParams.set("limit", "1");

  try {
    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!resp.ok) {
      console.warn("CMEMS NCSS request failed", resp.status, resp.statusText);
      recordProviderError(diagnostics, `HTTP ${resp.status} ${resp.statusText} for cell ${cell.cell_id}`);
      return null;
    }

    const text = await resp.text();
    const parsed = parseCsv(text);
    if (!parsed || parsed.values.length === 0) {
      recordProviderError(diagnostics, `No rows returned for cell ${cell.cell_id}`);
      return null;
    }

    const row = parsed.values[0];
    const collected_at = row.time ?? parsed.metadata?.time ?? null;

    const valueMap: Partial<ConditionRow> = {};
    for (const [variable, field] of Object.entries(params.fieldMap)) {
      const raw = row[variable];
      if (raw == null) continue;
      const numeric = Number(raw);
      if (Number.isNaN(numeric)) continue;
      valueMap[field] = numeric;
    }

    if (Object.keys(valueMap).length === 0) {
      recordProviderError(diagnostics, `No numeric variables in response for cell ${cell.cell_id}`);
      return null;
    }

    if (diagnostics) diagnostics.successes++;

    return {
      cell_id: cell.cell_id,
      collected_at: collected_at ?? new Date().toISOString(),
      source: "cmems",
      values: valueMap,
    };
  } catch (error) {
    console.error("CMEMS fetch error", error);
    recordProviderError(diagnostics, `Fetch error for cell ${cell.cell_id}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

// Helpers --------------------------------------------------------------------

async function mapWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const running: Promise<void>[] = [];

  const runNext = async () => {
    const item = queue.shift();
    if (item === undefined) return;
    await worker(item);
    await runNext();
  };

  for (let i = 0; i < Math.max(1, limit); i++) {
    running.push(runNext());
  }

  await Promise.all(running);
}

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

function wrapLongitude(lon: number): number {
  let value = lon;
  while (value < -180) value += 360;
  while (value > 180) value -= 360;
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

type ParsedCsv = {
  metadata?: Record<string, string>;
  values: Array<Record<string, string>>;
};

function parseCsv(text: string): ParsedCsv | null {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return null;

  // NCSS CSV returns header comment lines starting with '#'
  const metadata: Record<string, string> = {};
  let headerLineIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("#")) {
      const [key, ...rest] = lines[i].substring(1).split(":");
      if (key && rest.length > 0) metadata[key.trim()] = rest.join(":").trim();
    } else {
      headerLineIndex = i;
      break;
    }
  }

  const headers = lines[headerLineIndex].split(",").map((item) => item.trim());
  const values: Record<string, string>[] = [];

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const columns = lines[i].split(",");
    if (columns.length !== headers.length) continue;
    const record: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = columns[j]?.trim();
    }
    values.push(record);
  }

  return { metadata, values };
}

type GridCell = {
  cell_id: string;
  lat: number;
  lon: number;
};

type RawGridRow = {
  cell_id?: string;
  lat_min?: string | number | null;
  lat_max?: string | number | null;
  lon_min?: string | number | null;
  lon_max?: string | number | null;
};

function buildGridCellFromBounds(row: RawGridRow): GridCell | null {
  if (!row?.cell_id) return null;

  const latMin = Number(row.lat_min);
  const latMax = Number(row.lat_max);
  const lonMin = Number(row.lon_min);
  const lonMax = Number(row.lon_max);

  if ([latMin, latMax, lonMin, lonMax].some((value) => Number.isNaN(value))) {
    return null;
  }

  const lat = (latMin + latMax) / 2;
  let lon = (lonMin + lonMax) / 2;

  // Handle dateline wrapping (e.g., lon_min=179, lon_max=-179)
  if (Math.abs(lonMax - lonMin) > 180) {
    const adjustedLonMin = wrapLongitude(lonMin);
    const adjustedLonMax = wrapLongitude(lonMax);
    lon = wrapLongitude((adjustedLonMin + adjustedLonMax) / 2);
  } else {
    lon = wrapLongitude(lon);
  }

  return {
    cell_id: row.cell_id,
    lat,
    lon,
  };
}

type ProviderSample = {
  cell_id: string;
  collected_at: string | null;
  source?: string;
  values: Partial<ConditionRow>;
};

type ConditionRow = {
  cell_id: string;
  collected_at?: string;
  sources?: string[];
  quality?: "low" | "medium" | "high";
  // variables we may set:
  surface_temperature_c?: number;
  bottom_temperature_c?: number;
  salinity_psu?: number;
  oxygen_mg_l?: number;
  chlorophyll_mg_m3?: number;
  nitrate_umol_l?: number;
  phosphate_umol_l?: number;
  phytoplankton_index?: number;
};

type ProviderDiagnostics = {
  sampledCells: number;
  attempted: number;
  successes: number;
  errors: string[];
};

type IngestDiagnostics = {
  rawCellsFetched: number;
  candidateCells: number;
  truncatedTo: number;
  bboxApplied: boolean;
  providers: string[];
  noaa?: ProviderDiagnostics;
  cmems?: ProviderDiagnostics;
};

function recordProviderError(diag: ProviderDiagnostics | undefined, message: string): void {
  if (!diag) return;
  if (diag.errors.length >= 10) return;
  diag.errors.push(message);
}
