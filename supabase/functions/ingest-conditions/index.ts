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

// The Node branch is only reached outside Deno (local tooling); reading it off
// globalThis avoids both an `any` cast and a ReferenceError where `process` is
// undefined. Type-level change only -- the emitted JS is unchanged.
const env: Record<string, string | undefined> =
  typeof Deno !== "undefined" && Deno.env
    ? Deno.env.toObject()
    : (globalThis as { process?: { env?: Record<string, string> } }).process?.env ?? {};
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
// Per-request ceiling for ERDDAP. Was 5 s; measured 2026-09-24, the blended SST
// endpoint took 7.4-9.4 s per single-point request, so every fetch aborted and
// the function wrote nothing -- through pg_cron and godaisy-core's workflows
// alike -- while every invocation still returned 200. fetchWithTimeout also
// caps each request at the time left before the invocation deadline, so a
// slow request started late cannot outlive pg_net's 60 s wait or the lock.
// 25 s since requests became per-area (2026-09-25): one request now carries a
// whole tile, so letting it finish is worth more than starting another.
const HTTP_TIMEOUT_MS = Number(env.ERDDAP_HTTP_TIMEOUT_MS) || 25_000;

type IngestRequestPayload = {
  bbox?: [number, number, number, number];
  providers?: string[];
  vars?: string[];
  limit?: number;
  // Fetch and report, but write nothing. For checking a change against live
  // ERDDAP without touching grid_conditions_latest.
  dry_run?: boolean;
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
  // The variables the three providers actually supply. kd490 was missing, so
  // every pg_cron run listed KD490 as a provider and made zero Kd490 requests;
  // only godaisy-core's workflow, which passes vars itself, ever fetched it.
  // Salinity, oxygen, nutrients and phytoplankton were CMEMS's, removed
  // 2026-08-10.
  const vars = Array.isArray(payload?.vars) ? payload.vars as string[] : [
    "surface_temperature_c",
    "chlorophyll_mg_m3",
    "kd490",
  ];
  const maxPoints = Number(payload?.limit ?? env.INGEST_MAX_POINTS ?? 1000);
  const dryRun = payload?.dry_run === true;

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
    const candidateCells = rawCells
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
      dryRun,
    };

    // Batched at 500, like the freshness lookup below. This used to pass all
    // 7,649 ids to one .in(); the request was too long, the error was never
    // read, and every run reported gridsWithData: 0 while all 7,649 cells had
    // a row -- so "cells without data first" never did anything.
    const existingIds = new Set<string>();
    const cellIds = candidateCells.map((c) => c.cell_id);
    for (let i = 0; i < cellIds.length; i += 500) {
      const { data: rows, error } = await supabase
        .from("grid_conditions_latest")
        .select("cell_id")
        .in("cell_id", cellIds.slice(i, i + 500));
      if (error) {
        console.error("Existing-row lookup failed", error);
        return jsonResponse({ error: "Existing-row lookup failed", details: error.message }, 500);
      }
      for (const r of rows ?? []) existingIds.add(r.cell_id as string);
    }
    const withoutData = candidateCells.filter((c) => !existingIds.has(c.cell_id));
    const withData = candidateCells.filter((c) => existingIds.has(c.cell_id));

    shuffleInPlace(withoutData);
    shuffleInPlace(withData);

    const tiles = buildTiles([...withoutData, ...withData], maxPoints);
    const tileCells = tiles.flatMap((t) => t.cells);

    diagnostics.truncatedTo = tileCells.length;
    diagnostics.gridsWithoutData = withoutData.length;
    diagnostics.gridsWithData = withData.length;
    diagnostics.selectedNew = tileCells.filter((c) => !existingIds.has(c.cell_id)).length;
    diagnostics.selectedRefresh = tileCells.length - diagnostics.selectedNew;
    diagnostics.tiles = tiles.length;

    const sampledRows = await fetchAndSampleProviders(
      tiles,
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

    if (dryRun) {
      return jsonResponse({
        dryRun: true,
        wouldWrite: writableRows.length,
        sample: writableRows.slice(0, 5),
        diagnostics,
        durationMs: Date.now() - startedAt,
      });
    }

    if (writableRows.length === 0) {
      return jsonResponse({
        message: "Nothing to write — every cell already has a fresher reading",
        diagnostics,
        durationMs: Date.now() - startedAt,
      });
    }

    // One upsert per column set. A bulk upsert writes the union of every row's
    // keys, and a row missing one of them sends NULL for it -- so a cell that
    // got SST but not chlorophyll this run would have its stored chlorophyll
    // erased. Area requests make mixed rows the normal case, not the exception.
    const byColumns = new Map<string, ConditionRow[]>();
    for (const row of writableRows) {
      const shape = Object.keys(row).sort().join(",");
      byColumns.set(shape, [...(byColumns.get(shape) ?? []), row]);
    }
    for (const group of byColumns.values()) {
      const { error: upsertError } = await supabase
        .from("grid_conditions_latest")
        .upsert(group, { onConflict: "cell_id" });

      if (upsertError) {
        console.error("Upsert failed", upsertError);
        return jsonResponse({ error: "Failed to persist conditions", diagnostics, upsertError }, 500);
      }
    }

    return jsonResponse({ upserted: writableRows.length, diagnostics, durationMs: Date.now() - startedAt });
  } catch (error) {
    console.error("Unexpected error during ingest", error);
    return jsonResponse({ error: "Unexpected ingest error" }, 500);
  }
});

type FetchOpts = { providers: string[]; vars: string[]; deadline: number };

async function fetchAndSampleProviders(
  tiles: Tile[],
  opts: FetchOpts,
  diagnostics: IngestDiagnostics,
): Promise<ConditionRow[]> {
  const aggregator = new Map<string, ConditionRow>();

  // attempted = cells in tiles ERDDAP answered; successes = cells given a value.
  const tasks: Array<Promise<ProviderSample[]>> = [];
  if (opts.providers.includes("NOAA") && opts.vars.includes(PRODUCTS.NOAA.column)) {
    diagnostics.noaa = { sampledCells: 0, attempted: 0, successes: 0, errors: [] };
    tasks.push(fetchProduct(PRODUCTS.NOAA, tiles, opts.deadline, diagnostics.noaa));
  }
  if (opts.providers.includes("CHLOROPHYLL") && opts.vars.includes(PRODUCTS.CHLOROPHYLL.column)) {
    diagnostics.chlorophyll = { sampledCells: 0, attempted: 0, successes: 0, errors: [] };
    tasks.push(fetchProduct(PRODUCTS.CHLOROPHYLL, tiles, opts.deadline, diagnostics.chlorophyll));
  }
  if (opts.providers.includes("KD490") && opts.vars.includes(PRODUCTS.KD490.column)) {
    diagnostics.kd490 = { sampledCells: 0, attempted: 0, successes: 0, errors: [] };
    tasks.push(fetchProduct(PRODUCTS.KD490, tiles, opts.deadline, diagnostics.kd490));
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
        (existing as Record<string, unknown>)[key] = value;
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

// ERDDAP providers -----------------------------------------------------------
//
// One request per AREA, not one per cell.
//
// This used to ask ERDDAP for a single pixel per cell per variable. ERDDAP's
// cost is server-side queueing, not transfer: godaisy-core measured on
// 2026-08-09 that a single point, a 40 x 100 degree box and the whole globe all
// took ~80 s (scripts/ingestion/ingest-noaa-sst-bulk.ts). At the 7-9 s a point
// request took on 2026-09-24, a 50 s invocation managed ~24 SST and ~6
// chlorophyll requests before the deadline and wrote 0-2 cells an hour.
//
// Now the grid is split into TILE_DEGREES tiles and each request fetches the
// box covering one tile's cells at native resolution. Every pixel whose centre
// falls inside a cell contributes, and the cell stores their median. Two gains
// besides throughput: a coastal cell whose centre pixel is land no longer
// comes back empty if any of its pixels is sea, and hundreds of requests per
// run become a handful, which is what NOAA's throttling (403/429 on
// 2026-08-10) was reacting to.

const USER_AGENT = "fishfindr.eu marine data ingest (+https://fishfindr.eu)";
const TILE_DEGREES = Number(env.ERDDAP_TILE_DEGREES) || 5;

type ConditionColumn = "surface_temperature_c" | "chlorophyll_mg_m3" | "kd490";

type GriddapProduct = {
  label: string;
  baseUrl: string;
  datasetId: string;
  variable: string;
  // VIIRS products are [time][altitude][latitude][longitude]; omit the altitude
  // slice and ERDDAP shifts every later slice one axis left and 404s.
  altitudeAxis: boolean;
  column: ConditionColumn;
  concurrency: number;
  // Unit conversion and plausibility. null rejects the pixel.
  toValue: (raw: number) => number | null;
};

// Was erdMH1chlamday/erdMH1kd490mday -- monthly composites frozen at 2022. The
// daily VIIRS products below replaced them on 2026-08-10.
const PRODUCTS: Record<"NOAA" | "CHLOROPHYLL" | "KD490", GriddapProduct> = {
  NOAA: {
    label: "SST",
    baseUrl: env.NOAA_ERDDAP_BASE_URL ?? "https://coastwatch.noaa.gov/erddap",
    datasetId: env.NOAA_ERDDAP_DATASET_ID?.trim() || "noaacwBLENDEDsstDaily",
    variable: env.NOAA_ERDDAP_VARIABLE?.trim() || "analysed_sst",
    altitudeAxis: false,
    column: "surface_temperature_c",
    concurrency: Number(env.NOAA_ERDDAP_CONCURRENCY) || 1,
    toValue: (raw) => {
      const celsius = raw > 200 ? raw - 273.15 : raw;
      // Sea water freezes near -1.9 °C and nowhere exceeds ~36 °C at the surface.
      return celsius < -2.5 || celsius > 40 ? null : Number(celsius.toFixed(3));
    },
  },
  CHLOROPHYLL: {
    label: "chlorophyll",
    baseUrl: env.CHL_ERDDAP_BASE_URL ?? "https://coastwatch.pfeg.noaa.gov/erddap",
    datasetId: env.CHL_ERDDAP_DATASET_ID?.trim() || "nesdisVHNnoaaSNPPnoaa20chlaGapfilledDaily",
    variable: env.CHL_ERDDAP_VARIABLE?.trim() || "chlor_a",
    altitudeAxis: true,
    column: "chlorophyll_mg_m3",
    concurrency: Number(env.CHL_ERDDAP_CONCURRENCY) || 1,
    toValue: (raw) => (raw > 0 ? Number(raw.toFixed(3)) : null),
  },
  KD490: {
    label: "Kd490",
    baseUrl: env.KD490_ERDDAP_BASE_URL ?? "https://coastwatch.pfeg.noaa.gov/erddap",
    datasetId: env.KD490_ERDDAP_DATASET_ID?.trim() || "nesdisVHNkd490Daily",
    variable: env.KD490_ERDDAP_VARIABLE?.trim() || "kd_490",
    altitudeAxis: true,
    column: "kd490",
    concurrency: Number(env.KD490_ERDDAP_CONCURRENCY) || 1,
    toValue: (raw) => (raw > 0 ? Number(raw.toFixed(3)) : null),
  },
};

type Tile = { key: string; cells: GridCell[]; latMin: number; latMax: number; lonMin: number; lonMax: number };

function tileKeyFor(cell: GridCell): string {
  return `${Math.floor(cell.latMin / TILE_DEGREES)}:${Math.floor(cell.lonMin / TILE_DEGREES)}`;
}

// Tiles in priority order: a tile ranks by its highest-priority cell, and
// brings every candidate cell inside it along, since the extra cells cost
// nothing to fetch. Stops adding tiles once maxCells is reached, but always
// returns at least one.
function buildTiles(prioritised: GridCell[], maxCells: number): Tile[] {
  const byKey = new Map<string, Tile>();
  for (const cell of prioritised) {
    const key = tileKeyFor(cell);
    let tile = byKey.get(key);
    if (!tile) {
      tile = { key, cells: [], latMin: cell.latMin, latMax: cell.latMax, lonMin: cell.lonMin, lonMax: cell.lonMax };
      byKey.set(key, tile);
    }
    tile.cells.push(cell);
    tile.latMin = Math.min(tile.latMin, cell.latMin);
    tile.latMax = Math.max(tile.latMax, cell.latMax);
    tile.lonMin = Math.min(tile.lonMin, cell.lonMin);
    tile.lonMax = Math.max(tile.lonMax, cell.lonMax);
  }

  const selected: Tile[] = [];
  let total = 0;
  for (const tile of byKey.values()) { // Map keeps first-seen order = priority order
    if (selected.length > 0 && total + tile.cells.length > maxCells) continue;
    selected.push(tile);
    total += tile.cells.length;
  }
  return selected;
}

// Grid cells are 0.25 degrees on quarter-degree boundaries (checked
// 2026-09-25: all 7,649), so a pixel belongs to the cell keyed by its
// floored quarter-degree.
function quarterKey(lat: number, lon: number): string {
  return `${Math.floor(lat * 4 + 1e-9)}:${Math.floor(lon * 4 + 1e-9)}`;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Whether each dataset's latitude axis runs north-to-south. ERDDAP rejects a
// (min):(max) latitude range on a descending axis, and these products differ.
// Learnt from the first rejection and remembered while the instance is warm.
const latitudeDescending = new Map<string, boolean>();

async function fetchProduct(
  product: GriddapProduct,
  tiles: Tile[],
  deadline: number,
  diagnostics: ProviderDiagnostics,
): Promise<ProviderSample[]> {
  const results: ProviderSample[] = [];
  diagnostics.tiles = tiles.length;
  diagnostics.sampledCells = tiles.reduce((n, t) => n + t.cells.length, 0);
  diagnostics.requests = 0;

  await mapWithConcurrency(tiles, product.concurrency, deadline, async (tile) => {
    results.push(...await fetchProductTile(product, tile, deadline, diagnostics));
  });

  return results;
}

async function fetchProductTile(
  product: GriddapProduct,
  tile: Tile,
  deadline: number,
  diagnostics: ProviderDiagnostics,
): Promise<ProviderSample[]> {
  const normalizedBase = product.baseUrl.replace(/\/+$/, "");
  const apiRoot = normalizedBase.endsWith("/erddap") ? normalizedBase : `${normalizedBase}/erddap`;
  const lonSlice = `[(${tile.lonMin.toFixed(3)}):1:(${tile.lonMax.toFixed(3)})]`;
  const altSlice = product.altitudeAxis ? "[(0.0):1:(0.0)]" : "";

  const buildUrl = (descending: boolean): string => {
    const [a, b] = descending ? [tile.latMax, tile.latMin] : [tile.latMin, tile.latMax];
    const url = new URL(`${apiRoot}/griddap/${product.datasetId}.json`);
    url.search = `?${product.variable}[(last)]${altSlice}[(${a.toFixed(3)}):1:(${b.toFixed(3)})]${lonSlice}`;
    return url.toString();
  };

  let json: { table?: { columnNames?: string[]; rows?: unknown[][] } } | null = null;
  try {
    let descending = latitudeDescending.get(product.datasetId) ?? false;
    for (let attempt = 0; attempt < 2 && !json; attempt++) {
      diagnostics.requests = (diagnostics.requests ?? 0) + 1;
      const resp = await fetchWithTimeout(buildUrl(descending), deadline, { headers: { "User-Agent": USER_AGENT } });
      if (resp.ok) {
        json = await resp.json();
        latitudeDescending.set(product.datasetId, descending);
        break;
      }
      const body = await resp.text().catch(() => "");
      // Only an axis-order complaint is worth one retry the other way round.
      if (attempt === 0 && (resp.status === 400 || resp.status === 404) && /latitude/i.test(body)) {
        descending = !descending;
        continue;
      }
      recordProviderError(diagnostics, `HTTP ${resp.status} for ${product.label} tile ${tile.key}: ${body.slice(0, 160)}`);
      return [];
    }
  } catch (error) {
    recordProviderError(diagnostics, `Fetch error for ${product.label} tile ${tile.key}: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
  if (!json) return [];

  const names = json.table?.columnNames ?? [];
  const rows = json.table?.rows ?? [];
  const iTime = names.indexOf("time");
  const iLat = names.indexOf("latitude");
  const iLon = names.indexOf("longitude");
  const iVal = names.indexOf(product.variable);
  if ([iTime, iLat, iLon, iVal].includes(-1) || rows.length === 0) {
    recordProviderError(diagnostics, `Unexpected ${product.label} response for tile ${tile.key}: columns ${names.join(",")}, ${rows.length} rows`);
    return [];
  }

  const timeValue = String(rows[0][iTime]);
  if (isImplausiblyStale(timeValue)) {
    recordProviderError(diagnostics, `${product.label} observation ${timeValue} is older than ${MAX_OBSERVATION_AGE_DAYS} days — refusing to store it as current`);
    return [];
  }

  diagnostics.attempted += tile.cells.length;
  const cellByKey = new Map(tile.cells.map((c) => [quarterKey(c.latMin, c.lonMin), c]));
  const valuesByCell = new Map<string, number[]>();
  for (const row of rows) {
    const lat = readErddapNumber(row[iLat]);
    const lon = readErddapNumber(row[iLon]);
    const raw = readErddapNumber(row[iVal]);
    if (lat === null || lon === null || raw === null) continue; // masked pixel: missing, not zero
    const cell = cellByKey.get(quarterKey(lat, wrapLongitude(lon)));
    if (!cell) continue;
    const value = product.toValue(raw);
    if (value === null) continue;
    const list = valuesByCell.get(cell.cell_id) ?? [];
    list.push(value);
    valuesByCell.set(cell.cell_id, list);
  }

  const samples: ProviderSample[] = [];
  for (const [cellId, values] of valuesByCell) {
    samples.push({
      cell_id: cellId,
      collected_at: timeValue,
      source: `${product.datasetId}.${product.variable}`,
      values: { [product.column]: Number(median(values).toFixed(3)) },
    });
  }
  diagnostics.successes += samples.length;
  return samples;
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

async function fetchWithTimeout(url: string, deadline: number, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutMs = Math.max(0, Math.min(HTTP_TIMEOUT_MS, deadline - Date.now()));
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
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

// ERDDAP's JSON encodes a masked or missing pixel as `null`, and
// Number(null) is 0, not NaN -- so a NaN check passes it straight through.
// That stored 0.0 °C for hundreds of tropical coastal cells from 2026-09-15,
// plus zero chlorophyll and Kd490, all indistinguishable from real readings.
// Anything that is not already a finite number is missing, never zero.
function readErddapNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}


type GridCell = {
  cell_id: string;
  lat: number;
  lon: number;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
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
  return { cell_id: row.cell_id, lat, lon, latMin, latMax, lonMin, lonMax };
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
  tiles?: number;
  requests?: number;
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
  tiles?: number;
  dryRun?: boolean;
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
