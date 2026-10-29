/**
 * Where to read the water for a place whose city-centre point does not.
 *
 * The wave and sea-temperature model is a grid over open water. A city's
 * centre point is often a river mouth or a lakeshore, which the grid treats as
 * land, so the first build found "no usable sea data" for Dublin, Riga,
 * Baltimore and Jacksonville although each has a sea on its doorstep: asked
 * about a point in the water instead, all four returned a full year of both
 * waves and sea temperature. The Great Lakes cities and Seattle are the other
 * case: the wave model covers their water, but no water temperature exists
 * there, so they get waves only (see WAVES_ONLY_MEASURES in climate.ts).
 *
 * Land weather still comes from the city's own coordinates; only the water is
 * read here. Each point is a judgement about where people actually go on the
 * water from that city, and says so, so it can be argued with.
 *
 * @module lib/seo/seaPoints
 */

export interface SeaPoint {
  lat: number;
  lon: number;
  /** Why this point stands for the place's water. */
  why: string;
}

/** The furthest, in km, a chosen water point may sit from the place it stands for. */
export const MAX_POINT_KM = 80;

export const SEA_POINTS: Record<string, SeaPoint> = {
  // Real sea or estuary, where the city point is on a river mouth
  dublin: { lat: 53.3, lon: -6.05, why: 'Dublin Bay, where Dublin sails and swims' },
  riga: { lat: 57.02, lon: 24.0, why: 'the Gulf of Riga, off the Daugava mouth' },
  houston: { lat: 29.5, lon: -94.9, why: 'Galveston Bay, around Kemah and Clear Lake, where Houston sails and fishes' },
  baltimore: { lat: 39.05, lon: -76.4, why: 'the Chesapeake Bay off Annapolis, where Baltimore sails' },
  jacksonville: { lat: 30.35, lon: -81.35, why: 'the Atlantic off Jacksonville Beach' },
  // Large inland water: the wave model covers it, a water temperature does not
  chicago: { lat: 41.9, lon: -87.45, why: 'Lake Michigan, off the Chicago lakefront' },
  milwaukee: { lat: 43.05, lon: -87.75, why: 'Lake Michigan, off Milwaukee' },
  toronto: { lat: 43.6, lon: -79.35, why: 'Lake Ontario, off the Toronto waterfront' },
  seattle: { lat: 47.62, lon: -122.45, why: 'Puget Sound, off Seattle' },
};
