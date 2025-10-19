/**
 * Tests for ActiveSpeciesCard component
 * For species with 85%+ confidence - high priority fishing targets
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActiveSpeciesCard } from '../../../components/findr/ActiveSpeciesCard';

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
  getNextPeakTime: jest.fn(() => 2),
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

jest.mock('../../../components/GradientFish', () => ({
  GradientFish: () => <div data-testid="gradient-fish">GradientFish</div>,
}));

jest.mock('../../../components/findr/DataFreshnessBadge', () => ({
  DataFreshnessBadge: ({ freshness }: { freshness: string }) => (
    <div data-testid="freshness-badge">{freshness}</div>
  ),
}));

jest.mock('../../../components/findr/EnvironmentalInfo', () => ({
  EnvironmentalInfo: () => <div data-testid="environmental-info">EnvironmentalInfo</div>,
}));

describe('ActiveSpeciesCard', () => {
  const mockOnRemove = jest.fn();
  const mockOnTogglePriority = jest.fn();
  const mockOnAction = jest.fn();

  const defaultSpecies = {
    id: 'sea-bass-1',
    name: 'Sea Bass',
    scientificName: 'Dicentrarchus labrax',
    emoji: '🐟',
    image: { src: '/images/sea-bass.webp', alt: 'Sea Bass' },
    confidence: 92,
    forecast: [85, 90, 88, 82, 78],
    season: 'Summer-Autumn',
    bestBait: 'Mackerel strips',
    isPriority: true,
  };

  const defaultLocation = { lat: 48.8566, lon: 2.3522 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render species name and scientific name', () => {
      render(
        <ActiveSpeciesCard
          species={defaultSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByText('Sea Bass')).toBeInTheDocument();
      expect(screen.getByText('Dicentrarchus labrax')).toBeInTheDocument();
    });

    it('should display confidence percentage', () => {
      render(
        <ActiveSpeciesCard
          species={defaultSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByText(/92%/)).toBeInTheDocument();
    });

    it('should render species image when provided', () => {
      render(
        <ActiveSpeciesCard
          species={defaultSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      const image = screen.getByAltText('Sea Bass');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/images/sea-bass.webp');
    });

    it('should render GradientFish placeholder when no image', () => {
      const speciesWithoutImage = { ...defaultSpecies, image: null };

      render(
        <ActiveSpeciesCard
          species={speciesWithoutImage}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByTestId('gradient-fish')).toBeInTheDocument();
    });

    it('should display best bait information when expanded', () => {
      render(
        <ActiveSpeciesCard
          species={defaultSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      // Find and click the expand button
      const expandButton = screen.getByText('Show how to catch');
      fireEvent.click(expandButton);

      // Now the bait info should be visible
      expect(screen.getByText(/Mackerel strips/)).toBeInTheDocument();
    });

    it('should display season information when expanded', () => {
      render(
        <ActiveSpeciesCard
          species={defaultSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      // Find and click the expand button
      const expandButton = screen.getByText('Show how to catch');
      fireEvent.click(expandButton);

      // Now the season info should be visible
      expect(screen.getByText(/Summer-Autumn/)).toBeInTheDocument();
    });
  });

  describe('Environmental Data (Phase 10)', () => {
    it('should render DataFreshnessBadge when freshness data provided', () => {
      const speciesWithFreshness = {
        ...defaultSpecies,
        data_freshness: 'fresh' as const,
      };

      render(
        <ActiveSpeciesCard
          species={speciesWithFreshness}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByTestId('freshness-badge')).toBeInTheDocument();
      expect(screen.getByText('fresh')).toBeInTheDocument();
    });

    it('should render EnvironmentalInfo when environmental_factors provided', () => {
      const speciesWithEnvData = {
        ...defaultSpecies,
        environmental_factors: {
          temperature: { actual: 15, match: 'optimal', score: 100 },
          salinity: { actual: 35, match: 'good', score: 85 },
        },
      };

      render(
        <ActiveSpeciesCard
          species={speciesWithEnvData}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByTestId('environmental-info')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onAction when card container is clicked', () => {
      render(
        <ActiveSpeciesCard
          species={defaultSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
          onAction={mockOnAction}
        />
      );

      // Get the card container div (role="button")
      const cards = screen.getAllByRole('button');
      const cardContainer = cards[0]; // The main card is the first button
      fireEvent.click(cardContainer);

      expect(mockOnAction).toHaveBeenCalledWith('sea-bass-1');
    });

    it('should call onAction when Enter key is pressed on card container', () => {
      render(
        <ActiveSpeciesCard
          species={defaultSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
          onAction={mockOnAction}
        />
      );

      const cards = screen.getAllByRole('button');
      const cardContainer = cards[0];
      fireEvent.keyDown(cardContainer, { key: 'Enter' });

      expect(mockOnAction).toHaveBeenCalledWith('sea-bass-1');
    });

    it('should not call onAction when other keys are pressed', () => {
      render(
        <ActiveSpeciesCard
          species={defaultSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
          onAction={mockOnAction}
        />
      );

      const cards = screen.getAllByRole('button');
      const cardContainer = cards[0];
      fireEvent.keyDown(cardContainer, { key: 'Space' });

      expect(mockOnAction).not.toHaveBeenCalled();
    });

    it('should not crash when onAction is not provided', () => {
      render(
        <ActiveSpeciesCard
          species={defaultSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      const cards = screen.getAllByRole('button');
      const cardContainer = cards[0];
      expect(() => fireEvent.click(cardContainer)).not.toThrow();
    });
  });

  describe('Expand/Collapse', () => {
    it('should toggle expanded state when clicking expand button', () => {
      render(
        <ActiveSpeciesCard
          species={defaultSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      // Initially not expanded - details should not be visible
      expect(screen.queryByText(/Best bait:/)).not.toBeInTheDocument();

      // Find and click the expand button
      const expandButton = screen.getByText('Show how to catch');
      fireEvent.click(expandButton);

      // After expansion, details should be visible
      expect(screen.getByText(/Best bait:/)).toBeInTheDocument();
      expect(screen.getByText(/Season:/)).toBeInTheDocument();

      // Click again to collapse
      const collapseButton = screen.getByText('Hide details');
      fireEvent.click(collapseButton);

      // Details should be hidden again
      expect(screen.queryByText(/Best bait:/)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle species without scientific name', () => {
      const speciesNoScientific = { ...defaultSpecies, scientificName: undefined };

      render(
        <ActiveSpeciesCard
          species={speciesNoScientific}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByText('Sea Bass')).toBeInTheDocument();
      expect(screen.queryByText('Dicentrarchus labrax')).not.toBeInTheDocument();
    });

    it('should handle null location', () => {
      render(
        <ActiveSpeciesCard
          species={defaultSpecies}
          location={null}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByText('Sea Bass')).toBeInTheDocument();
    });

    it('should handle undefined location', () => {
      render(
        <ActiveSpeciesCard
          species={defaultSpecies}
          location={undefined}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByText('Sea Bass')).toBeInTheDocument();
    });

    it('should handle confidence at exactly 85%', () => {
      const species85 = { ...defaultSpecies, confidence: 85 };

      render(
        <ActiveSpeciesCard
          species={species85}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByText(/85%/)).toBeInTheDocument();
    });

    it('should handle confidence near 100%', () => {
      const species100 = { ...defaultSpecies, confidence: 98 };

      render(
        <ActiveSpeciesCard
          species={species100}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByText(/98%/)).toBeInTheDocument();
    });
  });
});
