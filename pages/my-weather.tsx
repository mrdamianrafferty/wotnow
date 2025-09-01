// pages/my-weather.tsx
// Next.js + DaisyUI weather page (Apple Weather–style)
// Uses your /api/unified-weather route and renders a clean, responsive UX.
// Safe for SSR (no window access before mount). Client-only fetch via SWR.

import * as React from 'react'
import useSWR from 'swr'

// ---------------- Types (align with your /api/unified-weather shape) ----------------
type Hour = {
  timeISO: string
  tempC?: number
  pop?: number // 0..1
  windMS?: number
  windDeg?: number
  precipMM?: number
  icon?: string
}

type Day = {
  dateISO: string
  minC?: number
  maxC?: number
  pop?: number
  summary?: string
  icon?: string
}

type Tides = {
  time: string
  type: 'high' | 'low'
  height: number | null
}[]

type Marine = {
  waveHeight?: number | null
  waveDirection?: number | null
  wavePeriod?: number | null
  swellHeight?: number | null
  swellDirection?: number | null
  swellPeriod?: number | null
}

type UnifiedWeather = {
  // core current
  name?: string
  lat: number
  lon: number
  isMarine?: boolean
  temperatureC?: number
  feelsLikeC?: number
  humidityPct?: number
  pressureHpa?: number
  windSpeedMS?: number
  windGustMS?: number
  windDeg?: number
  visibilityKm?: number
  uvi?: number
  cloudsPct?: number
  description?: string
  icon?: string

  // series
  hourly?: Hour[]
  daily?: Day[]

  // marine
  marine?: Marine
  tides?: Tides
}

// ---------------- Helpers ----------------
const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
})

function useMounted() {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  return mounted
}

function fmtTimeShort(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function degToCardinal(deg?: number) {
  if (deg == null) return ''
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
  const i = Math.round((deg % 360) / 22.5) % 16
  return dirs[i]
}

function msToKts(v?: number) { return v == null ? undefined : Math.round(v * 1.94384) }
function msToMph(v?: number) { return v == null ? undefined : Math.round(v * 2.23694) }

// Pull “home” + “coastal” from localStorage if present (fallback to Gijón area)
function getDefaultLocations(): { label: string; lat: number; lon: number; mode: 'land'|'marine' }[] {
  if (typeof window !== 'undefined') {
    const homeLat = Number(localStorage.getItem('homeLat'))
    const homeLon = Number(localStorage.getItem('homeLon'))
    const coastLat = Number(localStorage.getItem('coastLat'))
    const coastLon = Number(localStorage.getItem('coastLon'))
    if (Number.isFinite(homeLat) && Number.isFinite(homeLon) && Number.isFinite(coastLat) && Number.isFinite(coastLon)) {
      return [
        { label: 'Home', lat: homeLat, lon: homeLon, mode: 'land' },
        { label: 'Coastal', lat: coastLat, lon: coastLon, mode: 'marine' },
      ]
    }
  }
  // sensible defaults (Gijón, ES)
  return [
    { label: 'Home', lat: 43.535, lon: -5.661, mode: 'land' },
    { label: 'Coastal', lat: 43.545, lon: -5.635, mode: 'marine' },
  ]
}

// ---------------- Tiny background clouds (your CSS class) ----------------
const CloudBG: React.FC = () => (
  <div
    className="pointer-events-none absolute inset-0 wa-clouds"
    aria-hidden
  />
)

// ---------------- UI Pieces ----------------
const HeaderBar: React.FC<{ title?: string; activeIdx: number; setActiveIdx: (i:number)=>void; locations: {label:string}[]; showAll: boolean; setShowAll:(v:boolean)=>void; }> = ({ title='Weather', activeIdx, setActiveIdx, locations, showAll, setShowAll }) => {
  return (
    <div className="navbar bg-base-100 sticky top-0 z-30 shadow-sm">
      <div className="flex-1">
        <span className="text-xl font-semibold">{title}</span>
      </div>
      <div className="flex-none gap-2">
        {/* Location toggle group (Apple left stack vibe) */}
        <div className="join hidden sm:inline-flex">
          {locations.map((loc, i) => (
            <button
              key={loc.label}
              onClick={() => setActiveIdx(i)}
              className={`btn btn-sm join-item ${i===activeIdx ? 'btn-primary' : 'btn-ghost'}`}
            >
              {loc.label}
            </button>
          ))}
        </div>
        {/* Show all = swipe between locations (full screen mode) */}
        <label className="label cursor-pointer gap-2 px-2">
          <span className="label-text">Show one at a time</span>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={!showAll}
            onChange={(e)=>setShowAll(!e.target.checked)}
          />
        </label>
      </div>
    </div>
  )
}

const CurrentSummary: React.FC<{ d?: UnifiedWeather }> = ({ d }) => {
  if (!d) return <div className="skeleton h-24 w-full" />
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-4 sm:p-6">
        <div className="flex items-end gap-4">
          <div className="text-5xl sm:text-6xl font-bold">
            {Math.round(d.temperatureC ?? 0)}°
          </div>
          <div className="text-sm opacity-80">
            <div className="capitalize">{d.description || '—'}</div>
            <div>Feels {Math.round(d.feelsLikeC ?? d.temperatureC ?? 0)}°</div>
          </div>
          <div className="ml-auto grid grid-cols-2 gap-x-6 gap-y-1 text-sm opacity-80">
            <div>Humidity</div><div className="text-right">{d.humidityPct ?? '—'}%</div>
            <div>Pressure</div><div className="text-right">{d.pressureHpa ?? '—'} hPa</div>
            <div>UV</div><div className="text-right">{d.uvi ?? '—'}</div>
          </div>
        </div>
        <div className="mt-3 text-sm opacity-80">
          Wind {msToKts(d.windSpeedMS)} kt ({msToMph(d.windSpeedMS)} mph) {degToCardinal(d.windDeg)}
          {d.windGustMS ? <> • Gusts {msToKts(d.windGustMS)} kt</> : null}
          {d.visibilityKm ? <> • Vis {d.visibilityKm} km</> : null}
          {d.cloudsPct != null ? <> • Clouds {d.cloudsPct}%</> : null}
        </div>
      </div>
    </div>
  )
}

const HourlyStrip: React.FC<{ hours?: Hour[] }> = ({ hours }) => {
  if (!hours?.length) return null
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-4 sm:p-6">
        <h3 className="card-title mb-2">Hourly</h3>
        <div className="overflow-x-auto">
          <div className="flex gap-3">
            {hours.slice(0, 24).map((h, idx) => (
              <div key={idx} className="min-w-[72px] rounded-box p-3 bg-base-200/60 text-center">
                <div className="text-xs opacity-70">{fmtTimeShort(h.timeISO)}</div>
                <div className="text-lg font-semibold">{Math.round(h.tempC ?? 0)}°</div>
                <div className="text-xs opacity-70">💧{Math.round((h.pop ?? 0)*100)}%</div>
                {typeof h.windMS === 'number' && (
                  <div className="text-[11px] opacity-70 mt-1">
                    {msToKts(h.windMS)}kt {degToCardinal(h.windDeg)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const DailyTable: React.FC<{ days?: Day[] }> = ({ days }) => {
  if (!days?.length) return null
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-0">
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th className="w-1/3 sm:w-1/4">Day</th>
                <th>Min</th>
                <th>Max</th>
                <th>PoP</th>
                <th className="hidden sm:table-cell">Summary</th>
              </tr>
            </thead>
            <tbody>
              {days.slice(0, 8).map((d, i) => {
                const day = new Date(d.dateISO)
                const label = day.toLocaleDateString([], { weekday: 'short' })
                return (
                  <tr key={i}>
                    <td>{label}</td>
                    <td>{Math.round(d.minC ?? 0)}°</td>
                    <td>{Math.round(d.maxC ?? 0)}°</td>
                    <td>{Math.round((d.pop ?? 0) * 100)}%</td>
                    <td className="hidden sm:table-cell">{d.summary ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const WindCard: React.FC<{ d?: UnifiedWeather }> = ({ d }) => {
  if (!d) return null
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-4 sm:p-6">
        <h3 className="card-title mb-2">Wind</h3>
        <div className="stats stats-vertical sm:stats-horizontal shadow bg-base-200/50">
          <div className="stat">
            <div className="stat-title">Speed</div>
            <div className="stat-value text-xl">{msToKts(d.windSpeedMS) ?? '—'} kt</div>
            <div className="stat-desc">{msToMph(d.windSpeedMS)} mph</div>
          </div>
          <div className="stat">
            <div className="stat-title">Gusts</div>
            <div className="stat-value text-xl">{msToKts(d.windGustMS) ?? '—'} kt</div>
            <div className="stat-desc">{msToMph(d.windGustMS)} mph</div>
          </div>
          <div className="stat">
            <div className="stat-title">Direction</div>
            <div className="stat-value text-xl">{degToCardinal(d.windDeg) || '—'}</div>
            <div className="stat-desc">{d.windDeg ?? '—'}°</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const WavesCard: React.FC<{ m?: Marine }> = ({ m }) => {
  if (!m) return null
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-4 sm:p-6">
        <h3 className="card-title mb-2">Waves</h3>
        <div className="stats stats-vertical sm:stats-horizontal shadow bg-base-200/50">
          <div className="stat">
            <div className="stat-title">Wave Height</div>
            <div className="stat-value text-xl">{m.waveHeight ?? '—'} m</div>
            <div className="stat-desc">Period {m.wavePeriod ?? '—'} s</div>
          </div>
          <div className="stat">
            <div className="stat-title">Wave Dir</div>
            <div className="stat-value text-xl">{degToCardinal(m.waveDirection ?? undefined) || '—'}</div>
            <div className="stat-desc">{m.waveDirection ?? '—'}°</div>
          </div>
          <div className="stat">
            <div className="stat-title">Swell</div>
            <div className="stat-value text-xl">{m.swellHeight ?? '—'} m</div>
            <div className="stat-desc">Dir {degToCardinal(m.swellDirection ?? undefined) || '—'} • {m.swellPeriod ?? '—'} s</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const TidesCard: React.FC<{ tides?: Tides }> = ({ tides }) => {
  if (!tides?.length) return null
  // next two highs/lows
  const now = Date.now()
  const upcoming = tides
    .map(t => ({ ...t, ts: new Date(t.time).getTime() }))
    .filter(t => t.ts >= now)
    .slice(0, 4)

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-4 sm:p-6">
        <h3 className="card-title mb-2">Tides</h3>
        {upcoming.length ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>Height</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((t, i) => (
                  <tr key={i}>
                    <td>{fmtTimeShort(t.time)}</td>
                    <td className="capitalize">{t.type}</td>
                    <td>{t.height ?? '—'} m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm opacity-80">No tide data.</div>
        )}
      </div>
    </div>
  )
}

// ---------------- Data fetch wrapper ----------------
function useUnified(lat: number, lon: number, mode: 'land'|'marine') {
  const mounted = useMounted()
  const key = mounted
    ? `/api/unified-weather?lat=${lat}&lon=${lon}&mode=${mode}&units=metric`
    : null
  const { data, error, isLoading } = useSWR<UnifiedWeather>(key, fetcher, {
    revalidateOnFocus: false,
  })
  return { data, error, isLoading }
}

// ---------------- Main Page ----------------
export default function MyWeatherPage() {
  const mounted = useMounted()
  const [locations] = React.useState(getDefaultLocations())
  const [activeIdx, setActiveIdx] = React.useState(0)
  const [showAll, setShowAll] = React.useState(true) // show both side-by-side (lg) / stacked (sm)

  // Decide which locations to render
  const toRender = showAll ? locations : [locations[activeIdx]]

  return (
    <div className="relative min-h-screen">
      {/* Background clouds */}
      <CloudBG />

      {/* Header */}
      <HeaderBar
        title="Weather"
        activeIdx={activeIdx}
        setActiveIdx={setActiveIdx}
        locations={locations}
        showAll={showAll}
        setShowAll={setShowAll}
      />

      {/* Content */}
      <main className="mx-auto max-w-6xl px-3 sm:px-6 py-4 sm:py-6">
        {!mounted ? (
          <div className="grid gap-4">
            <div className="skeleton h-24" />
            <div className="skeleton h-48" />
            <div className="skeleton h-64" />
          </div>
        ) : (
          <div className={`grid gap-6 ${showAll ? 'lg:grid-cols-2' : ''}`}>
            {toRender.map((loc, i) => (
              <LocationColumn key={`${loc.label}-${i}`} {...loc} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

const LocationColumn: React.FC<{ label: string; lat: number; lon: number; mode: 'land'|'marine' }> = ({ label, lat, lon, mode }) => {
  const { data, error, isLoading } = useUnified(lat, lon, mode)

  return (
    <section className="grid gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{label}</h2>
        <span className="badge">{mode === 'marine' ? 'Coastal' : 'Land'}</span>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>Failed to load weather for {label}.</span>
        </div>
      )}

      {isLoading && !data ? (
        <div className="grid gap-4">
          <div className="skeleton h-24" />
          <div className="skeleton h-40" />
          <div className="skeleton h-64" />
        </div>
      ) : (
        <>
          <CurrentSummary d={data ?? undefined} />
          <HourlyStrip hours={data?.hourly} />
          <DailyTable days={data?.daily} />

          {/* Cards row */}
          <div className="grid sm:grid-cols-2 gap-4">
            <WindCard d={data ?? undefined} />
            {mode === 'marine' ? (
              <>
                <WavesCard m={data?.marine} />
                <TidesCard tides={data?.tides} />
              </>
            ) : (
              // Land column can use UV/air quality cards later — placeholders:
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body p-4 sm:p-6">
                  <h3 className="card-title mb-2">Air / UV</h3>
                  <div className="text-sm opacity-80">
                    UV index: {data?.uvi ?? '—'} (OpenWeather) <br />
                    Pollen / AQI (Open-Meteo): coming next iteration.
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

/*
Notes:
- This page expects your API route /api/unified-weather to provide merged data.
- “Show one at a time” toggle collapses to a single column; switch locations via the joined buttons (Apple Weather behaviour analogue).
- Cloud background uses your .wa-clouds CSS class (already included). Keep windwave.css loaded in _app.tsx.
- Replace emoji with your icon set later. Add precipitation radar or map as a third column when ready.
*/