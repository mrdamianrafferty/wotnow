import Image from "next/image";
import dayjs from "dayjs";
import type { OWMForecastSlot } from "@/lib/types";

export default function ForecastCards({ slots }: { slots: OWMForecastSlot[] }) {
  return (
    <section className="forecast-grid">
      {slots.map(s => {
        const t = dayjs.unix(s.dt);
        const precip = s.rain?.["3h"] ?? s.snow?.["3h"] ?? 0;
        const popPct = Math.round(s.pop * 100);

        return (
          <article key={s.dt} className="card" aria-label={s.weather[0].description}>
            <header>{t.format("ddd HH:mm")}</header>
            <Image
              src={`https://openweathermap.org/img/wn/${s.weather[0].icon}@2x.png`}
              width={64}
              height={64}
              alt={s.weather[0].description}
            />
            <p className="temp">{Math.round(s.main.temp)}°</p>
            <p className="wind">
              💨 {s.wind.speed.toFixed(1)} m/s{" "}
              {s.wind.gust && (
                <small>gust {s.wind.gust.toFixed(1)} m/s</small>
              )}
            </p>
            <p className="precip">
              🌧 {precip.toFixed(1)} mm <small>({popPct}% )</small>
            </p>
          </article>
        );
      })}
    </section>
  );
}
