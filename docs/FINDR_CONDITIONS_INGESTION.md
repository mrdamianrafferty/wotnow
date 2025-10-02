# FINDR conditions ingestion

This script hydrates the `findr_conditions_snapshots` table with fresh marine and bio data for each rectangle used by the FINDR experience.

## Prerequisites

- Stormglass API key exposed as `STORMGLASS_SECRET_KEY` (preferred) or `STORMGLASS_API_KEY` (optional but strongly recommended). Without it the script will rely on MET Norway and Open-Meteo only, leaving tide and bio metrics empty for gaps the MET probes cannot cover.
- Supabase project URL (`SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`)
- Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`) with insert access to `findr_conditions_snapshots`

## Running a manual backfill

Use the bundled script from the project root:

```bash
STORMGLASS_SECRET_KEY=your-key \
SUPABASE_URL=https://project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=service-role \
npx tsx scripts/ingestFindrConditions.ts
```

Optional environment variables:

- `FINDR_CONDITIONS_LIMIT` — only process the first `n` rectangles (useful for smoke tests)
- `FINDR_CONDITIONS_DELAY_MS` — override the per-rectangle delay (default 300 ms)
- `FINDR_MET_ONLY` — set to `1` to disable both Open-Meteo and Stormglass fallbacks and surface raw MET Norway coverage (handy for bounce runs, quota debugging, or provider audits)
- `FINDR_MET_SIMPLE_PROBES` — set to `1` to skip the extended MET nudge pattern and only request the base coastal coordinates (primary/sample/fallback)

The script logs each rectangle as it is processed and produces a final summary indicating how many snapshots were written successfully.

### MET Norway probing strategy

- Rectangles are sourced from Supabase (`findr_rectangles`) and enriched with any coastal sample lat/lon stored there. If that data is missing, the script falls back to the curated CSV inside `lib/findr/fallbackRectangles.ts`.
- When a MET Norway request returns no data, the script now automatically "nudges" the probe position around the target cell before giving up. The sequence is:
	1. Primary sample (Supabase coastal sample or fallback centre)
	2. Cardinal offsets ±0.18° (east, west, north, south)
	3. Diagonal offsets ±0.26° (NE, NW, SE, SW)
- If the base nudges still miss, the script escalates with wider sweeps for every rectangle: longitude hops of ±0.45° and ±0.75° combined with ±0.25° latitude adjustments, ±0.45° latitude-only hops, and a gentle ±0.25° onshore/offshore shift.
- Each attempt is logged with the probe label, for example `primary:east@0.18` or `fallback-center:north@0.18`. If any probe succeeds, the MET payload is used and the script continues without touching other providers.
- After all probes fail the script reports `No MET Norway marine data for rectangle ... after N probes`. If `FINDR_MET_ONLY=1`, processing stops there. Otherwise the script first requests Open-Meteo's marine feed; Stormglass is only contacted when both MET and Open-Meteo return void.
- Combine `FINDR_MET_ONLY=1` with a low `FINDR_CONDITIONS_LIMIT` (for example 10) to quickly spot regional MET voids from the log output.
- Every run ends with a coverage summary: total rectangles served by MET, those caught by Open-Meteo, the remaining Stormglass fallbacks, any unresolved voids, and region-by-region counts so you can see where each provider is carrying the load.

## Scheduling guidance

- **Frequency:** Hourly provides timely updates without exhausting Stormglass quotas. Adjust cadence to match available API allowance.
- **Runner:** Any cron-friendly environment works (Supabase Edge Functions cron, GitHub Actions, Vercel cron job, Fly.io machines, etc.). Ensure the environment supports Node 18+ for native `fetch`.
- **Observability:** Capture stdout/stderr from the script. Failures are safe to retry; the script upserts by `(rectangle_code, captured_at)` so reruns of the same slot will overwrite rather than duplicate rows.
- **Rate limiting:** A small delay (300 ms) is inserted between rectangles to stay within third-party request bursts (mainly Stormglass).

### Default GitHub Actions cadence

Two scheduled workflows ship with the repository to keep marine rectangles fresh without hammering provider quotas:

| Workflow | Schedule | Command | Provider behaviour |
| --- | --- | --- | --- |
| `FINDR MET Norway ingestion (4x daily)` | Every 6 hours (`0 */6 * * *`) | `FINDR_MET_ONLY=1 FINDR_MET_SIMPLE_PROBES=1 npx tsx scripts/ingestFindrConditions.ts` | Refreshes the MET Norway payloads frequently while skipping Open-Meteo and Stormglass entirely. |
| `FINDR Open-Meteo ingestion (daily)` | Daily at 02:30 UTC (`30 2 * * *`) | `FINDR_MET_SIMPLE_PROBES=1 npx tsx scripts/ingestFindrConditions.ts` | Allows Open-Meteo fallbacks to update rectangles that MET Norway cannot cover; no Stormglass key is required. |

> Make sure repository secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are populated so both workflows can authenticate. Provide `STORMGLASS_SECRET_KEY` only if you need the Stormglass fallback.

## Batched long-run ingestion

When Stormglass quota is tight you can let the script pace itself automatically. Run the batched variant, which ingests a small group then sleeps:

```bash
npx tsx scripts/ingestFindrConditionsBatched.ts
```

Configurable environment variables:

- `FINDR_CONDITIONS_BATCH_SIZE` — rectangles per batch (default 20)
- `FINDR_CONDITIONS_INTERVAL_MINUTES` — pause between batches (default 30 minutes)
- `FINDR_CONDITIONS_DELAY_MS` — delay between individual rectangle requests (default 300 ms)
- `FINDR_CONDITIONS_TOTAL` — total rectangles to process (defaults to the full catalogue)

The script keeps running until all batches finish, logging progress and when the next batch will begin.

## Next steps

- Consider persisting the raw Stormglass payloads in object storage for replay/debugging.
- Pipe completion metrics into your monitoring system (e.g. Datadog, Supabase logs) once the cron is live.
