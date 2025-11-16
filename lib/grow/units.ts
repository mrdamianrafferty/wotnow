export type UnitSystem = 'metric' | 'imperial';

const TEMPERATURE_SYMBOL: Record<UnitSystem, string> = {
	metric: '°C',
	imperial: '°F',
};

const WIND_SYMBOL: Record<UnitSystem, string> = {
	metric: 'km/h',
	imperial: 'mph',
};

const VISIBILITY_SYMBOL: Record<UnitSystem, string> = {
	metric: 'km',
	imperial: 'mi',
};

const PRESSURE_SYMBOL: Record<UnitSystem, string> = {
	metric: 'hPa',
	imperial: 'inHg',
};

const DEFAULT_PLACEHOLDER = '—';

const toFahrenheit = (value: number) => (value * 9) / 5 + 32;
const toMilesPerHour = (value: number) => value / 1.60934;
const toMiles = (value: number) => value / 1.60934;
const toInchesOfMercury = (value: number) => value * 0.02953;

const clampUnitSystem = (unitSystem?: UnitSystem): UnitSystem =>
	unitSystem === 'imperial' ? 'imperial' : 'metric';

const formatValue = (value: number, precision: number = 0) =>
	precision > 0 ? value.toFixed(precision) : Math.round(value).toString();

export function formatTemperature(value: number | null | undefined, unitSystem?: UnitSystem, includeUnit: boolean = true): string {
	if (value == null || Number.isNaN(value)) {
		return DEFAULT_PLACEHOLDER;
	}

	const system = clampUnitSystem(unitSystem);
	const converted = system === 'imperial' ? toFahrenheit(value) : value;
	const display = formatValue(converted);

	return includeUnit ? `${display} ${TEMPERATURE_SYMBOL[system]}` : display;
}

export function formatWindSpeed(value: number | null | undefined, unitSystem?: UnitSystem, includeUnit: boolean = true): string {
	if (value == null || Number.isNaN(value)) {
		return DEFAULT_PLACEHOLDER;
	}

	const system = clampUnitSystem(unitSystem);
	const converted = system === 'imperial' ? toMilesPerHour(value) : value;
	const display = formatValue(converted);

	return includeUnit ? `${display} ${WIND_SYMBOL[system]}` : display;
}

export function formatVisibility(value: number | null | undefined, unitSystem?: UnitSystem, includeUnit: boolean = true): string {
	if (value == null || Number.isNaN(value)) {
		return DEFAULT_PLACEHOLDER;
	}

	const system = clampUnitSystem(unitSystem);
	const converted = system === 'imperial' ? toMiles(value) : value;
	const display = formatValue(converted, converted < 10 ? 1 : 0);

	return includeUnit ? `${display} ${VISIBILITY_SYMBOL[system]}` : display;
}

export function formatPressure(value: number | null | undefined, unitSystem?: UnitSystem, includeUnit: boolean = true): string {
	if (value == null || Number.isNaN(value)) {
		return DEFAULT_PLACEHOLDER;
	}

	const system = clampUnitSystem(unitSystem);
	const converted = system === 'imperial' ? toInchesOfMercury(value) : value;
	const precision = system === 'imperial' ? 2 : 0;
	const display = formatValue(converted, precision);

	return includeUnit ? `${display} ${PRESSURE_SYMBOL[system]}` : display;
}
