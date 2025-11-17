'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

const codSeasonalityData = [
  { month: 1, availability: 0.9 },
  { month: 2, availability: 0.85 },
  { month: 3, availability: 0.7 },
  { month: 4, availability: 0.4 },
  { month: 5, availability: 0.3 },
  { month: 6, availability: 0.25 },
  { month: 7, availability: 0.25 },
  { month: 8, availability: 0.3 },
  { month: 9, availability: 0.4 },
  { month: 10, availability: 0.7 },
  { month: 11, availability: 0.95 },
  { month: 12, availability: 1.0 },
];

// Cornwall / Bay of Biscay – demo values
const peakMonths = [11, 12, 1]; // Nov–Jan
const goodMonths = [10, 11, 12, 1, 2]; // Oct–Mar
const possibleMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const currentMonth = new Date().getMonth() + 1; // 1–12

function getCurrentSeasonStatus(month: number): 'Peak' | 'Good' | 'Possible' | 'Off-season' {
  if (peakMonths.includes(month)) return 'Peak';
  if (goodMonths.includes(month)) return 'Good';
  if (possibleMonths.includes(month)) return 'Possible';
  return 'Off-season';
}

const statusColours: Record<string, string> = {
  'Peak': 'bg-blue-100 text-blue-800 border-blue-300',
  'Good': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Possible': 'bg-amber-50 text-amber-800 border-amber-200',
  'Off-season': 'bg-gray-100 text-gray-500 border-gray-200',
};

export default function CodSeasonalityCardPage() {
  const seasonStatus = getCurrentSeasonStatus(currentMonth);

  return (
    <main className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-3xl bg-base-100 shadow-xl rounded-3xl border border-base-200">
        <div className="card-body space-y-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="card-title text-base-content text-2xl font-semibold">
                Atlantic Cod
              </h1>
              <p className="text-xs md:text-sm text-base-content/70 mt-1">
                Seasonal species · Lastres · Bay of Biscay
              </p>
            </div>

            {/* Dynamic season badge */}
            <div className="flex items-start">
              <span
                className={[
                  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
                  statusColours[seasonStatus],
                ].join(' ')}
              >
                {seasonStatus}
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="mt-2 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={codSeasonalityData}
                margin={{ top: 10, right: 16, bottom: 24, left: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                />
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
                <YAxis
                  hide
                  domain={[0, 1]}
                />
                {/* Current-month marker */}
                <ReferenceLine
                  x={currentMonth}
                  stroke="#f97316"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                />
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

          {/* Legend chips */}
          <div className="flex flex-wrap gap-2 mt-1">
            <div className="badge badge-ghost border-base-300 text-xs font-medium px-3 py-2">
              Peak: Nov–Jan
            </div>
            <div className="badge badge-ghost border-base-300 text-xs font-medium px-3 py-2">
              Good: Oct–Mar
            </div>
            <div className="badge badge-ghost border-base-300 text-xs font-medium px-3 py-2">
              Possible: year-round
            </div>
          </div>

          {/* Caption */}
          <p className="mt-1 text-[11px] md:text-xs text-base-content/60">
            Months shown as 1–12. Orange line marks the current month.
          </p>
        </div>
      </div>
    </main>
  );
}