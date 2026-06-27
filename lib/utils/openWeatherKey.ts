/**
 * Server-only accessor for the OpenWeather API key.
 *
 * Prefers the server-only `OPENWEATHER_KEY` and falls back to the legacy
 * `NEXT_PUBLIC_OPENWEATHER_KEY` so existing deployments keep working until the
 * env var is renamed in Vercel. Do NOT import this from client components — the
 * NEXT_PUBLIC_ fallback would re-inline the key into the client bundle, which is
 * exactly what this migration removes.
 */
export function getOpenWeatherKey(): string | undefined {
  return process.env.OPENWEATHER_KEY || process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
}
