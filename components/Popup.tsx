// src/components/Popup.tsx

import React, { useEffect, useState } from 'react';
import '../styles/Popup.css';
import { getActivityEmoji, getAssessmentEmoji } from '../data/emojiMap'; // Adjust path as necessary
import { getActivityMessage } from '../data/activityMessages';
import { MARINE_ACTIVITY_IDS } from '../utils/activityHelpers';
import bgMap from '../data/bgMap'; // Should be default export if used
import SwellArrow from './SwellArrow'; // Path as appropriate
import WindDirectionIcon from './WindDirectionIcon';
import { getCompassDirection } from '../utils/weatherLabels'; // Adjust path as needed


interface MarineData {
  waveHeight?: number;
  windSpeed?: number;
  waterTemperature?: number;
  swellPeriod?: number;
}

interface WeatherData {
  description?: string;
  temperature?: number;
  windSpeed?: number;
  humidity?: number;
  precipitation?: number;
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
  dayTimestamp?: number; // Add this line
}

// ---- WhatsApp/Web Share helpers (inline; no new files) ----
type SharePayload = {
  title?: string;
  text?: string;
  url?: string;
  imageUrl?: string; // absolute URL preferred for previews
  phone?: string;    // optional international number without plus
};

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
  // Don't include title in the text content to avoid repetition
  return [text, url].filter(Boolean).join('\n\n');
}

function buildEmailishSubject(activityTitle: string) {
  const t = activityTitle.trim();
  const firstWord = t.split(/\s+/)[0] || '';
  const looksGerund = /ing\b/i.test(firstWord);
  // If the title already begins with a gerund (e.g., "Playing"), prefer "Fancy <title>?"
  if (looksGerund) return `Fancy ${t.toLowerCase()}?`;
  // Generic fallback
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
  dayTimestamp, // Add this line
}) => {
  const [tideData, setTideData] = useState<{
    nextHighTide?: { time: string; height: number };
    nextLowTide?: { time: string; height: number };
    secondHighTide?: { time: string; height: number };
    secondLowTide?: { time: string; height: number };
  }>({});
  const [isToday, setIsToday] = useState(true);

  console.log('Popup received message:', message);
  
  const isMarine = !!marineData && Object.keys(marineData).length > 1; // More than just windSpeed
  const hasMarineData = isMarine && 
    marineData?.waveHeight !== undefined && 
    marineData?.waterTemperature !== undefined;
  const emoji = getActivityEmoji(activityId);
  const backgroundImage = bgMap[activityId] ?? '/default-bg.jpg';
  const isMarineActivity = MARINE_ACTIVITY_IDS.includes(activityId);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}?activity=${encodeURIComponent(activityId)}`;

    // Prefer an absolute image URL for richer previews and file-share
    const absImageUrl = backgroundImage?.startsWith('http')
      ? backgroundImage
      : new URL(backgroundImage, window.location.origin).toString();

    const catchyTitle = buildEmailishSubject(title);
    const payload: SharePayload = {
      title: catchyTitle, // becomes the email subject in many share targets
      text: [
        `WotNow: ${title}`,
        message ? `Why: ${message}` : undefined,
      ].filter(Boolean).join('\n'),
      url: shareUrl,
      imageUrl: absImageUrl,
      // phone: '447911123456', // optional: target a specific number (no +)
    };

    const status = await shareToWhatsApp(payload);
    if (status === 'Share cancelled') return;
    // Simple UX feedback without introducing new UI deps
    if (status === 'Copied message to clipboard') alert('Copied the invite to your clipboard.');
    if (status === 'Unable to share') alert('Sorry, unable to share from this browser.');
  };


  // Keep only this effect for tide data
  useEffect(() => {
    // Only fetch tide data if this is a marine activity
    if (isMarineActivity) {
      // Use default coordinates for Bournemouth beach if none provided
      const lat = coastalLocation?.lat ?? homeLocation?.lat ?? 50.7192;
      const lon = coastalLocation?.lon ?? homeLocation?.lon ?? -1.8808;

      // Get day timestamp from props if available
      console.log('🌊 Using coordinates for tide data:', { lat, lon, dayTimestamp });
      fetchTideData(lat, lon, dayTimestamp);
    }
  }, [coastalLocation, homeLocation, isMarineActivity, dayTimestamp]);

const fetchTideData = async (lat: number, lon: number, dayTimestamp?: number) => {
  try {
    // Add more detailed logging about the day we're fetching for
    const today = new Date();
    const targetDay = dayTimestamp ? new Date(dayTimestamp * 1000) : today;
    
    console.log('🌊 Fetching tide data for:', { 
      lat, 
      lon, 
      dayTimestamp,
      targetDay: targetDay.toDateString(),
      today: today.toDateString(),
      isFutureDay: dayTimestamp && targetDay.toDateString() !== today.toDateString()
    });
    
    // Determine if this is today or a future day
    const isCurrentDay = targetDay.toDateString() === today.toDateString();
    
    console.log('🗓️ Date comparison:', {
      dayTimestamp,
      dayDate: targetDay.toDateString(),
      today: today.toDateString(),
      isCurrentDay
    });
    
    // Update the isToday state
    setIsToday(isCurrentDay);
    
    const res = await fetch(`/api/tides?lat=${lat}&lon=${lon}`);
    
    if (!res.ok) {
      console.error('🌊 Tide API error:', res.status);
      return;
    }
    
    const data = await res.json();
    console.log('🌊 Tide data received:', data);
    
    if (!data || !Array.isArray(data.data)) {
      console.error('🌊 Invalid tide data format');
      return;
    }
    
    // Format the target date as YYYY-MM-DD for comparison
    const targetDateStr = targetDay.toISOString().split('T')[0];
    console.log('🌊 Filtering tides for date:', targetDateStr);
    
    // Filter tides for the specific day using string comparison
    const dayTides = data.data.filter((tide) => {
      const tideDate = new Date(tide.time).toISOString().split('T')[0];
      return tideDate === targetDateStr;
    });
    
    console.log('🌊 Day-specific tides:', dayTides);
    
    if (isCurrentDay) {
      // For today, find the next upcoming high and low tides
      const currentTime = new Date();
      
      // Get all high and low tides for today, sorted by time
      const highTides = dayTides
        .filter(tide => tide.type === 'high')
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      
      const lowTides = dayTides
        .filter(tide => tide.type === 'low')
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      
      // Find the next high tide (first one that's in the future)
      const nextHighTide = highTides.find(tide => new Date(tide.time) > currentTime);
      // Find the next low tide (first one that's in the future)
      const nextLowTide = lowTides.find(tide => new Date(tide.time) > currentTime);
      
      setTideData({
        nextHighTide: nextHighTide ? {
          time: nextHighTide.time,
          height: nextHighTide.height
        } : undefined,
        nextLowTide: nextLowTide ? {
          time: nextLowTide.time,
          height: nextLowTide.height
        } : undefined,
        secondHighTide: undefined, // No second tide for today
        secondLowTide: undefined,  // No second tide for today
      });
    } else {
      // For future days, use the existing logic to find tides
      // Find first high and low tide of the day
      const firstHighTide = dayTides.find((e) => e.type === 'high');
      const firstLowTide = dayTides.find((e) => e.type === 'low');
      
      // Find second high and low if available
      const secondHighTide = dayTides.filter(e => e.type === 'high')[1];
      const secondLowTide = dayTides.filter(e => e.type === 'low')[1];
      
      setTideData({
        nextHighTide: firstHighTide ? {
          time: firstHighTide.time,
          height: firstHighTide.height
        } : undefined,
        nextLowTide: firstLowTide ? {
          time: firstLowTide.time,
          height: firstLowTide.height
        } : undefined,
        secondHighTide: secondHighTide ? {
          time: secondHighTide.time,
          height: secondHighTide.height
        } : undefined,
        secondLowTide: secondLowTide ? {
          time: secondLowTide.time,
          height: secondLowTide.height
        } : undefined
      });
    }
  } catch (err) {
    console.error('🌊 Error fetching tide data:', err);
  }
}

// Your existing useEffect using the now-in-scope fetchTideData
useEffect(() => {
  // Only fetch tide data if this is a marine activity
  if (isMarineActivity) {
    // Use default coordinates for Bournemouth beach if none provided
    const lat = coastalLocation?.lat ?? homeLocation?.lat ?? 50.7192;
    const lon = coastalLocation?.lon ?? homeLocation?.lon ?? -1.8808;

    // Get day timestamp from props if available (add this prop to PopupProps)
    console.log('🌊 Using coordinates for tide data:', { lat, lon, dayTimestamp });
    fetchTideData(lat, lon, dayTimestamp);
  }
}, [coastalLocation, homeLocation, isMarineActivity, dayTimestamp]);

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
        <img
          src="/weather-icons/design/fill/final/thermometer-celsius.svg"
          alt="Air temperature"
          style={{ width: 24, height: 24, verticalAlign: 'middle' }}
        />{' '}
        <strong>{weatherData.temperature.toFixed(1)}</strong>°
      </li>
    )}

    {typeof marineData.waterTemperature === 'number' && (
      <li>
        <img
          src="/weather-icons/design/fill/final/thermometer-water.svg"
          alt="Water temperature"
          style={{ width: 24, height: 24, verticalAlign: 'middle' }}
        />{' '}
        <strong>{marineData.waterTemperature.toFixed(1)}</strong>°
      </li>
    )}

    {weatherData?.icon && (
      <li>
        <img
          src={getWeatherIconUrl(weatherData.icon)}
          alt={weatherData.description || 'weather'}
          style={{ width: 28, height: 28, verticalAlign: 'middle' }}
        />{' '}
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
        <img
          src={getWindIcon(marineData.windSpeed * 1)}
          alt="Wind"
          style={{ width: 28, height: 28, verticalAlign: 'middle' }}
        />{' '}
        <strong>{Math.round(marineData.windSpeed)}</strong>knots
        {typeof marineData.gust === 'number' && <> (gust {(marineData.gust * 1).toFixed(1)} knots)</>}
        {typeof marineData.windDir === 'number' && (
          <>
            {' '}
            <WindDirectionIcon deg={marineData.windDir} />
            {' '}
            <span style={{ fontWeight: 600 }}>
              {getCompassDirection(marineData.windDir)}
            </span>
          </>
        )}
      </li>
    )}

    {typeof marineData.swellHeight === 'number' && (
      <li>
        🌊 Swell: <strong>{marineData.swellHeight.toFixed(1)}</strong>m{' '}
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
    {/* Add debug info - remove in production */}
    {/* <small style={{opacity: 0.7}}>
      {dayTimestamp ? `Future day: ${new Date(dayTimestamp * 1000).toDateString()}` : 'Today'}
      {isToday ? ' (Today format)' : ' (Future format)'}
    </small><br/> */}
    
{tideData.nextHighTide && (
  <span>
    <img
      src="/weather-icons/design/fill/final/tide-high.svg"
      alt="High Tide"
      style={{ width: 28, height: 28, verticalAlign: 'middle' }}
    />{' '}
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
        <img
          src="/weather-icons/design/fill/final/tide-low.svg"
          alt="Low Tide"
          style={{ width: 28, height: 28, verticalAlign: 'middle' }}
        />{' '}
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
                  {typeof weatherData?.temperature === 'number' && (
                    <li>
                      <img
                        src={thermometerIcon}
                        alt="Temperature"
                        style={{ width: 24, height: 24, verticalAlign: 'middle' }}
                      />{' '}
                      <strong>{weatherData.temperature}</strong>°
                    </li>
                  )}

                  {weatherData?.icon && (
                    <li>
                      <img
                        src={getWeatherIconUrl(weatherData.icon)}
                        alt={weatherData.description || 'weather'}
                        style={{ width: 28, height: 28, verticalAlign: 'middle' }}
                      />{' '}
                      {weatherData.description}
                    </li>
                  )}

                  {typeof weatherData?.windSpeed === 'number' && (
  <li>
    <img
      src={getWindIcon(weatherData.windSpeed * 1)}
      alt="Wind"
      style={{ width: 28, height: 28, verticalAlign: 'middle' }}
    />{' '}
    <strong>{Math.round(weatherData.windSpeed)}</strong>km/h
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
                      <img
                        src={humidityIcon}
                        alt="Humidity"
                        style={{ width: 24, height: 24, verticalAlign: 'middle' }}
                      />{' '}
                      <strong>{weatherData.humidity}</strong>%
                    </li>
                  )}

                  {typeof weatherData?.precipitation === 'number' && (
                    <li>
                      <img
                        src={rainIcon}
                        alt="Precipitation"
                        style={{ width: 24, height: 24, verticalAlign: 'middle' }}
                      />{' '}
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

        <div className="popup__action">
          <button className="popup__share-button" onClick={handleShare}>
            📤 Invite a friend to join you
          </button>
        </div>
      </div>
    </div>
  );
};

// Map weather description/icon code to your SVG
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

// Thermometer, humidity, rain icons
const thermometerIcon = '/weather-icons/design/fill/final/thermometer-celsius.svg';
const humidityIcon = '/weather-icons/design/fill/final/humidity.svg';
const rainIcon = '/weather-icons/design/fill/final/raindrop-measure.svg';

// Beaufort wind icon logic
import { getBeaufortNumber } from '../utils/beaufort'; // adjust path as needed
function getWindIcon(windKmh: number) {
  const beaufort = getBeaufortNumber(windKmh);
  if (beaufort < 3) return '/weather-icons/design/fill/final/windsock.svg';
  if (beaufort <= 12) return `/weather-icons/design/fill/final/wind-beaufort-${beaufort}.svg`;
  return '/weather-icons/design/fill/final/wind.svg';
}

function kmhToKnots(kmh: number): number {
  return kmh * 0.539957;
}

async function fetchMarineData(lat: number | undefined, lon: number | undefined) {
  try {
    // Validate lat and lon
    if (typeof lat !== 'number' || isNaN(lat) || typeof lon !== 'number' || isNaN(lon)) {
      console.error('Invalid latitude or longitude:', { lat, lon });
      return; // Exit early if validation fails
    }

    const startISO = new Date().toISOString();
    const endISO = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await fetch(`/api/marine?lat=${lat}&lon=${lon}&start=${startISO}&end=${endISO}`);
    if (!res.ok) throw new Error(`Failed to fetch marine data: ${res.statusText}`);
    const data = await res.json();
    // setMarineHours(data.hours || []); // ❌ This state setter isn't defined
  } catch (err) {
    console.error('Error fetching marine data:', err);
  }
}

// Keep formatTideTime and getTimeUntil outside the component as they're pure functions
function formatTideTime(timeString: string): string {
  const date = new Date(timeString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}


// Add this helper function
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

export default Popup;
