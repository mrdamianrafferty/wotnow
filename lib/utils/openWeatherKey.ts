/**
 * Server-only accessor for the OpenWeather API key.
 *
 * Resolution order:
 *   1. OPENWEATHER_KEY          — canonical server-only name (set this going forward)
 *   2. OPENWEATHER_API_KEY      — legacy name used by the Grow Daisy paths
 *   3. NEXT_PUBLIC_OPENWEATHER_KEY — legacy public name (to be retired)
 *
 * Setting OPENWEATHER_KEY alone therefore covers every runtime reader. Do NOT
 * import this from client components — the NEXT_PUBLIC_ fallback would re-inline
 * the key into the client bundle, which is exactly what this migration removes.
 */
export function getOpenWeatherKey(): string | undefined {
  return (
    process.env.OPENWEATHER_KEY ||
    process.env.OPENWEATHER_API_KEY ||
    process.env.NEXT_PUBLIC_OPENWEATHER_KEY
  );
}
