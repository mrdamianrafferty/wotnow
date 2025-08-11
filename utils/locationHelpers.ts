

export type Location = {
  type: 'home' | 'coastal';
  name?: string;
  lat: number;
  lon: number;
};

export function getHomeLocation(locations: Location[]): Location | undefined {
  return locations.find((loc) => loc.type === 'home');
}

export function getCoastalLocation(locations: Location[]): Location | undefined {
  return locations.find((loc) => loc.type === 'coastal');
}

export function hasValidLocation(location?: Location): boolean {
  return !!(location && typeof location.lat === 'number' && typeof location.lon === 'number');
}

export function setLocation(
  locations: Location[],
  newLoc: Location
): Location[] {
  return locations.map((loc) =>
    loc.type === newLoc.type ? { ...loc, ...newLoc } : loc
  );
}

// Optionally, a helper to provide a default location (e.g., Paris)
export function getDefaultHomeLocation(): Location {
  return {
    type: 'home',
    name: 'Paris, France',
    lat: 48.8566,
    lon: 2.3522,
  };
}

export function getDefaultCoastalLocation(): Location {
  return {
    type: 'coastal',
    name: 'Colunga, Asturias',
    lat: 43.4891,
    lon: -5.2712,
  };
}