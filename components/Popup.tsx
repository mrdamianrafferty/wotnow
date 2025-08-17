// src/components/Popup.tsx

import React, { useEffect, useState, useRef } from 'react';
import '../styles/Popup.css';
import { getActivityEmoji, getAssessmentEmoji } from '../data/emojiMap';
import { getActivityMessage } from '../data/activityMessages';
import { MARINE_ACTIVITY_IDS } from '../utils/activityHelpers';
import bgMap from '../data/bgMap';
import SwellArrow from './SwellArrow';
import WindDirectionIcon from './WindDirectionIcon';
import html2canvas from 'html2canvas';
import { getCompassDirection } from '../utils/weatherLabels';
import { classifyWindRelative, computeSimulatedOrientation, resolveBeachOrientationAsync } from '../utils/orientation';
import { getBeaufortNumber } from '../utils/beaufort';
import { mpsToKnots, mpsToKmh } from '../utils/weatherUtils';

// --- Types ---
// All windSpeed fields are in meters per second (m/s) throughout the pipeline.
interface MarineData {
  waveHeight?: number;
  /** Wind speed in m/s (meters per second) */
  windSpeed?: number;
  waterTemperature?: number;
  swellHeight?: number;
  swellPeriod?: number;
  gust?: number;
  windDir?: number;
  swellDir?: number;
  vis?: number;
  beachOrientation?: number;
}

// All windSpeed fields are in meters per second (m/s) throughout the pipeline.
interface WeatherData {
  description?: string;
  temperature?: number;
  tempMin?: number;
  tempMax?: number;
  /** Wind speed in m/s (meters per second) */
  windSpeed?: number;
  windDir?: number;
  humidity?: number;
  precipitation?: number;
  beachOrientation?: number;
  icon?: string;
}

type Category = 'perfect' | 'good' | 'fair' | 'poor';

interface PopupProps {
  activityId: string;
  title: string;
  category: Category;
  message?: string;
  marineData?: MarineData;
  weatherData?: WeatherData;
  score?: number;
  onClose: () => void;
  coastalLocation?: { lat: number; lon: number };
  homeLocation?: { lat: number; lon: number };
  dayTimestamp?: number;
}

// ---- WhatsApp/Web Share helpers (inline; no new files) ----
type SharePayload = {
  title?: string;
  text?: string;
  url?: string;
  imageUrl?: string;
  phone?: string;
};

const PUBLIC_SITE_URL = (typeof window === 'undefined'
  ? process.env.NEXT_PUBLIC_SITE_URL
  : (process.env.NEXT_PUBLIC_SITE_URL || 'https://wotnow.vercel.app'));

const _isSecure = typeof window !== 'undefined' && window.isSecureContext;

async function imageUrlToFile(imageUrl?: string): Promise<File | undefined> {
  if (!imageUrl || !_isSecure) return undefined;
  try {
    const res = await fetch(imageUrl, { mode: 'cors', cache: 'no-cache' });
    if (!res.ok) return undefined;
    const blob = await res.blob();
    const ext = (blob.type && blob.type.split('/')[1]) || 'jpg';
    return new File([blob], `wotnow-share.${ext}`, { type: blob.type || 'image/jpeg' });
  } catch {
    return undefined;
  }
}

function buildMessage({ title, text, url }: SharePayload) {
  return [text, url].filter(Boolean).join('\n\n');
}

function buildEmailishSubject(activityTitle: string) {
  const t = activityTitle.trim();
  const firstWord = t.split(/\s+/) || '';
  const looksGerund = /ing\b/i.test(firstWord);
  if (looksGerund) return `Fancy ${t.toLowerCase()}?`;
  return `Fancy some ${t.toLowerCase()}?`;
}

function buildWhatsAppUrl(payload: SharePayload) {
  const message = buildMessage(payload);
  const encoded = encodeURIComponent(message);
  if (payload.phone) return `https://wa.me/${payload.phone}?text=${encoded}`;
  return `https://wa.me/?text=${encoded}`;
}

async function shareToWhatsApp(payload: SharePayload): Promise<string> {
  const hasNavigatorShare = typeof navigator !== 'undefined' && !!navigator.share;
  const textWithLinks = [payload.text, payload.url, payload.imageUrl].filter(Boolean).join('\n');

  if (hasNavigatorShare && _isSecure && payload.imageUrl) {
    const file = await imageUrlToFile(payload.imageUrl);
    if (file && (navigator as any).canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: payload.title,
          text: [payload.title, textWithLinks].filter(Boolean).join('\n\n'),
          files: [file],
        });
        return 'Shared via system sheet';
      } catch (err: any) {
        if (err?.name === 'AbortError' || err?.message?.includes('Abort')) return 'Share cancelled';
      }
    }
  }
  if (hasNavigatorShare) {
    try {
      await navigator.share({
        title: payload.title,
        text: textWithLinks,
      });
      return 'Shared via system sheet';
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('Abort')) return 'Share cancelled';
    }
  }
  try {
    const href = buildWhatsAppUrl({ ...payload, text: textWithLinks, url: undefined });
    const w = window.open(href, '_blank', 'noopener,noreferrer');
    if (w) return 'Opened WhatsApp';
  } catch {}
  try {
    const toCopy = [payload.title, textWithLinks].filter(Boolean).join('\n\n');
    await navigator.clipboard.writeText(toCopy);
    return 'Copied message to clipboard';
  } catch {
    return 'Unable to share';
  }
}
// ---- end helpers ----

const thermometerIcon = '/weather-icons/design/fill/final/thermometer-celsius.svg';
const humidityIcon = '/weather-icons/design/fill/final/humidity.svg';
const rainIcon = '/weather-icons/design/fill/final/raindrop-measure.svg';

function getWeatherIconUrl(iconCode: string) {
  const supportedIcons = [
    '01d','01n','02d','02n','03d','03n','04d','04n',
    '09d','09n','10d','10n','11d','11n','13d','13n','50d','50n'
  ];
  if (supportedIcons.includes(iconCode)) {
    return `/weather-icons/design/fill/final/${iconCode}.svg`;
  }
  return '/weather-icons/design/fill/final/na.svg';
}


// --- Wind speed utilities ---

/**
 * Get wind icon based on Beaufort number, using m/s as input.
 * getBeaufortNumber expects m/s and converts internally to km/h.
 */
function getWindIcon(windMs: number) {
  const beaufort = getBeaufortNumber(windMs); // Pass m/s directly, function handles conversion
  if (beaufort < 3) return '/weather-icons/design/fill/final/windsock.svg';
  if (beaufort <= 12) return `/weather-icons/design/fill/final/wind-beaufort-${beaufort}.svg`;
  return '/weather-icons/design/fill/final/wind.svg';
}

/**
 * Check if wind icon needs glow effect (only numbered Beaufort icons)
 */
function windIconNeedsGlow(windMs: number) {
  const beaufort = getBeaufortNumber(windMs);
  return beaufort >= 3 && beaufort <= 12; // Only numbered Beaufort icons have dark text
}

// Remove kmhToKnots, use mpsToKnots for all wind speed conversions

function formatTideTime(timeString: string): string {
  const date = new Date(timeString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getTimeUntil(timeString: string): string {
  const tideTime = new Date(timeString).getTime();
  const now = Date.now();
  const diffMs = tideTime - now;
  if (diffMs < 0) return 'now';
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 60) return `in ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  const remainingMinutes = diffMinutes % 60;
  if (remainingMinutes === 0) return `in ${diffHours}h`;
  return `in ${diffHours}h ${remainingMinutes}m`;
}

const Popup: React.FC<PopupProps> = ({
  activityId,
  title,
  category,
  message,
  marineData,
  weatherData,
  score,
  onClose,
  coastalLocation,
  homeLocation,
  dayTimestamp,
}) => {
  const [tideData, setTideData] = useState<{
    nextHighTide?: { time: string; height: number };
    nextLowTide?: { time: string; height: number };
    secondHighTide?: { time: string; height: number };
    secondLowTide?: { time: string; height: number };
  }>({});
  const [isToday, setIsToday] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const popupRef = useRef<HTMLDivElement | null>(null);

  const isMarine = !!marineData && Object.keys(marineData).length > 1;
  const hasMarineData =
    isMarine &&
    marineData?.waveHeight !== undefined &&
    marineData?.waterTemperature !== undefined;
  const emoji = getActivityEmoji(activityId);
  const backgroundImage = bgMap[activityId] ?? '/default-bg.jpg';
  const isMarineActivity = MARINE_ACTIVITY_IDS.includes(activityId);

  // --- Orientation (OSM-backed) ---
  const [resolvedOrientation, setResolvedOrientation] = useState<number | undefined>(undefined);
  const [orientationVia, setOrientationVia] = useState<string | undefined>(undefined);

  // --- Wind speed display helpers ---
  // Always use m/s internally, convert for display only
  const windSpeedMs = marineData?.windSpeed ?? weatherData?.windSpeed ?? null;
  const windSpeedKnots = windSpeedMs != null ? mpsToKnots(windSpeedMs) : null;
  const windSpeedKmh = windSpeedMs != null ? mpsToKmh(windSpeedMs) : null;

  // Example usage in render:
  // <span>{windSpeedMs?.toFixed(1)} m/s</span>
  // <span>{windSpeedKnots?.toFixed(1)} knots</span>
  // <span>{windSpeedKmh?.toFixed(1)} km/h</span>

  // Document: All wind speed logic, scoring, and messaging should use m/s internally.

  // Export PNG (only main content, no footer/buttons)
const handleDownload = async () => {
  setIsExporting(true);
  await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for class/UI update
  try {
    if (popupRef.current) {
      const canvas = await html2canvas(popupRef.current, { useCORS: true });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'popup-capture.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } finally {
    setIsExporting(false);
  }
};

  const handleShare = async () => {
    const shareUrl = `${PUBLIC_SITE_URL}?activity=${encodeURIComponent(activityId)}`;
    const absImageUrl = backgroundImage?.startsWith('http')
      ? backgroundImage
      : new URL(backgroundImage, window.location.origin).toString();
    const catchyTitle = buildEmailishSubject(title);
    const payload: SharePayload = {
      title: catchyTitle,
      text: [
        `WotNow: ${title}`,
        message ? `Why: ${message}` : undefined,
      ].filter(Boolean).join('\n'),
      url: shareUrl,
      imageUrl: absImageUrl,
    };
    const status = await shareToWhatsApp(payload);
    if (status === 'Share cancelled') return;
    if (status === 'Copied message to clipboard') alert('Copied the invite to your clipboard.');
    if (status === 'Unable to share') alert('Sorry, unable to share from this browser.');
  };

  useEffect(() => {
    if (isMarineActivity) {
      const lat = coastalLocation?.lat ?? homeLocation?.lat ?? 50.7192;
      const lon = coastalLocation?.lon ?? homeLocation?.lon ?? -1.8808;
      fetchTideData(lat, lon, dayTimestamp);
    }
  }, [coastalLocation, homeLocation, isMarineActivity, dayTimestamp]);

  // Resolve beach orientation from OSM (cached) when we have a coastal/home point
  useEffect(() => {
    const lat = coastalLocation?.lat ?? homeLocation?.lat;
    const lon = coastalLocation?.lon ?? homeLocation?.lon;
    if (!isMarineActivity || typeof lat !== 'number' || typeof lon !== 'number') {
      setResolvedOrientation(undefined);
      setOrientationVia(undefined);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await resolveBeachOrientationAsync({ lat, lon });
        if (cancelled) return;
        // @ts-ignore via is added by our patched util
        const via = (res as any).via || res.source;
        // Fallback to simulated only if resolver couldn't find anything
        const o = typeof res.orientation === 'number' ? res.orientation : computeSimulatedOrientation(lat, lon);
        setResolvedOrientation(o);
        setOrientationVia(via);
      } catch {
        // Last-ditch fallback
        setResolvedOrientation(computeSimulatedOrientation(lat, lon));
        setOrientationVia('sim');
      }
    })();
    return () => { cancelled = true; };
  }, [isMarineActivity, coastalLocation?.lat, coastalLocation?.lon, homeLocation?.lat, homeLocation?.lon]);

  const fetchTideData = async (lat: number, lon: number, dayTimestamp?: number) => {
    try {
      const today = new Date();
      const targetDay = dayTimestamp ? new Date(dayTimestamp * 1000) : today;
      const isCurrentDay = targetDay.toDateString() === today.toDateString();
      setIsToday(isCurrentDay);
      const res = await fetch(`/api/tides?lat=${lat}&lon=${lon}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !Array.isArray(data.data)) return;
      const targetDateStr = targetDay.toISOString().split('T')[0];
      const dayTides = data.data.filter((tide: any) => {
        const tideDateStr = new Date(tide.time).toISOString().split('T')[0];
        return tideDateStr === targetDateStr;
      });
      if (isCurrentDay) {
        const currentTime = new Date();
        const highTides = dayTides
          .filter((t: any) => t.type === 'high')
          .sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
        const lowTides = dayTides
          .filter((t: any) => t.type === 'low')
          .sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
        const nextHighTide = highTides.find((t: any) => new Date(t.time) > currentTime);
        const nextLowTide = lowTides.find((t: any) => new Date(t.time) > currentTime);
        setTideData({
          nextHighTide: nextHighTide
            ? { time: nextHighTide.time, height: nextHighTide.height }
            : undefined,
          nextLowTide: nextLowTide
            ? { time: nextLowTide.time, height: nextLowTide.height }
            : undefined,
          secondHighTide: undefined,
          secondLowTide: undefined,
        });
      } else {
        const firstHighTide = dayTides.find((e: any) => e.type === 'high');
        const firstLowTide = dayTides.find((e: any) => e.type === 'low');
        const secondHighTide = dayTides.filter((e: any) => e.type === 'high')[1];
        const secondLowTide = dayTides.filter((e: any) => e.type === 'low')[1];
        setTideData({
          nextHighTide: firstHighTide ? { time: firstHighTide.time, height: firstHighTide.height } : undefined,
          nextLowTide: firstLowTide ? { time: firstLowTide.time, height: firstLowTide.height } : undefined,
          secondHighTide: secondHighTide ? { time: secondHighTide.time, height: secondHighTide.height } : undefined,
          secondLowTide: secondLowTide ? { time: secondLowTide.time, height: secondLowTide.height } : undefined,
        });
      }
    } catch (err) {}
  };

  // Build classes/styles for the content export area
  const exportClass = `popup__export-area${isExporting ? ' popup__exporting' : ''}`;

  return (
    <div className="popup" onClick={onClose}>
      <div
        className={`popup__content popup__content--${category}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.6)), url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backdropFilter: 'blur(8px)',
        }}
      >
        <button className="popup__close" onClick={onClose} aria-label="Close">×</button>
        
        {/* Only export this area */}
        <div ref={popupRef} className={exportClass}>
          <header className="popup__card-header">
            <div className="popup__card-emoji">{emoji}</div>
            <div className="popup__card-title">{title}</div>
            <span className={`popup__card-badge popup__badge--${category}`}>{getAssessmentEmoji(category)}</span>
          </header>
          {message && <p className="popup__message">{message}</p>}
          {(marineData || weatherData) && (
            <section className="popup__weather-bar">
              <ul>
                {isMarine && marineData && (
                  <>
                    {typeof weatherData?.temperature === 'number' && (
                      <li>
                        <img src="/weather-icons/design/fill/final/thermometer-celsius.svg" alt="Air temperature"
                             style={{ width: 24, height: 24, verticalAlign: 'middle' }} />{' '}
                        <strong>{weatherData.temperature.toFixed(1)}</strong>°
                      </li>
                    )}
                    {typeof marineData.waterTemperature === 'number' && (
                      <li>
                        <img src="/weather-icons/design/fill/final/thermometer-water.svg" alt="Water temperature"
                             style={{ width: 24, height: 24, verticalAlign: 'middle' }} />{' '}
                        <strong>{marineData.waterTemperature.toFixed(1)}</strong>°
                      </li>
                    )}
                    {weatherData?.icon && (
                      <li>
                        <img src={getWeatherIconUrl(weatherData.icon)}
                             alt={weatherData.description || 'weather'}
                             style={{ width: 28, height: 28, verticalAlign: 'middle' }} />{' '}
                        {weatherData.description}
                      </li>
                    )}
                    {typeof marineData.waveHeight === 'number' && (
                      <li>
                        🌊 <strong>{marineData.waveHeight.toFixed(1)}</strong>m
                      </li>
                    )}
                    {typeof marineData.windSpeed === 'number' && (
                      <li>
                        <img src={getWindIcon(marineData.windSpeed)}
                             alt="Wind" style={{ 
                               width: 28, 
                               height: 28, 
                               verticalAlign: 'middle',
                               // Only add glow for numbered Beaufort icons (not windsock)
                               filter: windIconNeedsGlow(marineData.windSpeed) 
                                 ? 'drop-shadow(0px 0px 3px rgba(255, 255, 255, 0.9)) drop-shadow(0px 0px 1px rgba(255, 255, 255, 1)) drop-shadow(0px 0px 6px rgba(255, 255, 255, 0.5))' 
                                 : 'none'
                             }} />{' '}
                        <strong>{Math.round(mpsToKnots(marineData.windSpeed))}</strong>knots
                        {typeof marineData.gust === 'number' && <> (gust {mpsToKnots(marineData.gust).toFixed(1)} knots)</>}
                        {(() => {
                          const rawDir: any = (marineData as any).windDir ?? (marineData as any).windDirection;
                          const dir = typeof rawDir === 'number' ? rawDir : undefined;
                          // Priority: provided orientation -> resolved OSM/cache -> simulated fallback
                          const orientProvided = typeof marineData?.beachOrientation === 'number' 
                            ? marineData!.beachOrientation 
                            : (typeof weatherData?.beachOrientation === 'number' ? weatherData!.beachOrientation : undefined);
                          const orient = typeof orientProvided === 'number' 
                            ? orientProvided 
                            : (typeof resolvedOrientation === 'number' ? resolvedOrientation : (
                                coastalLocation ? computeSimulatedOrientation(coastalLocation.lat, coastalLocation.lon) : undefined
                              ));
                          return typeof dir === 'number' ? (
                            <>
                              {' '}
                              <WindDirectionIcon deg={dir} />
                              {' '}
                              <span style={{ fontWeight: 600 }}>
                                {getCompassDirection(dir)}
                              </span>
                              {typeof orient === 'number' && (
                                <>
                                  {' '}
                                  <span>({classifyWindRelative(orient, dir)})</span>
                                  {orientationVia && orientationVia !== 'computed' && (
  <em style={{ marginLeft: 6, opacity: 0.75 }}>
    ({orientationVia === 'simulated' ? 'sim' : orientationVia})
  </em>
)}
                                </>
                              )}
                            </>
                          ) : null;
                        })()}
                      </li>
                    )}
                    {typeof marineData.swellHeight === 'number' && (
                      <li>
                        🏄🏿‍♀️ Swell: <strong>{marineData.swellHeight.toFixed(1)}</strong>m{' '}
                        {typeof marineData.swellDir === 'number' && <SwellArrow deg={marineData.swellDir} />}
                      </li>
                    )}
                    {typeof marineData.swellPeriod === 'number' && (
                      <li>
                        ⏲ <strong>{marineData.swellPeriod.toFixed(1)}</strong>s
                      </li>
                    )}
                    {typeof marineData.vis === 'number' && (
                      <li>
                        👀<strong>
                          {marineData.vis > 3
                            ? Math.round(marineData.vis)
                            : marineData.vis.toFixed(1)}
                        </strong>km
                      </li>
                    )}
                    {(tideData.nextHighTide || tideData.nextLowTide) && (
                      <li className="tide-info">
                        {tideData.nextHighTide && (
                          <span>
                            <img src="/weather-icons/design/fill/final/tide-high.svg"
                                 alt="High Tide"
                                 style={{ width: 28, height: 28, verticalAlign: 'middle' }} />{' '}
                            {isToday ? 'Next High Tide ' : 'High '}
                            <strong>{formatTideTime(tideData.nextHighTide.time)}</strong>
                            {!isToday && tideData.secondHighTide && (
                              <span> ({formatTideTime(tideData.secondHighTide.time)})</span>
                            )}
                          </span>
                        )}
                        {tideData.nextHighTide && tideData.nextLowTide && <span> | </span>}
                        {tideData.nextLowTide && (
                          <span>
                            <img src="/weather-icons/design/fill/final/tide-low.svg"
                                 alt="Low Tide"
                                 style={{ width: 28, height: 28, verticalAlign: 'middle' }} />{' '}
                            {isToday ? 'Next Low Tide' : 'Low '}
                            <strong>{formatTideTime(tideData.nextLowTide.time)}</strong>
                            {!isToday && tideData.secondLowTide && (
                              <span> ({formatTideTime(tideData.secondLowTide.time)})</span>
                            )}
                          </span>
                        )}
                      </li>
                    )}
                  </>
                )}
                {!isMarine && weatherData && (
                  <>
                    {typeof weatherData?.tempMax === 'number' && (
                      <li>
                        <img src="/weather-icons/design/fill/final/thermometer-celsius.svg" alt="High Temperature"
                             style={{ width: 24, height: 24, verticalAlign: 'middle' }} />{' '}
                        <strong>H: {weatherData.tempMax}</strong>°
                      </li>
                    )}
                    {typeof weatherData?.tempMin === 'number' && (
                      <li>
                        <img src="/weather-icons/design/fill/final/thermometer-colder.svg" alt="Low Temperature"
                             style={{ width: 24, height: 24, verticalAlign: 'middle' }} />{' '}
                        <strong>L: {weatherData.tempMin}</strong>°
                      </li>
                    )}
                    {typeof weatherData?.temperature === 'number' &&
                     typeof weatherData?.tempMin === 'undefined' &&
                     typeof weatherData?.tempMax === 'undefined' && (
                      <li>
                        <img src="/weather-icons/design/fill/final/thermometer-celsius.svg" alt="Temperature"
                             style={{ width: 24, height: 24, verticalAlign: 'middle' }} />{' '}
                        <strong>{weatherData.temperature}</strong>°
                      </li>
                    )}
                    {weatherData?.icon && (
                      <li>
                        <img src={getWeatherIconUrl(weatherData.icon)}
                             alt={weatherData.description || 'weather'}
                             style={{ width: 28, height: 28, verticalAlign: 'middle' }} />{' '}
                        {weatherData.description}
                      </li>
                    )}
                    {typeof weatherData?.windSpeed === 'number' && (
                      <li>
                        <img src={getWindIcon(weatherData.windSpeed)} alt="Wind"
                             style={{ 
                               width: 28, 
                               height: 28, 
                               verticalAlign: 'middle',
                               // Only add glow for numbered Beaufort icons (not windsock)
                               filter: windIconNeedsGlow(weatherData.windSpeed) 
                                 ? 'drop-shadow(0px 0px 3px rgba(255, 255, 255, 0.9)) drop-shadow(0px 0px 1px rgba(255, 255, 255, 1)) drop-shadow(0px 0px 6px rgba(255, 255, 255, 0.5))' 
                                 : 'none'
                             }} />{' '}
                        <strong>{Math.round(mpsToKmh(weatherData.windSpeed))}</strong>km/h
                        {typeof weatherData.windDir === 'number' && (
                          <>
                            {' '}
                            <WindDirectionIcon deg={weatherData.windDir} />
                            {' '}
                            <span style={{ fontWeight: 600 }}>
                              {getCompassDirection(weatherData.windDir)}
                            </span>
                          </>
                        )}
                      </li>
                    )}
                    {typeof weatherData?.humidity === 'number' && (
                      <li>
                        <img src={humidityIcon} alt="Humidity"
                             style={{ width: 24, height: 24, verticalAlign: 'middle' }} />{' '}
                        <strong>{weatherData.humidity}</strong>%
                      </li>
                    )}
                    {typeof weatherData?.precipitation === 'number' && (
                      <li>
                        <img src={rainIcon} alt="Precipitation"
                             style={{ width: 24, height: 24, verticalAlign: 'middle' }} />{' '}
                        <strong>{weatherData.precipitation}</strong>mm
                      </li>
                    )}
                  </>
                )}
              </ul>
            </section>
          )}
          {isMarineActivity && !hasMarineData && (
            <div className="location-prompt">
              Please set your beach or coastal location.
            </div>
          )}
          <footer className="popup__footer">Score: {typeof score === 'number' ? `${score}%` : '—'}</footer>
        </div>
        {/* Buttons are visually in the popup but NOT in export area */}
        <div className="popup__action">
          
          <button className="popup__share-button" onClick={handleShare}>
            📤 Invite a friend to join you
          </button>
        </div>
      </div>
    </div>
  );
};

export default Popup;
