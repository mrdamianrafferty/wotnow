import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { GardenAlertBox } from '../../components/gardening/GardenAlertBox';
import type { GardenAlertKey, GardenAlertResult } from '../../lib/gardening/gardenAlerts';

describe('GardenAlertBox', () => {
  const defaultKey: GardenAlertKey = 'heat_stress';

  const buildAlert = (overrides: Partial<GardenAlertResult> = {}): GardenAlertResult => ({
    key: overrides.key ?? defaultKey,
    severity: overrides.severity ?? 'warning',
    copy: {
      title: overrides.copy?.title ?? 'Water soon',
      message: overrides.copy?.message ?? 'Soil moisture is trending low.',
      emoji: overrides.copy?.emoji ?? '💧',
    },
    triggeredBy: overrides.triggeredBy,
  });

  it('renders a skeleton state when loading', () => {
    render(<GardenAlertBox alerts={[]} isLoading />);

    expect(screen.getByText(/Checking today's garden conditions/)).toBeInTheDocument();
  });

  it('renders a calm message when there are no alerts', () => {
    render(<GardenAlertBox alerts={[]} isLoading={false} />);

    expect(screen.getByText(/Nothing urgent in the garden right now/)).toBeInTheDocument();
  });

  it('prioritises high severity alerts and lists secondary items', () => {
    const alerts: GardenAlertResult[] = [
      buildAlert({
        key: 'wind_damage',
        severity: 'info',
        copy: {
          title: 'Breezy afternoon',
          message: 'Secure any loose covers before the wind picks up.',
          emoji: '🌬️',
        },
      }),
      buildAlert({
        key: 'frost_risk',
        severity: 'high',
        copy: {
          title: 'Freeze warning tonight',
          message: 'Cover tender crops before sundown to avoid frost damage.',
          emoji: '❄️',
        },
      }),
    ];

    render(<GardenAlertBox alerts={alerts} isLoading={false} />);

    expect(screen.getByRole('heading', { name: 'Freeze warning tonight' })).toBeInTheDocument();
    expect(
      screen.getByText('Cover tender crops before sundown to avoid frost damage.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Breezy afternoon')).toBeInTheDocument();
    expect(screen.getByText('Secure any loose covers before the wind picks up.')).toBeInTheDocument();
  });
});
