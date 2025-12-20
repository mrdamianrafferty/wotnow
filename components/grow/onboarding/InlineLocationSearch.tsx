import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePlacesAutocompleteNew as usePlacesAutocomplete, getGeocode, getLatLng } from '../../../lib/hooks/usePlacesAutocompleteNew';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

type Props = {
  initialQuery?: string;
  placeholder?: string;
  onSelect: (loc: { name: string; lat: number; lon: number }) => void;
  storageKey?: string;
  legacyKey?: string;
  showMapToggle?: boolean;
};

export default function InlineLocationSearch({
  initialQuery = '',
  placeholder = 'Search a place…',
  onSelect,
  storageKey = 'coastal_recent_locations_v1',
  legacyKey = 'recentCoastalLocations',
  showMapToggle = true,
}: Props) {
  type BasicLoc = { name: string; lat: number; lon: number };

  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState(initialQuery || '');
  const [showMap, setShowMap] = useState(false);
  const [recent, setRecent] = useState<BasicLoc[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);

  const { ready, value, suggestions: { status, data }, setValue, clearSuggestions } = usePlacesAutocomplete({ debounce: 300 });

  useEffect(() => { setValue(initialQuery || ''); setQuery(initialQuery || ''); }, [initialQuery, setValue]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawNew = localStorage.getItem(storageKey);
      const rawLegacyLocal = localStorage.getItem(legacyKey);
      const rawLegacySession = sessionStorage.getItem(legacyKey);
      const fromNew = rawNew ? JSON.parse(rawNew) : [];
      const fromLegacyLocal = rawLegacyLocal ? JSON.parse(rawLegacyLocal) : [];
      const fromLegacySession = rawLegacySession ? JSON.parse(rawLegacySession) : [];
      const merged = [...fromNew, ...fromLegacyLocal, ...fromLegacySession];
      const keyOf = (l: BasicLoc) => `${l.name}|${Number(l.lat).toFixed(4)},${Number(l.lon).toFixed(4)}`;
      const dedup: Record<string, BasicLoc> = {};
      merged.forEach((l0: unknown) => {
        const l = l0 as BasicLoc;
        if (l && l.lat != null && l.lon != null) {
          dedup[keyOf(l)] = { ...l, lat: Number(l.lat), lon: Number(l.lon) };
        }
      });
      setRecent(Object.values(dedup).slice(0, 8));
    } catch { /* noop */ }
  }, [storageKey, legacyKey]);

  const addRecent = (loc: BasicLoc) => {
    setRecent(prev => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const keyOf = (l: BasicLoc) => `${l.name}|${Number(l.lat).toFixed(4)},${Number(l.lon).toFixed(4)}`;
      const idx = list.findIndex(r => keyOf(r) === keyOf(loc));
      if (idx !== -1) list.splice(idx, 1);
      list.unshift({ ...loc, lat: Number(loc.lat), lon: Number(loc.lon) });
      const trimmed = list.slice(0, 8);
      const payload = JSON.stringify(trimmed);
      try { localStorage.setItem(storageKey, payload); } catch {}
      try { sessionStorage.setItem(storageKey, payload); } catch {}
      try { localStorage.setItem(legacyKey, payload); } catch {}
      try { sessionStorage.setItem(legacyKey, payload); } catch {}
      return trimmed;
    });
  };

  async function reverseGeocodeName(lat: number, lon: number): Promise<string | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&zoom=14`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GoDaisy/1.0 (contact: app)'
        }
      });
      if (!res.ok) return null;
      const json = await res.json();
      const disp = json?.name || json?.display_name;
      if (disp) return String(disp);
      const addr = json?.address || {};
      const primary = addr.beach || addr.water || addr.amenity || addr.road || addr.neighbourhood || addr.suburb || addr.village || addr.town || addr.city || addr.county;
      const region = addr.state || addr.region || addr.county;
      const parts: string[] = [];
      if (primary) parts.push(primary);
      if (region) parts.push(region);
      return parts.length ? parts.join(', ') : null;
    } catch {
      return null;
    }
  }

  const getCurrentLocation = async () => {
    setLocationError(null);
    if (!('geolocation' in navigator)) { setLocationError('Geolocation is not available in this browser.'); return; }
    try {
      setIsLocating(true);
      const { lat, lon } = await new Promise<{ lat: number; lon: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          err => reject(err),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      });
      const fallback = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      const friendlyName = (await reverseGeocodeName(lat, lon)) || `Current location (${fallback})`;
      const loc = { name: friendlyName, lat, lon };
      addRecent(loc);
      onSelect(loc);
      setValue(friendlyName);
      setQuery(friendlyName);
      setShowList(false);
      clearSuggestions();
      inputRef.current?.blur();
    } catch (e: unknown) {
      const msg = (typeof e === 'object' && e !== null && 'message' in e) ? String((e as { message?: string }).message) : 'Unable to get your location.';
      setLocationError(msg);
    } finally { setIsLocating(false); }
  };

  const choose = (loc: BasicLoc) => {
    addRecent(loc);
    onSelect(loc);
    clearSuggestions();
    setShowList(false);
    inputRef.current?.blur();
  };

  const handleSuggestionClick = async (s: any) => {
    try {
      const placeId = s?.place_id;
      const label = s?.structured_formatting?.main_text || s?.description || 'Selected place';
      if (!placeId) return;
      const results = await getGeocode({ placeId });
      if (!results?.length) return;
      const { lat, lng } = await getLatLng(results[0]);
      choose({ name: label, lat, lon: lng });
    } catch { /* noop */ }
  };

  const confirmSelection = async () => {
    const text = (value || query || '').trim();
    if (!text) return;
    try {
      if (status === 'OK' && Array.isArray(data) && data.length > 0) {
        await handleSuggestionClick(data[0]);
        return;
      }
      const results = await getGeocode({ address: text });
      if (results && results[0]) {
        const { lat, lng } = await getLatLng(results[0]);
        choose({ name: text, lat, lon: lng });
        setValue(text);
        setQuery(text);
        setShowList(false);
        clearSuggestions();
        inputRef.current?.blur();
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setShowList(false);
        clearSuggestions();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clearSuggestions]);

  return (
    <div ref={containerRef} className="w-full">
      <div className="form-control relative">
        <input
          ref={inputRef}
          type="text"
          className="input input-bordered w-full pr-24"
          placeholder={ready ? placeholder : 'Loading…'}
          value={value}
          onChange={(e) => { setQuery(e.target.value); setValue(e.target.value); }}
          onFocus={() => setShowList(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setShowList(false);
              clearSuggestions();
              (e.currentTarget as HTMLInputElement).blur();
              return;
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              if (status === 'OK' && data?.length === 1) handleSuggestionClick(data[0]);
              else confirmSelection();
            }
          }}
          aria-autocomplete="list"
        />
        <button
          type="button"
          className="btn btn-primary btn-sm absolute right-2 top-1/2 -translate-y-1/2"
          onClick={confirmSelection}
          aria-label="Confirm selection"
        >
          OK
        </button>

        {showList && status === 'OK' && data?.length > 0 && query.length >= 2 && !/^current location/i.test(query) && (
          <ul className="absolute left-0 right-0 z-50 mt-1 bg-base-100 rounded-box ring-1 ring-base-300/60 max-h-64 overflow-auto shadow-lg" role="listbox">
            {data.map((s: any, idx: number) => {
              const key = s.place_id || idx.toString();
              const main = s?.structured_formatting?.main_text || s?.description;
              const secondary = s?.structured_formatting?.secondary_text;
              return (
                <li key={key}>
                  <button className="w-full text-left px-3 py-2 hover:bg-base-200 focus:bg-base-200" onClick={() => handleSuggestionClick(s)}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium leading-tight">{main}</span>
                      {secondary ? <span className="text-xs opacity-70 leading-tight">{secondary}</span> : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="btn btn-outline btn-sm" onClick={getCurrentLocation} disabled={isLocating}>
          {isLocating ? 'Locating…' : 'Use current location'}
        </button>
        {showMapToggle && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowMap(s => !s)}>
            {showMap ? 'Hide map' : 'Pick from map'}
          </button>
        )}
      </div>
      {locationError && <div className="alert alert-error mt-2"><span>{locationError}</span></div>}

      {showMap && (
        <div className="mt-3 rounded-box overflow-hidden ring-1 ring-base-300/60">
          <MapPicker onSelect={async (lat: number, lon: number) => {
            const fallback = `Selected point (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
            const friendlyName = (await reverseGeocodeName(lat, lon)) || fallback;
            choose({ name: friendlyName, lat, lon });
            setValue(friendlyName);
            setQuery(friendlyName);
            setShowList(false);
            clearSuggestions();
            inputRef.current?.blur();
          }} />
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-3">
          <div className="text-sm font-semibold mb-2">Recent</div>
          <div className="flex flex-wrap gap-2">
            {recent.map((r, i) => (
              <button key={`${r.name}-${i}`} className="btn btn-sm btn-outline rounded-full" onClick={() => choose(r)} aria-label={`Use recent location ${r.name}`}>
                <span className="truncate max-w-[14rem]">{r.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
