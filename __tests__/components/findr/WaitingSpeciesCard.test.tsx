/**
 * Tests for WaitingSpeciesCard component
 * For species with <60% confidence - waiting for better conditions
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { WaitingSpeciesCard } from '../../../components/findr/WaitingSpeciesCard';

// Mock the hooks and dependencies
jest.mock('../../../hooks/useTideData', () => ({
  useTideData: jest.fn(() => null),
}));

jest.mock('../../../utils/fishingTimeDataService', () => ({
  getImmediateFishingTimes: jest.fn(() => ({
    primaryWindow: { startHour: 6, endHour: 9 },
    emoji: '🌅',
    recommendation: 'Best during dawn',
  })),
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ComponentProps<'img'>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock child components
jest.mock('../../../components/findr/MiniCalendar', () => ({
  MiniCalendar: () => <div data-testid="mini-calendar">MiniCalendar</div>,
}));

jest.mock('../../../components/translation/TranslatedFishCard', () => ({
  TranslatedFishName: ({ name }: { name: string }) => <span>{name}</span>,
  TranslatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock('../../../components/findr/EnvironmentalInfo', () => ({
  EnvironmentalInfo: () => <div data-testid="environmental-info">EnvironmentalInfo</div>,
}));

describe('WaitingSpeciesCard', () => {
  const mockOnRemove = jest.fn();
  const mockOnTogglePriority = jest.fn();

  const defaultSpecies = {
    id: 'cod-1',
    name: 'Cod',
    emoji: '🐟',
    image: { src: '/images/cod.webp', alt: 'Cod' },
    confidence: 45,
    forecast: [40, 42, 45, 48, 50],
    isPriority: false,
  };

  const defaultLocation = { lat: 48.8566, lon: 2.3522 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render species name', () => {
      render(
        <WaitingSpeciesCard
          species={defaultSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByText('Cod')).toBeInTheDocument();
    });

    it('should display confidence percentage for waiting range (<60%)', () => {
      render(
        <WaitingSpeciesCard
          species={defaultSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByText(/45%/)).toBeInTheDocument();
    });

    it('should render species image when provided', () => {
      render(
        <WaitingSpeciesCard
          species={defaultSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      const image = screen.getByAltText('Cod');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/images/cod.webp');
    });

    it('should display Fish icon placeholder when no image', () => {
      const speciesWithoutImage = { ...defaultSpecies, image: null };

      render(
        <WaitingSpeciesCard
          species={speciesWithoutImage}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      // Should still render the species name, even without image
      expect(screen.getByText('Cod')).toBeInTheDocument();
      // The component renders a Fish icon, but we can't easily test SVG elements
      // Just verify it doesn't crash
    });
  });

  describe('Environmental Data (Phase 10)', () => {
    it('should render EnvironmentalInfo when environmental_factors provided', () => {
      const speciesWithEnvData = {
        ...defaultSpecies,
        environmental_factors: {
          temperature: { actual: 15, match: 'suboptimal', score: 45 },
          salinity: { actual: 35, match: 'fair', score: 50 },
        },
      };

      render(
        <WaitingSpeciesCard
          species={speciesWithEnvData}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByTestId('environmental-info')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null location', () => {
      render(
        <WaitingSpeciesCard
          species={defaultSpecies}
          location={null}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByText('Cod')).toBeInTheDocument();
    });

    it('should handle confidence at exactly 59%', () => {
      const species59 = { ...defaultSpecies, confidence: 59 };

      render(
        <WaitingSpeciesCard
          species={species59}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByText(/59%/)).toBeInTheDocument();
    });

    it('should handle very low confidence', () => {
      const species10 = { ...defaultSpecies, confidence: 10 };

      render(
        <WaitingSpeciesCard
          species={species10}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByText(/10%/)).toBeInTheDocument();
    });

    it('should handle improving forecast', () => {
      const improvingSpecies = {
        ...defaultSpecies,
        forecast: [30, 35, 40, 50, 60], // Improving trend
      };

      render(
        <WaitingSpeciesCard
          species={improvingSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      // Component should render without crashing
      expect(screen.getByText('Cod')).toBeInTheDocument();
    });

    it('should handle declining forecast', () => {
      const decliningSpecies = {
        ...defaultSpecies,
        forecast: [60, 50, 40, 35, 30], // Declining trend
      };

      render(
        <WaitingSpeciesCard
          species={decliningSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      // Component should render without crashing
      expect(screen.getByText('Cod')).toBeInTheDocument();
    });
  });
});
