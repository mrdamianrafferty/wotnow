export type CopernicusDataSource = 'mock' | 'copernicus';

export interface CopernicusRecordVariables {
  thetao?: number; // sea water potential temperature (°C)
  so?: number; // sea water salinity (PSU)
  o2?: number; // dissolved oxygen (mmol/m³)
  chl?: number; // chlorophyll-a concentration (mg/m³)
  no3?: number; // nitrate (mmol/m³)
  po4?: number; // phosphate (mmol/m³)
  vhm0?: number; // significant wave height (m)
  swh?: number; // alias for wave height if present
  [variable: string]: number | undefined;
}

export interface CopernicusTimeseriesRecord {
  time: string; // ISO8601
  depth: number; // metres, positive downward
  lat: number;
  lon: number;
  variables: CopernicusRecordVariables;
}

export interface CopernicusTimeseries {
  datasetId: string;
  variables: string[];
  records: CopernicusTimeseriesRecord[];
  source: CopernicusDataSource;
}

export interface CopernicusMarineBundle {
  physics: CopernicusTimeseries;
  biogeochemical: CopernicusTimeseries;
  waves?: CopernicusTimeseries;
  generatedAt: string;
}

export interface CopernicusDepthProfilePoint {
  depth: number;
  temperature?: number;
  salinity?: number;
  dissolvedOxygen?: number;
  chlorophyll?: number;
  nitrate?: number;
  phosphate?: number;
}

export interface CopernicusMarineSnapshot {
  timestamp: string;
  temperatureSurface?: number;
  salinitySurface?: number;
  dissolvedOxygenSurface?: number;
  chlorophyllSurface?: number;
  nitrateSurface?: number;
  phosphateSurface?: number;
  significantWaveHeight?: number;
  depthProfile: CopernicusDepthProfilePoint[];
}

export interface CopernicusMarineData {
  location: {
    lat: number;
    lon: number;
  };
  snapshots: CopernicusMarineSnapshot[];
  metadata: {
    datasets: string[];
    source: CopernicusDataSource;
    generatedAt: string;
    notes?: string[];
  };
}

export interface CopernicusFetchOptions {
  lat: number;
  lon: number;
  start: string; // ISO timeframe
  end: string;
  depthLevels?: number[];
}

export interface CopernicusProvider {
  fetchBundle(options: CopernicusFetchOptions): Promise<CopernicusMarineBundle>;
}
