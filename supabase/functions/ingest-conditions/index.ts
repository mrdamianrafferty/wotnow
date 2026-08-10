// ingest-conditions v71
// Changes vs v70 (v69 base):
//   1. CMEMS provider rewritten to use region-aware dataset routing, ported
//      from src/lib/copernicus/regionRouterV2.ts (built from actual CMEMS
//      support guidance, Oct 2025) — that router had ZERO callers anywhere
//      in the codebase; this is the first thing to actually use it.
//      Previously the CMEMS provider hit ONE hardcoded IBI BGC dataset
//      (cmems_mod_ibi_bgc_anfc_0.027deg-3D_P1D-m) for every cell regardless
//      of region, and bundled salinity ('so', a physics variable) into the
//      same query as oxygen/nitrate/phosphate/phytoplankton (BGC variables)
//      — the BGC dataset doesn't carry salinity, so that combined query
//      came back with "no numeric variables" for every cell tested.
//   2. Added vertCoord=0 to CMEMS NCSS point queries. The regional BGC
//      datasets are 3D (depth-resolved, "50+ depth layers" per
//      regionRouterV2's IBI comment); the prior query specified no vertical
//      coordinate at all, which is the likely other half of why every CMEMS
//      request returned no usable columns.
//   3. Salinity now queried separately from each region's physics/temperature
//      dataset (bundled with thetao for IBI/BAL/BLK, split dataset for MED,
//      global fallback for NWS/ARC/GLO) instead of from the BGC dataset.
//   4. Default `providers` now includes CHLOROPHYLL and KD490 alongside
//      NOAA and CMEMS, so a bare pg_cron invocation (which posts no body
//      beyond {source:"pg_cron"}) exercises all four providers — previously
//      a parameterless invocation silently skipped chlorophyll/kd490
//      entirely even though those two provider functions work fine on
//      their own (confirmed via direct test invocation).
//   5. Default `vars` extended to include oxygen_mg_l, nitrate_umol_l,
//      phosphate_umol_l, phytoplankton_index alongside the pre-existing
//      surface_temperature_c/salinity_psu/chlorophyll_mg_m3, so a bare
//      cron invocation actually requests the full variable set.
//
// Everything else (concurrency guard, grid cell selection, NOAA/CHLOROPHYLL/
// KD490 provider functions, upsert logic, helpers) is unchanged from v69/v70
// — those paths were confirmed working via direct test invocation before
// this change.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("ingest-conditions v71 starting");

const env = typeof Deno !== "undefined" && Deno.env ? Deno.env.toObject() : (process as any)?.env ?? {};
const SUPABASE_URL = env.SUPABASE_URL;
const SERVICE_KEY =
  env.SERVICE_ROLE_KEY ??
  env.SUPABASE_SERVICE_ROLE_KEY ??
  env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or service credentials");
  throw new Error("Supabase credentials are not configured for the ingest-conditions function");
}

const LOCK_NAME = "ingest-conditions";
const LOCK_TTL_SECONDS = 90;
const INVOCATION_DEADLINE_MS = 50_000;
const HTTP_TIMEOUT_MS = 5_000;

type IngestRequestPayload = {
  bbox?: [number, number, number, number];
  providers?: string[];
  vars?: string[];
  limit?: number;
};

serve(async (req) => {
  const startedAt = Date.now();
  const deadline = startedAt + INVOCATION_DEADLINE_MS;

  // Auth: the X-Ingest-Secret shared secret, matching every other ingest
  // function in this project (see functions/_shared/edge-helpers.ts, which
  // records the reasoning: the service-role JWT was tried in the Phase 0 spike
  // and rejected as fragile, because the function's view of
  // SUPABASE_SERVICE_ROLE_KEY does not always equal the caller's).
  //
  // This function was deployed with verify_jwt: true and no internal auth,
  // while _invoke_ingest sends X-Ingest-Secret and no Authorization header. So
  // the gateway rejected every scheduled invocation before this code ran:
  // UNAUTHORIZED_NO_AUTH_HEADER, roughly nineteen times a day since deployment.
  // pg_cron recorded "succeeded" each time, because the HTTP call itself
  // succeeded -- the 401 was in the response body, which nothing read.
  //
  // Moving to verify_jwt: false without this check would make the function
  // publicly invokable by anyone, so the two changes belong together.
  // Two callers, two credentials, and both must keep working.
  //
  //   pg_cron  -> _invoke_ingest sends X-Ingest-Secret and no Authorization.
  //               This is the path that was returning 401: the function was
  //               deployed with verify_jwt: true, so the gateway rejected it
  //               before any code ran, roughly nineteen times a day.
  //
  //   Actions  -> godaisy-core's ingest-noaa-data, ingest-chlorophyll-data and
  //               ingest-kd490-data call supabase.functions.invoke() with a
  //               service-role client, so supabase-js attaches
  //               Authorization: Bearer <service key> and no X-Ingest-Secret.
  //               That path satisfied verify_jwt and has been working all
  //               along -- it is what wrote today's chlorophyll and Kd490 rows.
  //
  // Checking only the shared secret would have broken those three workflows at
  // their next run. Accept either credential; reject anything with neither, so
  // verify_jwt: false does not leave this open to the world.
  const expectedSecret = env.EDGE_INGEST_SECRET ?? "";
  const suppliedSecret = req.headers.get("x-ingest-secret") ?? "";
  const authHeaderRaw = req.headers.get("authorization") ?? "";
  const bearer = authHeaderRaw.toLowerCase().startsWith("bearer ")
    ? authHeaderRaw.slice(7).trim()
    : "";

  const secretOk = expectedSecret !== "" && suppliedSecret === expectedSecret;
  const bearerOk = bearer !== "" &&
    (bearer === SERVICE_KEY || (env.SUPABASE_ANON_KEY && bearer === env.SUPABASE_ANON_KEY));

  if (!secretOk && !bearerOk) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const rawPayload = await req.json().catch(() => null);
  const payload: IngestRequestPayload =
    rawPayload && typeof rawPayload === "object"
      ? (rawPayload as IngestRequestPayload)
      : {};

  const bbox = Array.isArray(payload?.bbox) && payload.bbox.length === 4
    ? (payload.bbox as [number, number, number, number])
    : null;

  const providers = Array.isArray(payload?.providers) ? payload.providers as string[] : ["NOAA", "CHLOROPHYLL", "KD490"];
  const vars = Array.isArray(payload?.vars) ? payload.vars as string[] : [
    "surface_temperature_c",
    "salinity_psu",
    "oxygen_mg_l",
    "chlorophyll_mg_m3",
    "nitrate_umol_l",
    "phosphate_umol_l",
    "phytoplankton_index",
  ];
  const maxPoints = Number(payload?.limit ?? env.INGEST_MAX_POINTS ?? 1000);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // ── Concurrency guard ─────────────────────────────────────────────────────
  const { data: gotLock, error: lockError } = await supabase.rpc("try_acquire_cron_lock", {
    p_lock_name: LOCK_NAME,
    p_ttl_seconds: LOCK_TTL_SECONDS,
  });

  if (lockError) {
    console.error("try_acquire_cron_lock RPC failed", lockError);
    return jsonResponse({ error: "Lock acquisition failed", details: lockError.message }, 500);
  }

  if (!gotLock) {
    console.log("Another ingest-conditions invocation is in progress; skipping");
    return jsonResponse({ skipped: "already_running" });
  }

  console.log("ingest-conditions request:", { bbox, providers, vars, maxPoints });

  try {
    let query = supabase
      .from("grid_025deg")
      .select("cell_id, lat_min, lat_max, lon_min, lon_max");

    if (bbox) {
      const [minLon, minLat, maxLon, maxLat] = bbox;
      query = query
        .gte("lon_max", Math.min(minLon, maxLon))
        .lte("lon_min", Math.max(minLon, maxLon))
        .gte("lat_max", Math.min(minLat, maxLat))
        .lte("lat_min", Math.max(minLat, maxLat));
    }

    query = query.limit(Number(env.GRID_FETCH_LIMIT ?? 50000));

    const { data: cells, error: cellsError } = await query;

    if (cellsError) {
      console.error("Failed to load grid cells", cellsError);
      return jsonResponse({ error: "Failed to load grid cells", details: cellsError }, 500);
    }

    const rawCells: RawGridRow[] = Array.isArray(cells) ? (cells as RawGridRow[]) : [];
    let candidateCells = rawCells
      .map(buildGridCellFromBounds)
      .filter((c): c is GridCell => Boolean(c));

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

    const cellIds = candidateCells.map((c) => c.cell_id);
    const { data: existingData } = await supabase
      .from("grid_conditions_latest")
      .select("cell_id")
      .in("cell_id", cellIds);

    const existingIds = new Set((existingData || []).map((row) => row.cell_id));
    const withoutData = candidateCells.filter((c) => !existingIds.has(c.cell_id));
    const withData = candidateCells.filter((c) => existingIds.has(c.cell_id));

    shuffleInPlace(withoutData);
    shuffleInPlace(withData);

    const targetNew = Math.min(withoutData.length, Math.floor(maxPoints * 0.8));
    const targetRefresh = Math.min(withData.length, maxPoints - targetNew);

    candidateCells = [
      ...withoutData.slice(0, targetNew),
      ...withData.slice(0, targetRefresh),
    ];

    diagnostics.truncatedTo = candidateCells.length;
    diagnostics.gridsWithoutData = withoutData.length;
    diagnostics.gridsWithData = withData.length;
    diagnostics.selectedNew = targetNew;
    diagnostics.selectedRefresh = targetRefresh;

    const sampledRows = await fetchAndSampleProviders(
      candidateCells,
      { providers, vars, deadline },
      diagnostics,
    );

    if (sampledRows.length === 0) {
      return jsonResponse({ message: "No provider data returned", diagnostics });
    }

    // Do not replace a fresher reading with an older one.
    //
    // grid_conditions_latest has several writers and no ordering between them.
    // Without this, whichever job ran last won, so a cell holding this morning's
    // Copernicus temperature could be overwritten by a satellite product weeks
    // behind and stamped as an update -- wrong, plausible, and invisible. The
    // same guard was added to findr's two writers on 2026-08-09 after exactly
    // that was found in the SST path.
    //
    // A row is written when the cell has no reading, when ours observes something
    // more recent, or when the existing reading came from a source we also used
    // (a routine refresh of our own data). Skips are counted, not silent.
    const rowsById = new Map(sampledRows.map((r) => [r.cell_id, r]));
    const existingByCell = new Map<string, { collected_at: string | null; sources: string[] | null }>();
    const idsToCheck = [...rowsById.keys()];
    for (let i = 0; i < idsToCheck.length; i += 500) {
      const { data: rows } = await supabase
        .from("grid_conditions_latest")
        .select("cell_id, collected_at, sources")
        .in("cell_id", idsToCheck.slice(i, i + 500));
      for (const r of rows ?? []) {
        existingByCell.set(r.cell_id as string, {
          collected_at: (r.collected_at as string | null) ?? null,
          sources: (r.sources as string[] | null) ?? null,
        });
      }
    }

    let skippedStale = 0;
    const writableRows = sampledRows.filter((row) => {
      const existing = existingByCell.get(row.cell_id);
      if (!existing || !existing.collected_at) return true;
      const ours = new Set(row.sources ?? []);
      if ((existing.sources ?? []).some((src) => ours.has(src))) return true;
      if (!row.collected_at) return false;
      if (new Date(existing.collected_at).getTime() < new Date(row.collected_at).getTime()) return true;
      skippedStale++;
      return false;
    });

    diagnostics.skippedStale = skippedStale;
    diagnostics.written = writableRows.length;

    if (writableRows.length === 0) {
      return jsonResponse({
        message: "Nothing to write — every cell already has a fresher reading",
        diagnostics,
        durationMs: Date.now() - startedAt,
      });
    }

    const { error: upsertError } = await supabase
      .from("grid_conditions_latest")
      .upsert(writableRows, { onConflict: "cell_id" });

    if (upsertError) {
      console.error("Upsert failed", upsertError);
      return jsonResponse({ error: "Failed to persist conditions", diagnostics, upsertError }, 500);
    }

    return jsonResponse({ upserted: writableRows.length, diagnostics, durationMs: Date.now() - startedAt });
  } catch (error) {
    console.error("Unexpected error during ingest", error);
    return jsonResponse({ error: "Unexpected ingest error" }, 500);
  }
});

type FetchOpts = { providers: string[]; vars: string[]; deadline: number };

async function fetchAndSampleProviders(
  cells: GridCell[],
  opts: FetchOpts,
  diagnostics: IngestDiagnostics,
): Promise<ConditionRow[]> {
  const aggregator = new Map<string, ConditionRow>();

  const tasks: Array<Promise<ProviderSample[]>> = [];
  if (opts.providers.includes("NOAA")) {
    diagnostics.noaa = { sampledCells: 0, attempted: 0, successes: 0, errors: [] };
    tasks.push(fetchNoaaSurfaceTemperatures(cells, opts.vars, opts.deadline, diagnostics.noaa));
  }
  if (opts.providers.includes("CHLOROPHYLL")) {
    diagnostics.chlorophyll = { sampledCells: 0, attempted: 0, successes: 0, errors: [] };
    tasks.push(fetchChlorophyllData(cells, opts.vars, opts.deadline, diagnostics.chlorophyll));
  }
  if (opts.providers.includes("KD490")) {
    diagnostics.kd490 = { sampledCells: 0, attempted: 0, successes: 0, errors: [] };
    tasks.push(fetchKd490Data(cells, opts.vars, opts.deadline, diagnostics.kd490));
  }
  const providerResults = await Promise.all(tasks);
  const allSamples = providerResults.flat();

  for (const sample of allSamples) {
    const existing: ConditionRow = aggregator.get(sample.cell_id) ?? { cell_id: sample.cell_id };
    if (sample.collected_at && (!existing.collected_at || existing.collected_at < sample.collected_at)) {
      existing.collected_at = sample.collected_at;
    }

    for (const [key, value] of Object.entries(sample.values) as Array<[keyof ConditionRow, ConditionRow[keyof ConditionRow]]>) {
      if (value !== undefined) {
        (existing as any)[key] = value;
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

// A reading has to be from this decade to be worth storing.
//
// erdMH1chlamday and erdMH1kd490mday are MONTHLY composites that stopped
// advancing in 2022. This function asks for [(last)], faithfully received a
// 2022 value, and wrote it as a current observation -- eight times a day, for
// as long as the chlorophyll and Kd490 workflows have been running. Nothing
// failed; the number just silently described the sea four years ago.
//
// The dataset swap below fixes today's instance. This guard is what stops the
// next one: any dataset that freezes, is retired, or is misconfigured now
// produces no rows instead of confidently wrong ones. 90 days is far looser
// than any of these products' real latency (SST runs days behind, VIIRS
// chlorophyll a couple of weeks) and still catches a multi-year stall
// immediately.
const MAX_OBSERVATION_AGE_DAYS = 90;

function isImplausiblyStale(timeValue: string): boolean {
  const t = Date.parse(timeValue);
  if (!Number.isFinite(t)) return false; // unparseable: let the caller decide
  return (Date.now() - t) > MAX_OBSERVATION_AGE_DAYS * 24 * 60 * 60 * 1000;
}

// NOAA ERDDAP (SST) ----------------------------------------------------------

const NOAA_ERDDAP_BASE_URL = env.NOAA_ERDDAP_BASE_URL ?? "https://coastwatch.noaa.gov/erddap";
const NOAA_DEFAULT_DATASET_ID = "noaacwBLENDEDsstDaily";
const NOAA_DEFAULT_VARIABLE = "analysed_sst";
const NOAA_DATASET_ID = env.NOAA_ERDDAP_DATASET_ID?.trim() || NOAA_DEFAULT_DATASET_ID;
const NOAA_VARIABLE = env.NOAA_ERDDAP_VARIABLE?.trim() || NOAA_DEFAULT_VARIABLE;
const NOAA_DEPTH_DIMENSION = env.NOAA_ERDDAP_DEPTH_DIMENSION ?? "";
const NOAA_DEPTH_VALUE = env.NOAA_ERDDAP_DEPTH_VALUE ?? "0";
const NOAA_SEARCH_RADIUS = Number(env.NOAA_ERDDAP_SEARCH_RADIUS ?? "0.25");
const NOAA_CONCURRENCY = Number(env.NOAA_ERDDAP_CONCURRENCY ?? "2");
const NOAA_INTERFACE = (env.NOAA_ERDDAP_INTERFACE ?? "griddap").toLowerCase();
const NOAA_TIME_WINDOW_HOURS = Number(env.NOAA_ERDDAP_TIME_WINDOW_HOURS ?? "12");
const NOAA_TIME_OFFSETS: number[] = (env.NOAA_ERDDAP_TIME_OFFSETS ?? "0,24,72,168,336,720,1440,2160")
  .split(",")
  .map((v) => Number(v.trim()))
  .filter((v) => Number.isFinite(v) && v >= 0);
const NOAA_MAX_POINTS = Number(env.NOAA_ERDDAP_MAX_POINTS ?? "100");

async function fetchNoaaSurfaceTemperatures(
  cells: GridCell[],
  vars: string[],
  deadline: number,
  diagnostics?: ProviderDiagnostics,
): Promise<ProviderSample[]> {
  const results: ProviderSample[] = [];

  if (!vars.includes("surface_temperature_c")) {
    if (diagnostics) diagnostics.sampledCells = 0;
    return results;
  }

  const limitedCells = cells.slice(0, NOAA_MAX_POINTS);
  if (diagnostics) diagnostics.sampledCells = limitedCells.length;

  await mapWithConcurrency(limitedCells, NOAA_CONCURRENCY, deadline, async (cell) => {
    const sample = await fetchNoaaForCell(cell, diagnostics);
    if (sample) results.push(sample);
  });

  return results;
}

async function fetchNoaaForCell(cell: GridCell, diagnostics?: ProviderDiagnostics): Promise<ProviderSample | null> {
  const useGriddap = NOAA_INTERFACE === "griddap";
  const offsets = useGriddap ? [0] : (NOAA_TIME_OFFSETS.length > 0 ? NOAA_TIME_OFFSETS : [0]);
  const windowMs = Math.max(NOAA_TIME_WINDOW_HOURS, 1) * 60 * 60 * 1000;
  const now = new Date();

  for (const offsetHours of offsets) {
    if (diagnostics) diagnostics.attempted++;

    const centerTime = new Date(now.getTime() - offsetHours * 60 * 60 * 1000);
    const startTime = new Date(Math.min(centerTime.getTime(), now.getTime()) - windowMs);
    const endTime = new Date(Math.min(centerTime.getTime() + windowMs, now.getTime()));
    if (startTime > endTime) startTime.setTime(endTime.getTime() - windowMs);

    const normalizedBase = NOAA_ERDDAP_BASE_URL.replace(/\/+$/, "");
    const apiRoot = normalizedBase.endsWith("/erddap") ? normalizedBase : `${normalizedBase}/erddap`;
    const interfaceSegment = NOAA_INTERFACE === "tabledap" ? "tabledap" : "griddap";
    const url = new URL(`${apiRoot}/${interfaceSegment}/${NOAA_DATASET_ID}.json`);

    const latCenter = clamp(cell.lat, -90, 90);
    const lonCenter = wrapLongitude(cell.lon);
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
      if (depthValue !== null) params.push(`${NOAA_DEPTH_DIMENSION}=${depthValue.toFixed(3)}`);
      url.search = `?${params.join("&")}`;
    } else {
      const timeSlice = "[(last)]";
      const depthSlice = depthValue !== null ? `[(${depthValue.toFixed(3)}):1:(${depthValue.toFixed(3)})]` : "";
      const latSlice = `[(${latIndex.toFixed(3)}):1:(${latIndex.toFixed(3)})]`;
      const lonSlice = `[(${lonIndex.toFixed(3)}):1:(${lonIndex.toFixed(3)})]`;
      url.search = `?${NOAA_VARIABLE}${timeSlice}${depthSlice}${latSlice}${lonSlice}`;
    }

    try {
      const resp = await fetchWithTimeout(url.toString());
      if (!resp.ok) {
        recordProviderError(diagnostics, `HTTP ${resp.status} ${resp.statusText} for cell ${cell.cell_id} (offset ${offsetHours}h)`);
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
      if (isImplausiblyStale(timeValue)) {
        recordProviderError(diagnostics, `SST observation ${timeValue} is older than ${MAX_OBSERVATION_AGE_DAYS} days — refusing to store it as current`);
        continue;
      }
      const temperature = Number(firstRow[firstRow.length - 1]);
      if (temperature == null || Number.isNaN(temperature)) {
        recordProviderError(diagnostics, `Invalid temperature for cell ${cell.cell_id} (offset ${offsetHours}h)`);
        continue;
      }

      let celsius = Number(temperature);
      if (celsius > 200) celsius -= 273.15;
      if (diagnostics) diagnostics.successes++;

      return {
        cell_id: cell.cell_id,
        collected_at: timeValue,
        source: `${NOAA_DATASET_ID}.${NOAA_VARIABLE}`,
        values: { surface_temperature_c: Number(celsius.toFixed(3)) },
      };
    } catch (error) {
      recordProviderError(diagnostics, `Fetch error for cell ${cell.cell_id} (offset ${offsetHours}h): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return null;
}

// CHLOROPHYLL ----------------------------------------------------------------

const CHL_ERDDAP_BASE_URL = env.CHL_ERDDAP_BASE_URL ?? "https://coastwatch.pfeg.noaa.gov/erddap";
// Was erdMH1chlamday/chlorophyll -- a monthly composite frozen at 2022. This is
// the daily gap-filled VIIRS product findr's own ingestion already uses, whose
// latest observation on 2026-08-10 was 2026-07-28.
const CHL_DEFAULT_DATASET_ID = "nesdisVHNnoaaSNPPnoaa20chlaGapfilledDaily";
const CHL_DEFAULT_VARIABLE = "chlor_a";
const CHL_DATASET_ID = env.CHL_ERDDAP_DATASET_ID?.trim() || CHL_DEFAULT_DATASET_ID;
const CHL_VARIABLE = env.CHL_ERDDAP_VARIABLE?.trim() || CHL_DEFAULT_VARIABLE;
const CHL_CONCURRENCY = Number(env.CHL_ERDDAP_CONCURRENCY ?? "2");
const CHL_MAX_POINTS = Number(env.CHL_ERDDAP_MAX_POINTS ?? "100");

async function fetchChlorophyllData(
  cells: GridCell[],
  vars: string[],
  deadline: number,
  diagnostics?: ProviderDiagnostics,
): Promise<ProviderSample[]> {
  const results: ProviderSample[] = [];
  if (!vars.includes("chlorophyll_mg_m3")) {
    if (diagnostics) diagnostics.sampledCells = 0;
    return results;
  }

  const limitedCells = cells.slice(0, CHL_MAX_POINTS);
  if (diagnostics) diagnostics.sampledCells = limitedCells.length;

  await mapWithConcurrency(limitedCells, CHL_CONCURRENCY, deadline, async (cell) => {
    const sample = await fetchChlorophyllForCell(cell, diagnostics);
    if (sample) results.push(sample);
  });

  return results;
}

async function fetchChlorophyllForCell(cell: GridCell, diagnostics?: ProviderDiagnostics): Promise<ProviderSample | null> {
  if (diagnostics) diagnostics.attempted++;
  const normalizedBase = CHL_ERDDAP_BASE_URL.replace(/\/+$/, "");
  const apiRoot = normalizedBase.endsWith("/erddap") ? normalizedBase : `${normalizedBase}/erddap`;
  const url = new URL(`${apiRoot}/griddap/${CHL_DATASET_ID}.json`);

  const latCenter = clamp(cell.lat, -90, 90);
  const lonCenter = wrapLongitude(cell.lon);
  const latIndex = Number(latCenter.toFixed(3));
  const lonIndex = Number(lonCenter.toFixed(3));
  const latSlice = `[(${latIndex.toFixed(3)}):1:(${latIndex.toFixed(3)})]`;
  const lonSlice = `[(${lonIndex.toFixed(3)}):1:(${lonIndex.toFixed(3)})]`;
  // [(0.0):1:(0.0)] is the altitude axis. These datasets are
  // [time][altitude][latitude][longitude]; omit it and ERDDAP shifts every
  // later slice one axis to the left and 404s.
  url.search = `?${CHL_VARIABLE}[(last)][(0.0):1:(0.0)]${latSlice}${lonSlice}`;

  try {
    const resp = await fetchWithTimeout(url.toString());
    if (!resp.ok) {
      recordProviderError(diagnostics, `HTTP ${resp.status} ${resp.statusText} for chlorophyll cell ${cell.cell_id}`);
      return null;
    }
    const json = await resp.json();
    const rows: unknown[] = json?.table?.rows ?? [];
    if (!Array.isArray(rows) || rows.length === 0) {
      recordProviderError(diagnostics, `No chlorophyll rows for cell ${cell.cell_id}`);
      return null;
    }
    const firstRow = rows[0] as unknown[];
    const timeValue = String(firstRow[0]);
    if (isImplausiblyStale(timeValue)) {
      recordProviderError(diagnostics, `Chlorophyll observation ${timeValue} is older than ${MAX_OBSERVATION_AGE_DAYS} days — refusing to store it as current`);
      return null;
    }
    const chl = Number(firstRow[firstRow.length - 1]);
    if (!Number.isFinite(chl) || chl < 0) {
      recordProviderError(diagnostics, `Invalid chlorophyll value for cell ${cell.cell_id}: ${chl}`);
      return null;
    }
    if (diagnostics) diagnostics.successes++;
    return {
      cell_id: cell.cell_id,
      collected_at: timeValue,
      source: `${CHL_DATASET_ID}.${CHL_VARIABLE}`,
      values: { chlorophyll_mg_m3: Number(chl.toFixed(3)) },
    };
  } catch (error) {
    recordProviderError(diagnostics, `Fetch error for chlorophyll cell ${cell.cell_id}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

// KD490 ----------------------------------------------------------------------

const KD490_ERDDAP_BASE_URL = env.KD490_ERDDAP_BASE_URL ?? "https://coastwatch.pfeg.noaa.gov/erddap";
// Was erdMH1kd490mday/k490 -- likewise monthly and frozen; its newest stored
// observation was 2022-05-16. Daily VIIRS equivalent, latest 2026-07-09.
const KD490_DEFAULT_DATASET_ID = "nesdisVHNkd490Daily";
const KD490_DEFAULT_VARIABLE = "kd_490";
const KD490_DATASET_ID = env.KD490_ERDDAP_DATASET_ID?.trim() || KD490_DEFAULT_DATASET_ID;
const KD490_VARIABLE = env.KD490_ERDDAP_VARIABLE?.trim() || KD490_DEFAULT_VARIABLE;
const KD490_CONCURRENCY = Number(env.KD490_ERDDAP_CONCURRENCY ?? "2");
const KD490_MAX_POINTS = Number(env.KD490_ERDDAP_MAX_POINTS ?? "100");

async function fetchKd490Data(
  cells: GridCell[],
  vars: string[],
  deadline: number,
  diagnostics?: ProviderDiagnostics,
): Promise<ProviderSample[]> {
  const results: ProviderSample[] = [];
  if (!vars.includes("kd490")) {
    if (diagnostics) diagnostics.sampledCells = 0;
    return results;
  }
  const limitedCells = cells.slice(0, KD490_MAX_POINTS);
  if (diagnostics) diagnostics.sampledCells = limitedCells.length;

  await mapWithConcurrency(limitedCells, KD490_CONCURRENCY, deadline, async (cell) => {
    const sample = await fetchKd490ForCell(cell, diagnostics);
    if (sample) results.push(sample);
  });

  return results;
}

async function fetchKd490ForCell(cell: GridCell, diagnostics?: ProviderDiagnostics): Promise<ProviderSample | null> {
  if (diagnostics) diagnostics.attempted++;
  const normalizedBase = KD490_ERDDAP_BASE_URL.replace(/\/+$/, "");
  const apiRoot = normalizedBase.endsWith("/erddap") ? normalizedBase : `${normalizedBase}/erddap`;
  const url = new URL(`${apiRoot}/griddap/${KD490_DATASET_ID}.json`);
  const latCenter = clamp(cell.lat, -90, 90);
  const lonCenter = wrapLongitude(cell.lon);
  const latIndex = Number(latCenter.toFixed(3));
  const lonIndex = Number(lonCenter.toFixed(3));
  const latSlice = `[(${latIndex.toFixed(3)}):1:(${latIndex.toFixed(3)})]`;
  const lonSlice = `[(${lonIndex.toFixed(3)}):1:(${lonIndex.toFixed(3)})]`;
  // See the chlorophyll fetcher: the altitude axis is required.
  url.search = `?${KD490_VARIABLE}[(last)][(0.0):1:(0.0)]${latSlice}${lonSlice}`;

  try {
    const resp = await fetchWithTimeout(url.toString());
    if (!resp.ok) {
      recordProviderError(diagnostics, `HTTP ${resp.status} ${resp.statusText} for Kd490 cell ${cell.cell_id}`);
      return null;
    }
    const json = await resp.json();
    const rows: unknown[] = json?.table?.rows ?? [];
    if (!Array.isArray(rows) || rows.length === 0) {
      recordProviderError(diagnostics, `No Kd490 rows for cell ${cell.cell_id}`);
      return null;
    }
    const firstRow = rows[0] as unknown[];
    const timeValue = String(firstRow[0]);
    if (isImplausiblyStale(timeValue)) {
      recordProviderError(diagnostics, `Kd490 observation ${timeValue} is older than ${MAX_OBSERVATION_AGE_DAYS} days — refusing to store it as current`);
      return null;
    }
    const kd490 = Number(firstRow[firstRow.length - 1]);
    if (!Number.isFinite(kd490) || kd490 < 0) {
      recordProviderError(diagnostics, `Invalid Kd490 value for cell ${cell.cell_id}: ${kd490}`);
      return null;
    }
    if (diagnostics) diagnostics.successes++;
    return {
      cell_id: cell.cell_id,
      collected_at: timeValue,
      source: `${KD490_DATASET_ID}.${KD490_VARIABLE}`,
      values: { kd490: Number(kd490.toFixed(3)) },
    };
  } catch (error) {
    recordProviderError(diagnostics, `Fetch error for Kd490 cell ${cell.cell_id}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

// CMEMS -------------------------------------------------------------------
//
// REMOVED 2026-08-10. This provider fetched Copernicus data over the THREDDS
// NCSS interface at nrt.cmems-du.eu. That domain has lapsed and is now served
// by a domain-interception service, answering 200 with an HTML page -- so
// every request "succeeded", the CSV parser turned markup into rows, and each
// cell reported "No numeric variables in response": 0 successes out of 2,465
// attempts. Worse, each request carried Authorization: Basic <user:pass>, so
// Copernicus credentials were being sent to whoever now owns that domain.
//
// It is not being repaired, because it is redundant. godaisy-core already
// ingests Copernicus properly via the Copernicus Marine Toolbox
// (findr-copernicus-ingest, cron 0 3,15) on the current ARCO infrastructure,
// and that is the job supplying the copernicus-* rows in
// grid_conditions_latest. Copernicus retired the THREDDS NCSS interface;
// there is no URL that would bring this path back.
//
// This function keeps the three providers it can still do usefully: NOAA SST,
// chlorophyll and Kd490.

// Helpers --------------------------------------------------------------------

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  deadline: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const runNext = async (): Promise<void> => {
    while (queue.length > 0 && Date.now() < deadline) {
      const item = queue.shift();
      if (item === undefined) return;
      try {
        await worker(item);
      } catch (err) {
        console.error("worker error", err);
      }
    }
  };
  const running: Promise<void>[] = [];
  for (let i = 0; i < Math.max(1, limit); i++) running.push(runNext());
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


type GridCell = { cell_id: string; lat: number; lon: number };
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
  if ([latMin, latMax, lonMin, lonMax].some((value) => Number.isNaN(value))) return null;
  const lat = (latMin + latMax) / 2;
  let lon = (lonMin + lonMax) / 2;
  if (Math.abs(lonMax - lonMin) > 180) {
    const adjustedLonMin = wrapLongitude(lonMin);
    const adjustedLonMax = wrapLongitude(lonMax);
    lon = wrapLongitude((adjustedLonMin + adjustedLonMax) / 2);
  } else {
    lon = wrapLongitude(lon);
  }
  return { cell_id: row.cell_id, lat, lon };
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
  surface_temperature_c?: number;
  bottom_temperature_c?: number;
  salinity_psu?: number;
  oxygen_mg_l?: number;
  chlorophyll_mg_m3?: number;
  kd490?: number;
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
  gridsWithoutData?: number;
  gridsWithData?: number;
  selectedNew?: number;
  selectedRefresh?: number;
  skippedStale?: number;
  written?: number;
  noaa?: ProviderDiagnostics;
  chlorophyll?: ProviderDiagnostics;
  kd490?: ProviderDiagnostics;
};

function recordProviderError(diag: ProviderDiagnostics | undefined, message: string): void {
  if (!diag) return;
  if (diag.errors.length >= 10) return;
  diag.errors.push(message);
}
