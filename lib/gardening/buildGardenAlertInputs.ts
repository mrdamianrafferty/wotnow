import type { GardenAlertInputs, DaySlice, HourSlice, SoilSlice } from './gardenAlerts';
import type { UnifiedWeatherAPIResponse } from '../../types/weather';

type NormalizedDay = DaySlice;
type NormalizedHour = HourSlice;

function coerceNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
		const parsed = Number.parseFloat(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

function toDaySlice(day: unknown): NormalizedDay | null {
	if (!day || typeof day !== 'object') return null;
	const record = day as Record<string, unknown>;
	const dateISO = typeof record.dateISO === 'string' ? record.dateISO : null;
	if (!dateISO) return null;

	const minTempC = coerceNumber(record.minC ?? record.minTempC);
	const maxTempC = coerceNumber(record.maxC ?? record.maxTempC);
	const totalPrecipMm = coerceNumber(record.precipMM ?? record.precipMm ?? record.precipitationMm);

	return {
		dateISO,
		minTempC,
		maxTempC,
		totalPrecipMm,
	};
}

function toHourSlice(hour: unknown): NormalizedHour | null {
	if (!hour || typeof hour !== 'object') return null;
	const record = hour as Record<string, unknown>;
	const timeISO = typeof record.timeISO === 'string' ? record.timeISO : null;
	if (!timeISO) return null;

	const windSpeedKmh = (() => {
		const explicit = coerceNumber(record.windSpeedKmh ?? record.windSpeedKmH ?? record.windSpeedKph);
		if (explicit != null) return explicit;
		const metric = coerceNumber(record.windMS ?? record.windMs ?? record.windSpeedMS);
		if (metric != null) return metric * 3.6;
		const imperial = coerceNumber(record.windMph ?? record.windSpeedMph);
		if (imperial != null) return imperial * 1.60934;
		return null;
	})();

	return {
		timeISO,
		airTempC: coerceNumber(record.tempC ?? record.temperatureC ?? record.airTempC),
		humidityPct: coerceNumber(record.humidityPct ?? record.humidity),
		precipMm: coerceNumber(record.precipMM ?? record.precipMm ?? record.precipitationMm ?? record.rainMm),
		cloudPct: coerceNumber(record.cloudCoverPct ?? record.cloudPct ?? record.cloudcover),
		windSpeedKmh,
	};
}

function toSoilSlice(soil: unknown, dateISO: string | undefined): SoilSlice | undefined {
	if (!soil || typeof soil !== 'object') return undefined;
	const record = soil as Record<string, unknown>;
	const temp0cm = coerceNumber(record.temp0cm ?? record.topTempC);
	const moisture0to1 = coerceNumber(record.moisture0to1 ?? record.topMoisture ?? record.vwc);
	const moisture3to9 = coerceNumber(record.moisture3to9 ?? record.midMoisture);

	if (temp0cm == null && moisture0to1 == null && moisture3to9 == null) return undefined;

	return {
		dateISO: dateISO ?? new Date().toISOString(),
		temp0cm,
		moisture0to1,
		moisture3to9,
	};
}

export function buildGardenAlertInputs(weather: UnifiedWeatherAPIResponse): GardenAlertInputs | null {
	if (!weather) return null;

	const days = Array.isArray(weather.daily) ? weather.daily.map(toDaySlice).filter(Boolean) as NormalizedDay[] : [];
	const hours = Array.isArray(weather.hourly) ? weather.hourly.map(toHourSlice).filter(Boolean) as NormalizedHour[] : [];

	if (!days.length || !hours.length) return null;

	const today = days[0];
	if (!today) return null;

	const soilToday = toSoilSlice(weather.soil, today.dateISO);

	return {
		today,
		hoursNext24: hours.slice(0, 24),
		hoursNext48: hours.slice(0, 48),
		last7Days: days.slice(0, 7),
		soilToday,
	};
}
