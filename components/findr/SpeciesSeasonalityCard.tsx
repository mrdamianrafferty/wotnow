'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { SeasonalityCurve, SeasonalityProfile } from '@/types/findrSeasonality';

const REGION_LABELS: Record<string, string> = {
  BALT: 'Baltic Sea',
  BIS: 'Bay of Biscay',
  IBR: 'Iberian Coast',
  MED: 'Mediterranean Sea',
  NEA: 'North-East Atlantic',
  NSEA: 'North Sea',
  SCA: 'Scandinavia & Barents',
};

const PROFILE_LABELS: Record<SeasonalityProfile, string> = {
  year_round_resident: 'Mostly year-round',
  partial_resident: 'Seasonal species',
  seasonal_visitor: 'Highly seasonal visitor',
};

const STATUS_STYLES: Record<string, string> = {
  Peak: 'bg-blue-100 text-blue-800 border-blue-300',
  Good: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Possible: 'bg-amber-50 text-amber-700 border-amber-200',
  'Off-season': 'bg-gray-100 text-gray-500 border-gray-200',
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const VALUE_OFF = 0;
const VALUE_POSSIBLE = 0.35;
const VALUE_GOOD = 0.65;
const VALUE_PEAK = 1;

function buildSeasonalitySeries(curve: SeasonalityCurve) {
  const peakMonths = curve.peak_months ?? [];
  const goodMonths = curve.good_months ?? [];
  const possibleMonths = curve.possible_months ?? [];

  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    let availability = VALUE_OFF;

    if (possibleMonths.includes(month)) availability = VALUE_POSSIBLE;
    if (goodMonths.includes(month)) availability = VALUE_GOOD;
    if (peakMonths.includes(month)) availability = VALUE_PEAK;

    return { month, availability };
  });
}

function getCurrentSeasonStatus(curve: SeasonalityCurve | null): 'Peak' | 'Good' | 'Possible' | 'Off-season' {
  if (!curve) return 'Off-season';
  const month = new Date().getMonth() + 1;
  if (curve.peak_months?.includes(month)) return 'Peak';
  if (curve.good_months?.includes(month)) return 'Good';
  if (curve.possible_months?.includes(month)) return 'Possible';
  return 'Off-season';
}

interface MonthRange {
  start: number;
  end: number;
}

// Collapse the month list into contiguous ranges and merge wrap-around segments.
function createMonthRanges(months: number[]): MonthRange[] {
  const unique = Array.from(new Set(months.filter((month) => Number.isFinite(month) && month >= 1 && month <= 12))).sort(
    (a, b) => a - b
  );

  if (unique.length === 0) {
    return [];
  }

  if (unique.length === 12) {
    return [{ start: 1, end: 12 }];
  }

  const ranges: MonthRange[] = [];
  let start = unique[0];
  let previous = unique[0];

  for (let index = 1; index < unique.length; index += 1) {
    const month = unique[index];
    if (month === previous + 1) {
      previous = month;
      continue;
    }
    ranges.push({ start, end: previous });
    start = month;
    previous = month;
  }
  ranges.push({ start, end: previous });

  const firstRange = ranges[0];
  const lastRange = ranges[ranges.length - 1];
  if (firstRange && lastRange && firstRange.start === 1 && lastRange.end === 12 && ranges.length > 1) {
    ranges[0] = { start: lastRange.start, end: firstRange.end };
    ranges.pop();
  }

  return ranges;
}

function formatMonthRange(range: MonthRange): string {
  if (range.start === 1 && range.end === 12) {
    return 'Year-round';
  }

  const startLabel = MONTH_LABELS[range.start - 1];
  const endLabel = MONTH_LABELS[range.end - 1];

  if (range.start === range.end) {
    return startLabel;
  }

  return `${startLabel}-${endLabel}`;
}

function formatSeasonBucket(months: number[]): string {
  if (!months || months.length === 0) {
    return 'No data';
  }

  if (months.length === 12) {
    return 'Year-round';
  }

  const ranges = createMonthRanges(months);
  return ranges.map(formatMonthRange).join(', ');
}

interface SpeciesSeasonalityCardProps {
  speciesName: string;
  speciesCode: string;
  locationLabel: string;
  regionCode: string;
  seasonalityProfile: SeasonalityProfile;
  isSeasonal: boolean;
  curve: SeasonalityCurve;
}

export const SpeciesSeasonalityCard: React.FC<SpeciesSeasonalityCardProps> = ({
  speciesName,
  speciesCode,
  locationLabel,
  regionCode,
  seasonalityProfile,
  isSeasonal,
  curve,
}) => {
  const chartData = useMemo(() => buildSeasonalitySeries(curve), [curve]);
  const seasonStatus = useMemo(() => getCurrentSeasonStatus(curve), [curve]);

  const peakLabel = useMemo(() => formatSeasonBucket(curve.peak_months), [curve.peak_months]);
  const goodLabel = useMemo(() => formatSeasonBucket(curve.good_months), [curve.good_months]);
  const possibleLabel = useMemo(() => formatSeasonBucket(curve.possible_months), [curve.possible_months]);

  const regionLabel = REGION_LABELS[regionCode] ?? regionCode ?? 'Selected region';
  const profileLabel = PROFILE_LABELS[seasonalityProfile] ?? 'Seasonal profile';
  const currentMonth = new Date().getMonth() + 1;
  const statusStyle = STATUS_STYLES[seasonStatus] ?? STATUS_STYLES['Off-season'];

  const sourceConfidencePercent = curve.source_confidence != null
    ? Math.round(curve.source_confidence * 100)
    : null;

  return (
    <div className="rounded-2xl border border-base-200 bg-base-100 p-4 md:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-base-content">
            {speciesName}
            <span className="ml-2 text-xs font-normal text-base-content/50">{speciesCode}</span>
          </h3>
          <p className="mt-1 text-xs md:text-sm text-base-content/70">
            {profileLabel} · {locationLabel} · {regionLabel}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${statusStyle}`}>
          {seasonStatus}
        </span>
      </div>

      <div className="mt-4 h-52 w-full md:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 16, bottom: 24, left: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              type="number"
              domain={[1, 12]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: '#4b5563', fontSize: 12 }}
              allowDecimals={false}
            />
            <YAxis hide domain={[0, 1]} />
            <ReferenceLine x={currentMonth} stroke="#f97316" strokeDasharray="4 4" strokeWidth={2} />
            <Line
              type="monotone"
              dataKey="availability"
              stroke="#2563eb"
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-base-content/80">
        <div className="badge badge-ghost border-base-300 px-3 py-2">Peak: {peakLabel}</div>
        <div className="badge badge-ghost border-base-300 px-3 py-2">Good: {goodLabel}</div>
        <div className="badge badge-ghost border-base-300 px-3 py-2">Possible: {possibleLabel}</div>
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-[11px] text-base-content/60">Months plotted 1-12 (Jan-Dec). Orange dash marks the current month.</p>
        <p className="text-[11px] text-base-content/60">
          {isSeasonal ? 'Seasonality adjusted confidence for this region.' : 'This species is mostly year-round here.'}
        </p>
        {curve.source && (
          <p className="text-[11px] text-base-content/50">
            Source: {curve.source}{' '}
            {sourceConfidencePercent != null ? `(confidence ${sourceConfidencePercent}%)` : ''}
          </p>
        )}
      </div>
    </div>
  );
};
