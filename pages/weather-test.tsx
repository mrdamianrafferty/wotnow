/* app/weather/page.tsx */
import { useState, useMemo, useEffect } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);
import TopTabs         from "../components/TopTabs";
import HomeDayTabs     from "../components/HomeDayTabs";
import ForecastCards   from "../components/ForecastCards";
import MarineDayTabs   from "../components/MarineDayTabs.tsx";
import MarineTable     from "../components/MarineTable";
import WaterTempKey    from "../components/WaterTempKey";
import ActivityOutlooks from "../components/ActivityOutlooks";
import { useForecastData } from "../lib/useForecastData";
import { useUserPreferences } from "../context/UserPreferencesContext";
import type { OWMForecastSlot, MarineRow } from "../lib/types";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function WeatherPage() {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);

  // Always call hooks, even before mount!
  const { preferences } = useUserPreferences();
  const mainLocation = preferences.locations?.find(l => l.type === "main") || preferences.location;
  const coastalLocation = preferences.locations?.find(l => l.type === "coastal");
  const mainForecast = useForecastData(mainLocation?.lat, mainLocation?.lon);
  const coastalForecast = useForecastData(coastalLocation?.lat, coastalLocation?.lon);

  const slots = mainForecast.slots;
  const marine = coastalForecast.marine;
  const loading = mainForecast.loading || coastalForecast.loading;

  const [tab, setTab] = useState<"home" | "marine" | "activity">("home");
  const [homeIdx, setHomeIdx] = useState(0);
  const [marineIdx, setMarineIdx] = useState(0);

  const homeSlots: OWMForecastSlot[] = useMemo(() => {
    const start = dayjs().startOf("day").add(homeIdx, "day");
    const end = start.add(1, "day");
    return slots.filter(s => dayjs.unix(s.dt).isBetween(start, end, null, "[)"));
  }, [slots, homeIdx]);

  const marineRows: MarineRow[] = marine[marineIdx] ?? [];

  // Only use hasMounted to control what you render, not to skip hooks!
  if (!hasMounted) return <main />;

  return (
    <main className="page">
      <div style={{ marginBottom: "2rem" }}>
        <TopTabs active={tab} onTabChange={setTab} />
      </div>

      {/* ---------- HOME ---------- */}
      <section
        hidden={tab !== "home"}
        className="homepage-section"
        style={{
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          padding: "2rem",
          marginBottom: "2rem",
        }}
      >
        <HomeDayTabs activeIdx={homeIdx} onChange={setHomeIdx} />
        <div className="main-grid">
          <ForecastCards slots={homeSlots} />
        </div>
      </section>

      {/* ---------- MARINE ---------- */}
      <section
        hidden={tab !== "marine"}
        className="marine-section"
        style={{
          background: "#f8fafc",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          padding: "2rem",
          marginBottom: "2rem",
        }}
      >
        <MarineDayTabs activeIdx={marineIdx} onChange={setMarineIdx} />
        <div className="main-grid">
          {marineRows.map((row, idx) => (
            <div className="marine-card" key={idx}>
              <div className="marine-card-header">
                <span className="marine-card-time">{formatTime(row.iso)}</span>
                <span className="marine-card-temp">{row.water}°C</span>
              </div>
              <div className="marine-card-divider" />
              <div className="marine-card-stats">
                <div>
                  <div className="marine-card-stat-label">Wave Height</div>
                  <div className="marine-card-stat-value">{row.wave} m</div>
                </div>
                <div>
                  <div className="marine-card-stat-label">Wind Speed</div>
                  <div className="marine-card-stat-value">{row.wind} m/s</div>
                </div>
                <div>
                  <div className="marine-card-stat-label">Wind Gust</div>
                  <div className="marine-card-stat-value">{row.gust} m/s</div>
                </div>
                <div>
                  <div className="marine-card-stat-label">Swell Height</div>
                  <div className="marine-card-stat-value">{row.swell} m</div>
                </div>
                <div>
                  <div className="marine-card-stat-label">Swell Direction</div>
                  <div className="marine-card-stat-value">{row.swellDir}°</div>
                </div>
                <div>
                  <div className="marine-card-stat-label">Swell Period</div>
                  <div className="marine-card-stat-value">{row.period} s</div>
                </div>
                <div>
                  <div className="marine-card-stat-label">Visibility</div>
                  <div className="marine-card-stat-value">{row.vis} km</div>
                </div>
                <div>
                  <div className="marine-card-stat-label">Current Speed</div>
                  <div className="marine-card-stat-value">{row.current} m/s</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <WaterTempKey />
      </section>

      {/* ---------- ACTIVITY ---------- */}
      <section
        hidden={tab !== "activity"}
        className="activity-section"
        style={{
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          padding: "2rem",
        }}
      >
        <ActivityOutlooks rows={marineRows} />
      </section>
    </main>
  );
}
