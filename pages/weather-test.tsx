import React, { useState, useEffect } from "react";
import { useForecastData } from "../lib/useForecastData";
import TopTabs from "../components/TopTabs";
import HomeDayTabs from "../components/HomeDayTabs";
import MarineDayTabs from "../components/MarineDayTabs";
import ForecastCards from "../components/ForecastCards";
import MarineTable from "../components/MarineTable";
import ActivityOutlooks from "../components/ActivityOutlooks";

// --- TypeScript interfaces (sample) ---
interface Slot {
  time: string;
  [key: string]: any;
}

interface MarineRow {
  iso: string;
  water?: number;
  wave?: number;
  wind?: number;
  [key: string]: any;
}

interface ForecastData {
  slots: Slot[][];
}

interface MarineForecastData {
  marine: MarineRow[][];
}

const mainLocation = "your-main-location-id";
const coastalLocation = "your-coastal-location-id";

const WeatherPage: React.FC = () => {
  const mainForecast = useForecastData<ForecastData>(mainLocation);
  const coastalForecast = useForecastData<MarineForecastData>(coastalLocation);

  const [tab, setTab] = useState<"home" | "marine" | "activity">("home");
  const [homeIdx, setHomeIdx] = useState(0);
  const [marineIdx, setMarineIdx] = useState(0);

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);
  if (!hasMounted) return null;

  const homeSlots = mainForecast?.slots || [];
  const marineDays = coastalForecast?.marine || [];
  const currentMarineRows: MarineRow[] = (Array.isArray(marineDays) && marineDays[marineIdx]) ? marineDays[marineIdx] : [];

  if (!homeSlots.length && !marineDays.length) {
    return (
      <section className="page">
        <div>Loading weather and marine data…</div>
      </section>
    );
  }

  return (
    <section className="page">
      {/* Top main navigation tabs */}
      <nav className="top-tabs" aria-label="Main navigation tabs">
        <TopTabs active={tab} onTabChange={setTab} />
      </nav>

      {/* HOME TAB: Daily weather forecast */}
      {tab === "home" && (
        <>
          <nav className="day-tabs" aria-label="Weather forecast day tabs">
            <HomeDayTabs activeIdx={homeIdx} onChange={setHomeIdx} />
          </nav>
          <div className="main-grid" role="region" aria-live="polite" aria-label="Daily weather forecast cards">
            {(homeSlots[homeIdx] && homeSlots[homeIdx].length > 0) ? (
              homeSlots[homeIdx].map((slot, index) => (
                <div key={index} className="homepage-card">
                  <ForecastCards slots={[slot]} />
                </div>
              ))
            ) : (
              <div>No forecast available for this day.</div>
            )}
          </div>
        </>
      )}

      {/* MARINE TAB: Marine forecast */}
      {tab === "marine" && (
        <>
          <nav className="day-tabs" aria-label="Marine forecast day tabs">
            <MarineDayTabs activeIdx={marineIdx} onChange={setMarineIdx} />
          </nav>
          <div className="main-grid marine-table-wrapper" role="region" aria-live="polite" aria-label="Marine data table">
            {currentMarineRows && currentMarineRows.length > 0 ? (
              <MarineTable rows={currentMarineRows} />
            ) : (
              <div>No marine data available for this day.</div>
            )}
          </div>
        </>
      )}

      {/* ACTIVITY TAB: Surf and wind outlooks */}
      {tab === "activity" && (
        <div className="activity-grid" role="region" aria-live="polite" aria-label="Activity outlooks">
          <ActivityOutlooks
            midday={
              homeSlots[homeIdx]
                ? homeSlots[homeIdx].find(slot => slot.time === "midday") || null
                : null
            }
          />
        </div>
      )}
    </section>
  );
};

export default WeatherPage;
