export interface FallbackConditionPayload {
  rectangle: {
    code: string;
    name: string;
    region: string;
    centerLat: number;
    centerLon: number;
  };
  snapshot: {
    capturedAt: string;
    marine: {
      seaTemperatureC: number;
      chlorophyllMgM3: number;
      dissolvedOxygenMgL: number;
      salinityPsu: number;
      nitrateUmolL: number;
      phosphateUmolL: number;
      waveHeightM: number;
      windSpeedKts: number;
      windDirectionDeg: number;
    };
    marineBio?: {
      chlorophyllAvg?: number;
      dissolvedOxygenAvg?: number;
      nitrateAvg?: number;
      phosphateAvg?: number;
      salinityAvg?: number;
      seaSurfaceTemperatureAvg?: number;
      phytoplanktonAvg?: number;
    };
    tides: {
      nextHighIso: string;
      nextLowIso: string;
    };
    hourly: Array<{
      time: string;
      waveHeightM: number;
      windSpeedKts: number;
      seaTemperatureC: number;
      tideMeters: number;
    }>;
    daily: Array<{
      label: string;
      dateLabel: string;
      waveHeightM: number;
      seaTemperatureC: number;
      windSpeedKts: number;
      fishingScore: number;
      summary: string;
    }>;
  };
}

export const FALLBACK_CONDITIONS: FallbackConditionPayload = {
  rectangle: {
    code: '24E1',
    name: 'Gijón & central Asturias',
    region: 'Bay of Biscay',
    centerLat: 43.75,
    centerLon: -6.5,
  },
  snapshot: {
    capturedAt: new Date().toISOString(),
    marine: {
      seaTemperatureC: 16.5,
      chlorophyllMgM3: 2.4,
      dissolvedOxygenMgL: 8.2,
      salinityPsu: 35.1,
      nitrateUmolL: 4.8,
      phosphateUmolL: 0.8,
      waveHeightM: 1.2,
      windSpeedKts: 15,
      windDirectionDeg: 315,
    },
    marineBio: {
      chlorophyllAvg: 2.4,
      dissolvedOxygenAvg: 8.2,
      nitrateAvg: 4.8,
      phosphateAvg: 0.8,
      salinityAvg: 35.1,
      seaSurfaceTemperatureAvg: 16.5,
      phytoplanktonAvg: 2.1,
    },
    tides: {
      nextHighIso: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      nextLowIso: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString(),
    },
    hourly: [
      { time: '14:00', waveHeightM: 1.2, windSpeedKts: 15, seaTemperatureC: 16.5, tideMeters: 2.1 },
      { time: '15:00', waveHeightM: 1.3, windSpeedKts: 18, seaTemperatureC: 16.3, tideMeters: 2.4 },
      { time: '16:00', waveHeightM: 1.4, windSpeedKts: 20, seaTemperatureC: 16.1, tideMeters: 2.8 },
      { time: '17:00', waveHeightM: 1.2, windSpeedKts: 16, seaTemperatureC: 15.9, tideMeters: 3.1 },
      { time: '18:00', waveHeightM: 1.1, windSpeedKts: 14, seaTemperatureC: 15.7, tideMeters: 3.2 },
      { time: '19:00', waveHeightM: 1.0, windSpeedKts: 12, seaTemperatureC: 15.5, tideMeters: 3.0 },
      { time: '20:00', waveHeightM: 0.9, windSpeedKts: 10, seaTemperatureC: 15.3, tideMeters: 2.7 },
      { time: '21:00', waveHeightM: 0.8, windSpeedKts: 8, seaTemperatureC: 15.1, tideMeters: 2.3 },
      { time: '22:00', waveHeightM: 0.7, windSpeedKts: 6, seaTemperatureC: 14.9, tideMeters: 1.9 },
      { time: '23:00', waveHeightM: 0.6, windSpeedKts: 5, seaTemperatureC: 14.7, tideMeters: 1.5 },
    ],
    daily: [
      { label: 'Today', dateLabel: 'Wed 28', waveHeightM: 1.2, seaTemperatureC: 16, windSpeedKts: 15, fishingScore: 92, summary: 'Perfect biology and friendly seas.' },
      { label: 'Thu', dateLabel: 'Thu 29', waveHeightM: 0.8, seaTemperatureC: 17, windSpeedKts: 12, fishingScore: 85, summary: 'Calm conditions favour bait fishing.' },
      { label: 'Fri', dateLabel: 'Fri 30', waveHeightM: 1.8, seaTemperatureC: 15, windSpeedKts: 22, fishingScore: 65, summary: 'Choppy seas — switch to heavier rigs.' },
      { label: 'Sat', dateLabel: 'Oct 1', waveHeightM: 1.5, seaTemperatureC: 16, windSpeedKts: 18, fishingScore: 74, summary: 'Mixed conditions, early session best.' },
      { label: 'Sun', dateLabel: 'Oct 2', waveHeightM: 1.0, seaTemperatureC: 18, windSpeedKts: 10, fishingScore: 90, summary: 'Ideal weekend fishing window.' },
    ],
  },
};
