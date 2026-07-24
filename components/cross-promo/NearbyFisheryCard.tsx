/**
 * NearbyFisheryCard — cross-promo: nearest Rise Daisy fishery
 * ─────────────────────────────────────────────────────────────────────────
 * Renders inside the fly_fishing_freshwater activity card only (see
 * pages/activities.tsx). Resolves the nearest real, named Rise Daisy
 * fishery via a server-side proxy (pages/api/cross-promo/nearby-fishery.ts
 * — Rise Daisy's own worth-the-drive endpoint sends no CORS headers, so
 * this can't be a direct client-side fetch).
 *
 * Defaults to the user's saved home location, but offers a lightweight
 * per-card location override (reusing InlineLocationSearch) that does NOT
 * touch the user's saved Go Daisy location — purely local component state,
 * per the plan's "use an existing location as a starting point but let the
 * user override it per-app/per-card" principle.
 *
 * Always renders something useful: a named fishery + drive time when the
 * resolver finds one, a generic Rise Daisy link when it doesn't or the
 * call fails, and the same generic link when no location is available at
 * all. Never a broken/empty card.
 */

import { useEffect, useState } from 'react';
import InlineLocationSearch from '@/components/grow/onboarding/InlineLocationSearch';
import { trackEvent } from '@/lib/analytics/events';

interface NearbyFisheryResult {
  slug: string;
  name: string;
  region: string | null;
  drive_minutes: number | null;
  url: string;
}

interface NearbyFisheryCardProps {
  homeLocation?: { lat: number; lon: number } | null;
}

const RISE_DAISY_GENERIC_URL =
  'https://www.risedaisy.com/?utm_source=go_daisy&utm_medium=cross_promo&utm_content=activity_page';

function handleClick() {
  trackEvent('cross_promo_click', { from_app: 'go_daisy', to_app: 'rise_daisy', placement: 'activity_page' });
}

const boxStyle: React.CSSProperties = {
  marginTop: 8,
  background: 'rgba(0, 0, 0, 0.3)',
  borderRadius: 6,
  padding: '8px 10px',
  color: '#fff',
  fontSize: '0.78rem',
  lineHeight: 1.4,
};

export default function NearbyFisheryCard({ homeLocation }: NearbyFisheryCardProps) {
  const [override, setOverride] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [fishery, setFishery] = useState<NearbyFisheryResult | null>(null);
  const [loading, setLoading] = useState(false);

  const lat = override?.lat ?? homeLocation?.lat;
  const lon = override?.lon ?? homeLocation?.lon;
  const hasLocation = typeof lat === 'number' && typeof lon === 'number';

  useEffect(() => {
    if (!hasLocation) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/cross-promo/nearby-fishery?lat=${lat}&lon=${lon}`);
        const data = res.ok ? await res.json() : { fishery: null };
        if (!cancelled) setFishery(data.fishery ?? null);
      } catch {
        if (!cancelled) setFishery(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lat, lon, hasLocation]);

  const changeLocationButton = (
    <div style={{ marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
      {!showSearch ? (
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          style={{
            fontSize: '0.68rem',
            textDecoration: 'underline',
            opacity: 0.75,
            background: 'none',
            border: 'none',
            color: '#fff',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          {override ? `Change location (${override.name})` : 'Change location for this card'}
        </button>
      ) : (
        <InlineLocationSearch
          placeholder="Search a different place…"
          storageKey="go_daisy_fishing_card_recent_v1"
          legacyKey="go_daisy_fishing_card_recent_legacy_v1"
          showMapToggle={false}
          onSelect={(loc) => {
            setOverride(loc);
            setShowSearch(false);
          }}
        />
      )}
    </div>
  );

  if (!hasLocation) {
    return (
      <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
        🎣{' '}
        <a href={RISE_DAISY_GENERIC_URL} target="_blank" rel="noopener noreferrer" onClick={handleClick} style={{ color: '#fff', textDecoration: 'underline' }}>
          Find fly fishing venues on Rise Daisy
        </a>
      </div>
    );
  }

  return (
    <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
      {loading && <span>Finding a nearby river…</span>}

      {!loading && fishery && (
        <>
          🎣{' '}
          <a
            href={fishery.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            style={{ color: '#fff', textDecoration: 'underline', fontWeight: 600 }}
          >
            {fishery.name}
          </a>
          {typeof fishery.drive_minutes === 'number' && <> — {fishery.drive_minutes} min drive</>}
          {fishery.region && <> · {fishery.region}</>}
          <span style={{ opacity: 0.7 }}> (Rise Daisy)</span>
        </>
      )}

      {!loading && !fishery && (
        <>
          🎣{' '}
          <a href={RISE_DAISY_GENERIC_URL} target="_blank" rel="noopener noreferrer" onClick={handleClick} style={{ color: '#fff', textDecoration: 'underline' }}>
            Find fly fishing venues on Rise Daisy
          </a>
        </>
      )}

      {changeLocationButton}
    </div>
  );
}
