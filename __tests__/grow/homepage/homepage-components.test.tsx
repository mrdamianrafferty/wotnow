import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { SeasonalTint } from '../../../lib/grow/seasonalColors';
import type { WeatherTasksData, WeatherAlert } from '../../../hooks/useWeatherTasks';

// ── Mocks ────────────────────────────────────────────────────────

jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) => <div ref={ref} {...filterProps(props)}>{children}</div>),
    span: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLSpanElement>) => <span ref={ref} {...filterProps(props)}>{children}</span>),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useMotionValue: (initial: number) => ({ get: () => initial, set: () => {} }),
  useTransform: () => ({ get: () => 1, set: () => {} }),
  useReducedMotion: () => false,
}));

// Strip framer-motion-specific props to avoid React warnings
function filterProps(props: Record<string, unknown>) {
  const skip = new Set(['variants', 'initial', 'animate', 'exit', 'transition', 'whileTap', 'whileHover', 'drag', 'dragConstraints', 'dragElastic', 'onDragEnd']);
  const filtered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!skip.has(k)) filtered[k] = v;
  }
  return filtered;
}

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

jest.mock('../../../lib/grow/haptics', () => ({
  haptic: jest.fn(),
}));

jest.mock('../../../lib/grow/plantImages', () => ({
  getPlantImage: jest.fn(() => null),
}));

jest.mock('../../../lib/grow/auth', () => ({
  auth: {
    getCurrentAccessToken: jest.fn(() => null),
    getUser: jest.fn(() => null),
    getSession: jest.fn(() => null),
    isAuthenticated: jest.fn(() => false),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(() => jest.fn()),
  },
}));

// ── Fixtures ─────────────────────────────────────────────────────

const SEASONAL: SeasonalTint = {
  backgroundColor: 'rgba(219, 234, 254, 0.4)',
  borderColor: 'rgba(191, 219, 254, 0.6)',
  label: 'Awakening',
  gradient: 'linear-gradient(135deg, rgba(239,246,255,0.6), rgba(209,250,229,0.6))',
  accentColor: '#3b82f6',
  iconName: 'Sprout',
  staggerSpeed: 0.12,
  seasonKey: 'awakening',
};

const identity = (s: string) => s;

function makeWeatherData(overrides: Partial<WeatherTasksData> = {}): WeatherTasksData {
  return {
    alerts: [],
    wateringRecommendation: {
      shouldWater: false,
      reason: '',
      nextWateringDate: '',
      adjustmentFactor: 1,
      details: [],
    },
    plantingWindows: [],
    taskAdjustments: [],
    forecast: [{
      date: '2026-03-06',
      tempMin: 4,
      tempMax: 12,
      precipitation: 0,
      windSpeed: 3,
      humidity: 70,
      uvIndex: 2,
      condition: 'partly_cloudy',
      icon: '02d',
    }],
    soil: { temperature6cm: 7, moisture10cm: 55 },
    ...overrides,
  } as WeatherTasksData;
}

// ── UrgencyBanner ────────────────────────────────────────────────

import { UrgencyBanner } from '../../../components/grow/homepage/UrgencyBanner';

jest.mock('../../../components/grow/LocalSignalsCard', () => ({
  SEVERITY_COLORS: {
    high: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900' },
    critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900' },
  },
  getSignalIcon: () => ({ className }: { className?: string }) => <span className={className}>icon</span>,
  getAlertTheme: () => ({
    borderColor: 'border-l-gray-400',
    bgColor: 'bg-gray-50',
    iconColor: 'text-gray-600',
    accentColor: 'text-gray-900',
  }),
}));

describe('UrgencyBanner', () => {
  it('renders nothing when there are no urgent signals or alerts', () => {
    const { container } = render(
      <UrgencyBanner signals={[]} weatherAlerts={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a critical weather alert', () => {
    const alerts: WeatherAlert[] = [{
      type: 'frost',
      severity: 'critical',
      title: 'Frost warning tonight',
      message: 'Cover tender plants',
      forecastDate: '2026-03-06',
      forecastValue: -2,
      affectedPlantIds: [],
      suggestedAction: 'Cover tender plants with fleece',
    }];

    render(<UrgencyBanner signals={[]} weatherAlerts={alerts} />);
    expect(screen.getByText('Frost warning tonight')).toBeInTheDocument();
    expect(screen.getByText('Cover tender plants with fleece')).toBeInTheDocument();
  });

  it('shows "+N more alerts" when multiple urgent items exist', () => {
    const alerts: WeatherAlert[] = [
      { type: 'frost', severity: 'critical', title: 'Frost', message: '', forecastDate: '2026-03-06', forecastValue: -2, affectedPlantIds: [], suggestedAction: '' },
      { type: 'wind', severity: 'critical', title: 'Wind', message: '', forecastDate: '2026-03-06', forecastValue: 30, affectedPlantIds: [], suggestedAction: '' },
      { type: 'rain', severity: 'critical', title: 'Rain', message: '', forecastDate: '2026-03-06', forecastValue: 20, affectedPlantIds: [], suggestedAction: '' },
    ];

    render(<UrgencyBanner signals={[]} weatherAlerts={alerts} />);
    expect(screen.getByText('+2 more alerts')).toBeInTheDocument();
  });

  it('does not render info or warning severity weather alerts', () => {
    const alerts: WeatherAlert[] = [{
      type: 'rain',
      severity: 'warning',
      title: 'Light rain expected',
      message: '',
      forecastDate: '2026-03-06',
      forecastValue: 3,
      affectedPlantIds: [],
      suggestedAction: '',
    }];

    const { container } = render(
      <UrgencyBanner signals={[]} weatherAlerts={alerts} />
    );
    expect(container.firstChild).toBeNull();
  });
});

// ── BedsAtGlance ─────────────────────────────────────────────────

import { BedsAtGlance } from '../../../components/grow/homepage/BedsAtGlance';
import type { SerializedBed } from '../../../lib/grow/server/beds';

function makeBed(overrides: Partial<SerializedBed> = {}): SerializedBed {
  return {
    id: 'bed-1',
    name: 'Veg 1',
    type: 'raised_bed',
    color: 'terracotta',
    sortOrder: 0,
    sunExposure: 'full_sun',
    soilType: 'loam',
    sizeLabel: '4x8 ft',
    notes: '',
    plantCount: 0,
    bedStatus: 'empty',
    speciesSlugs: [],
    ...overrides,
  } as SerializedBed;
}

describe('BedsAtGlance', () => {
  it('renders nothing when not authenticated', () => {
    const { container } = render(
      <BedsAtGlance beds={[makeBed()]} isAuthenticated={false} seasonal={SEASONAL} t={identity} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows "Start your garden" when authenticated with no beds', () => {
    render(
      <BedsAtGlance beds={[]} isAuthenticated={true} seasonal={SEASONAL} t={identity} />
    );
    expect(screen.getByText('Start your garden')).toBeInTheDocument();
  });

  it('renders bed pills when beds exist', () => {
    const beds = [
      makeBed({ id: '1', name: 'Veg 1' }),
      makeBed({ id: '2', name: 'Veg 2' }),
      makeBed({ id: '3', name: 'Veg 3' }),
    ];

    render(
      <BedsAtGlance beds={beds} isAuthenticated={true} seasonal={SEASONAL} t={identity} />
    );
    expect(screen.getByText('Veg 1')).toBeInTheDocument();
    expect(screen.getByText('Veg 2')).toBeInTheDocument();
    expect(screen.getByText('Veg 3')).toBeInTheDocument();
  });

  it('shows "Plant me!" for empty beds', () => {
    render(
      <BedsAtGlance beds={[makeBed({ plantCount: 0 })]} isAuthenticated={true} seasonal={SEASONAL} t={identity} />
    );
    expect(screen.getByText('Plant me!')).toBeInTheDocument();
  });

  it('shows plant count for beds with plants but no thumbnails', () => {
    render(
      <BedsAtGlance
        beds={[makeBed({ plantCount: 5, speciesSlugs: [] })]}
        isAuthenticated={true}
        seasonal={SEASONAL}
        t={identity}
      />
    );
    expect(screen.getByText('5 plants')).toBeInTheDocument();
  });

  it('renders the MY BEDS heading', () => {
    render(
      <BedsAtGlance beds={[makeBed()]} isAuthenticated={true} seasonal={SEASONAL} t={identity} />
    );
    expect(screen.getByText('My Beds')).toBeInTheDocument();
  });
});

// ── GardenPulse ──────────────────────────────────────────────────

import { GardenPulse } from '../../../components/grow/homepage/GardenPulse';

describe('GardenPulse', () => {
  it('renders weather summary text', () => {
    const data = makeWeatherData({
      forecast: [{
        date: '2026-03-06',
        tempMin: 4,
        tempMax: 14,
        precipitation: 2.5,
        windSpeed: 5,
        humidity: 80,
        uvIndex: 2,
        condition: 'cloudy',
        icon: '04d',
        description: 'Overcast clouds',
      }] as WeatherTasksData['forecast'],
    });

    render(<GardenPulse weatherData={data} isPremium={false} seasonal={SEASONAL} t={identity} />);
    expect(screen.getByText('Garden Pulse')).toBeInTheDocument();
    expect(screen.getByText(/14°C/)).toBeInTheDocument();
    expect(screen.getByText(/Mild and damp today/)).toBeInTheDocument();
  });

  it('shows soil insight for premium users with warm soil', () => {
    const data = makeWeatherData({
      forecast: [{
        date: '2026-03-06',
        tempMin: 8,
        tempMax: 18,
        precipitation: 0,
        windSpeed: 3,
        humidity: 60,
        uvIndex: 4,
        condition: 'clear',
        icon: '01d',
        description: 'Clear sky',
      }] as WeatherTasksData['forecast'],
      soil: { temperature6cm: 10, moisture10cm: 55 },
    });

    render(<GardenPulse weatherData={data} isPremium={true} seasonal={SEASONAL} t={identity} />);
    expect(screen.getByText(/Soil at 10°C/)).toBeInTheDocument();
  });

  it('shows upsell for non-premium users with soil data', () => {
    const data = makeWeatherData({
      soil: { temperature6cm: 8, moisture10cm: 55 },
    });

    render(<GardenPulse weatherData={data} isPremium={false} seasonal={SEASONAL} t={identity} />);
    expect(screen.getByText(/Soil temperature insights available with Bloom/)).toBeInTheDocument();
  });

  it('renders nothing when forecast is empty', () => {
    const data = makeWeatherData({ forecast: [] as unknown as WeatherTasksData['forecast'] });
    const { container } = render(
      <GardenPulse weatherData={data} isPremium={false} seasonal={SEASONAL} t={identity} />
    );
    expect(container.firstChild).toBeNull();
  });
});

// ── SmartNudge ───────────────────────────────────────────────────

import { SmartNudge } from '../../../components/grow/homepage/SmartNudge';

describe('SmartNudge', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows watering nudge when shouldWater is true', () => {
    const data = makeWeatherData({
      wateringRecommendation: {
        shouldWater: true,
        reason: 'No rain for 3 days',
        nextWateringDate: '2026-03-06',
        adjustmentFactor: 1,
        details: [],
      },
    });

    render(<SmartNudge weatherData={data} urgentAlertIds={new Set()} t={identity} />);
    expect(screen.getByText('Your plants need water today')).toBeInTheDocument();
    expect(screen.getByText('No rain for 3 days')).toBeInTheDocument();
  });

  it('shows warning alert as nudge when no watering needed', () => {
    const data = makeWeatherData({
      alerts: [{
        type: 'wind',
        severity: 'warning',
        title: 'Strong winds tomorrow',
        message: 'Stake tall plants',
        forecastDate: '2026-03-07',
        forecastValue: 15,
        affectedPlantIds: [],
        suggestedAction: 'Stake your tall plants tonight',
      }],
    });

    render(<SmartNudge weatherData={data} urgentAlertIds={new Set()} t={identity} />);
    expect(screen.getByText('Strong winds tomorrow')).toBeInTheDocument();
    expect(screen.getByText('Stake your tall plants tonight')).toBeInTheDocument();
  });

  it('deduplicates alerts already shown in urgency banner', () => {
    const data = makeWeatherData({
      alerts: [{
        type: 'frost',
        severity: 'critical',
        title: 'Frost tonight',
        message: '',
        forecastDate: '2026-03-06',
        forecastValue: -2,
        affectedPlantIds: [],
        suggestedAction: 'Cover plants',
      }],
    });

    const urgentIds = new Set(['weather-frost-2026-03-06']);
    const { container } = render(
      <SmartNudge weatherData={data} urgentAlertIds={urgentIds} t={identity} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when nudge was skipped today', () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`grow:nudge-skipped:${today}`, '1');

    const data = makeWeatherData({
      wateringRecommendation: {
        shouldWater: true,
        reason: 'Dry spell',
        nextWateringDate: '',
        adjustmentFactor: 1,
        details: [],
      },
    });

    const { container } = render(
      <SmartNudge weatherData={data} urgentAlertIds={new Set()} t={identity} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no alerts and no watering needed', () => {
    const data = makeWeatherData();
    const { container } = render(
      <SmartNudge weatherData={data} urgentAlertIds={new Set()} t={identity} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows Skip today button on watering nudge', () => {
    const data = makeWeatherData({
      wateringRecommendation: {
        shouldWater: true,
        reason: 'Dry soil',
        nextWateringDate: '',
        adjustmentFactor: 1,
        details: [],
      },
    });

    render(<SmartNudge weatherData={data} urgentAlertIds={new Set()} t={identity} />);
    expect(screen.getByText('Skip today')).toBeInTheDocument();
  });
});

// ── WhatToStart ──────────────────────────────────────────────────

import { WhatToStart } from '../../../components/grow/homepage/WhatToStart';

describe('WhatToStart', () => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentWeek = Math.ceil(now.getDate() / 7);

  function makeWindow(name: string, taskCode = 'direct_sow') {
    return {
      plantSlug: name.toLowerCase(),
      plantName: name,
      taskCode,
      taskName: null,
      startMonth: currentMonth,
      startWeek: 1,
      endMonth: currentMonth,
      endWeek: 4,
      frostTolerance: null as 'hardy' | 'half_hardy' | 'tender' | null,
      frostProtectionNeeded: false,
    };
  }

  it('renders active planting windows', () => {
    const windows = [makeWindow('Pea'), makeWindow('Lettuce')];

    render(<WhatToStart windows={windows} userPlantSlugs={new Set()} seasonal={SEASONAL} t={identity} />);
    expect(screen.getByText('What to Start This Week')).toBeInTheDocument();
    expect(screen.getByText('Pea')).toBeInTheDocument();
    expect(screen.getByText('Lettuce')).toBeInTheDocument();
  });

  it('excludes species the user already grows', () => {
    const windows = [makeWindow('Pea'), makeWindow('Lettuce')];
    const userSlugs = new Set(['pea']);

    render(<WhatToStart windows={windows} userPlantSlugs={userSlugs} seasonal={SEASONAL} t={identity} />);
    expect(screen.queryByText('Pea')).not.toBeInTheDocument();
    expect(screen.getByText('Lettuce')).toBeInTheDocument();
  });

  it('shows frost tender badge for tender plants', () => {
    const windows = [{ ...makeWindow('Tomato', 'sow_indoors'), frostTolerance: 'tender' as const }];

    render(<WhatToStart windows={windows} userPlantSlugs={new Set()} seasonal={SEASONAL} t={identity} />);
    expect(screen.getByText('Frost tender')).toBeInTheDocument();
  });

  it('shows task badges (sow indoors, direct sow)', () => {
    const windows = [
      makeWindow('Tomato', 'sow_indoors'),
      makeWindow('Pea', 'direct_sow'),
    ];

    render(<WhatToStart windows={windows} userPlantSlugs={new Set()} seasonal={SEASONAL} t={identity} />);
    expect(screen.getByText(/Sow indoors/)).toBeInTheDocument();
    expect(screen.getByText(/Direct sow/)).toBeInTheDocument();
  });

  it('renders nothing when no windows are active', () => {
    // Window for a different month
    const windows = [{
      ...makeWindow('Pea'),
      startMonth: ((currentMonth + 5) % 12) + 1,
      endMonth: ((currentMonth + 5) % 12) + 1,
    }];

    const { container } = render(
      <WhatToStart windows={windows} userPlantSlugs={new Set()} seasonal={SEASONAL} t={identity} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('limits display to 3 items', () => {
    const windows = [
      makeWindow('Pea'),
      makeWindow('Lettuce'),
      makeWindow('Carrot'),
      makeWindow('Beetroot'),
    ];

    render(<WhatToStart windows={windows} userPlantSlugs={new Set()} seasonal={SEASONAL} t={identity} />);
    expect(screen.getByText('Pea')).toBeInTheDocument();
    expect(screen.getByText('Lettuce')).toBeInTheDocument();
    expect(screen.getByText('Carrot')).toBeInTheDocument();
    expect(screen.queryByText('Beetroot')).not.toBeInTheDocument();
  });
});

// ── HarvestHorizon (conditional rendering) ───────────────────────

// HarvestHorizon uses react-query internally so we test the rendering
// conditions: it returns null when the API returns no plants.

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

import { HarvestHorizon } from '../../../components/grow/homepage/HarvestHorizon';
import { useQuery } from '@tanstack/react-query';

const mockUseQuery = useQuery as jest.Mock;

describe('HarvestHorizon', () => {
  it('renders nothing when no plants are returned', () => {
    mockUseQuery.mockReturnValue({ data: [] });

    const { container } = render(
      <HarvestHorizon seasonal={SEASONAL} t={identity} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders harvest items when plants exist', () => {
    mockUseQuery.mockReturnValue({
      data: [{
        plantingId: 'p1',
        plantName: 'Tomato',
        speciesSlug: 'tomato',
        bedName: 'Veg 1',
        bedColor: 'terracotta',
        plantedAt: '2026-01-15',
        daysRemaining: 14,
        growthProgress: 0.7,
        stageBadgeClass: 'bg-green-100 text-green-700',
        stageLabel: 'Fruiting',
      }],
    });

    render(<HarvestHorizon seasonal={SEASONAL} t={identity} />);
    expect(screen.getByText('Harvest Horizon')).toBeInTheDocument();
    expect(screen.getByText('Tomato')).toBeInTheDocument();
    expect(screen.getByText('~14 days remaining')).toBeInTheDocument();
  });

  it('shows "Ready now" for plants with 0 days remaining', () => {
    mockUseQuery.mockReturnValue({
      data: [{
        plantingId: 'p2',
        plantName: 'Lettuce',
        speciesSlug: 'lettuce',
        bedName: 'Veg 2',
        bedColor: 'sage',
        plantedAt: '2026-01-01',
        daysRemaining: 0,
        growthProgress: 1.0,
        stageBadgeClass: 'bg-yellow-100 text-yellow-700',
        stageLabel: 'Ready',
      }],
    });

    render(<HarvestHorizon seasonal={SEASONAL} t={identity} />);
    expect(screen.getByText('Ready now')).toBeInTheDocument();
  });
});
