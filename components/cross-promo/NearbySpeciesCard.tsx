/**
 * NearbySpeciesCard — cross-promo: species to target near you (Findr)
 * ─────────────────────────────────────────────────────────────────────────
 * Renders inside the sea_fishing_shore / sea_fishing_boat activity cards
 * (see pages/activities.tsx). Resolves the top species available near the
 * user's location via a server-side proxy
 * (pages/api/cross-promo/nearby-species.ts), which chains Findr's
 * rectangle-lookup + species/regional endpoints — Findr's actual strength
 * (species availability by location), rather than trying to force Findr
 * into Rise Daisy's "named venue" shape, which it doesn't have.
 *
 * Defaults to the user's saved coastal location (falling back to home),
 * matching the same lat/lon resolution already used for other marine
 * features on this card (see the beach-orientation effect above). Offers
 * a lightweight per-card location override that does NOT touch the user's
 * saved Go Daisy location — purely local component state.
 *
 * Always renders something useful: a short species list when the resolver
 * finds one, a generic Findr link when it doesn't or the call fails, and
 * the same generic link when no location is available at all.
 */

import { useEffect, useState } from 'react';
import InlineLocationSearch from '@/components/grow/onboarding/InlineLocationSearch';
import { trackEvent } from '@/lib/analytics/events';

interface NearbySpeciesResult {
  commonName: string;
  scientificName?: string;
  url: string;
}

interface NearbySpeciesCardProps {
  coastalLocation?: { lat: number; lon: number } | null;
  homeLocation?: { lat: number; lon: number } | null;
}

const FINDR_GENERIC_URL = 'https://fishfindr.eu/?utm_source=go_daisy&utm_medium=cross_promo&utm_content=activity_page';

function handleClick() {
  trackEvent('cross_promo_click', { from_app: 'go_daisy', to_app: 'findr', placement: 'activity_page' });
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

export default function NearbySpeciesCard({ coastalLocation, homeLocation }: NearbySpeciesCardProps) {
  const [override, setOverride] = useState<{ name: string; lat: number; lon: number } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [species, setSpecies] = useState<NearbySpeciesResult[]>([]);
  const [loading, setLoading] = useState(false);

  const lat = override?.lat ?? coastalLocation?.lat ?? homeLocation?.lat;
  const lon = override?.lon ?? coastalLocation?.lon ?? homeLocation?.lon;
  const hasLocation = typeof lat === 'number' && typeof lon === 'number';

  useEffect(() => {
    if (!hasLocation) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/cross-promo/nearby-species?lat=${lat}&lon=${lon}`);
        const data = res.ok ? await res.json() : { species: [] };
        if (!cancelled) setSpecies(Array.isArray(data.species) ? data.species : []);
      } catch {
        if (!cancelled) setSpecies([]);
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
          storageKey="go_daisy_sea_fishing_card_recent_v1"
          legacyKey="go_daisy_sea_fishing_card_recent_legacy_v1"
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
        🐟{' '}
        <a href={FINDR_GENERIC_URL} target="_blank" rel="noopener noreferrer" onClick={handleClick} style={{ color: '#fff', textDecoration: 'underline' }}>
          See what&apos;s biting on Findr
        </a>
      </div>
    );
  }

  return (
    <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
      {loading && <span>Finding species near you…</span>}

      {!loading && species.length > 0 && (
        <>
          🐟 Target species:{' '}
          {species.map((s, i) => (
            <span key={s.commonName}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClick}
                style={{ color: '#fff', textDecoration: 'underline', fontWeight: 600 }}
              >
                {s.commonName}
              </a>
              {i < species.length - 1 ? ', ' : ''}
            </span>
          ))}
          <span style={{ opacity: 0.7 }}> (Findr)</span>
        </>
      )}

      {!loading && species.length === 0 && (
        <>
          🐟{' '}
          <a href={FINDR_GENERIC_URL} target="_blank" rel="noopener noreferrer" onClick={handleClick} style={{ color: '#fff', textDecoration: 'underline' }}>
            See what&apos;s biting on Findr
          </a>
        </>
      )}

      {changeLocationButton}
    </div>
  );
}
