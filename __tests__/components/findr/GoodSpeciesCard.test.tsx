/**
 * Tests for GoodSpeciesCard component
 * For species with 70-84% confidence - good fishing candidates
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GoodSpeciesCard } from '../../../components/findr/GoodSpeciesCard';

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

describe('GoodSpeciesCard', () => {
  const mockOnRemove = jest.fn();
  const mockOnTogglePriority = jest.fn();
  const mockOnAction = jest.fn();

  const defaultSpecies = {
    id: 'mackerel-1',
    name: 'Mackerel',
    scientificName: 'Scomber scombrus',
    emoji: '🐟',
    image: { src: '/images/mackerel.webp', alt: 'Mackerel' },
    confidence: 75,
    forecast: [70, 72, 75, 78, 80],
    season: 'Summer',
    bestBait: 'Feathers',
    isPriority: false,
  };

  const defaultLocation = { lat: 48.8566, lon: 2.3522 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render species name', () => {
      render(
        <GoodSpeciesCard
          species={defaultSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByText('Mackerel')).toBeInTheDocument();
    });

    it('should render scientific name when expanded', () => {
      render(
        <GoodSpeciesCard
          species={defaultSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      // Expand the card
      const expandButton = screen.getByText('Show details');
      fireEvent.click(expandButton);

      expect(screen.getByText('Scomber scombrus')).toBeInTheDocument();
    });

    it('should display confidence percentage for good range (70-84%)', () => {
      render(
        <GoodSpeciesCard
          species={defaultSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByText(/75%/)).toBeInTheDocument();
    });

    it('should render species image when provided', () => {
      render(
        <GoodSpeciesCard
          species={defaultSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      const image = screen.getByAltText('Mackerel');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/images/mackerel.webp');
    });

    it('should render GradientFish placeholder when no image', () => {
      const speciesWithoutImage = { ...defaultSpecies, image: null };

      render(
        <GoodSpeciesCard
          species={speciesWithoutImage}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByTestId('gradient-fish')).toBeInTheDocument();
    });
  });

  describe('Environmental Data (Phase 10)', () => {
    it('should render DataFreshnessBadge when freshness data provided', () => {
      const speciesWithFreshness = {
        ...defaultSpecies,
        data_freshness: 'fresh' as const,
      };

      render(
        <GoodSpeciesCard
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
        <GoodSpeciesCard
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
        <GoodSpeciesCard
          species={defaultSpecies}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
          onAction={mockOnAction}
        />
      );

      const cards = screen.getAllByRole('button');
      const cardContainer = cards[0];
      fireEvent.click(cardContainer);

      expect(mockOnAction).toHaveBeenCalledWith('mackerel-1');
    });

    it('should not crash when onAction is not provided', () => {
      render(
        <GoodSpeciesCard
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

  describe('Edge Cases', () => {
    it('should handle species without scientific name when expanded', () => {
      const speciesNoScientific = { ...defaultSpecies, scientificName: undefined };

      render(
        <GoodSpeciesCard
          species={speciesNoScientific}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByText('Mackerel')).toBeInTheDocument();

      // Expand and verify scientific name is not shown
      const expandButton = screen.getByText('Show details');
      fireEvent.click(expandButton);

      expect(screen.queryByText('Scomber scombrus')).not.toBeInTheDocument();
    });

    it('should handle null location', () => {
      render(
        <GoodSpeciesCard
          species={defaultSpecies}
          location={null}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByText('Mackerel')).toBeInTheDocument();
    });

    it('should handle confidence at exactly 70%', () => {
      const species70 = { ...defaultSpecies, confidence: 70 };

      render(
        <GoodSpeciesCard
          species={species70}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByText(/70%/)).toBeInTheDocument();
    });

    it('should handle confidence at exactly 84%', () => {
      const species84 = { ...defaultSpecies, confidence: 84 };

      render(
        <GoodSpeciesCard
          species={species84}
          location={defaultLocation}
          onRemove={mockOnRemove}
          onTogglePriority={mockOnTogglePriority}
        />
      );

      expect(screen.getByText(/84%/)).toBeInTheDocument();
    });
  });
});
