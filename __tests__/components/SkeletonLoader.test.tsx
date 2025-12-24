/**
 * Tests for SkeletonLoader components
 * Loading state placeholders for better UX
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonActivityCard,
  SkeletonHeroCard,
  SkeletonWeatherForecast,
  SkeletonActivityGrid,
  SkeletonHomePage,
} from '../../components/SkeletonLoader';

describe('SkeletonLoader Components', () => {
  describe('Skeleton (Base Component)', () => {
    it('should render basic skeleton', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild;

      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');
      expect(skeleton).toHaveClass('bg-gray-300');
      expect(skeleton).toHaveClass('rounded');
    });

    it('should apply custom className', () => {
      const { container } = render(<Skeleton className="w-full h-4" />);
      const skeleton = container.firstChild;

      expect(skeleton).toHaveClass('w-full');
      expect(skeleton).toHaveClass('h-4');
    });

    it('should have aria-hidden for accessibility', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild;

      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    });

    it('should support dark mode styles', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild;

      expect(skeleton).toHaveClass('dark:bg-gray-700');
    });
  });

  describe('SkeletonText', () => {
    it('should render default 3 lines of text', () => {
      const { container } = render(<SkeletonText />);
      const skeletons = container.querySelectorAll('.animate-pulse');

      expect(skeletons).toHaveLength(3);
    });

    it('should render custom number of lines', () => {
      const { container } = render(<SkeletonText lines={5} />);
      const skeletons = container.querySelectorAll('.animate-pulse');

      expect(skeletons).toHaveLength(5);
    });

    it('should render single line', () => {
      const { container } = render(<SkeletonText lines={1} />);
      const skeletons = container.querySelectorAll('.animate-pulse');

      expect(skeletons).toHaveLength(1);
    });

    it('should make last line shorter (3/4 width)', () => {
      const { container } = render(<SkeletonText lines={3} />);
      const skeletons = container.querySelectorAll('.animate-pulse');
      const lastSkeleton = skeletons[skeletons.length - 1];

      expect(lastSkeleton).toHaveClass('w-3/4');
    });

    it('should make non-last lines full width', () => {
      const { container } = render(<SkeletonText lines={3} />);
      const skeletons = container.querySelectorAll('.animate-pulse');

      expect(skeletons[0]).toHaveClass('w-full');
      expect(skeletons[1]).toHaveClass('w-full');
    });

    it('should apply custom className to container', () => {
      const { container } = render(<SkeletonText className="my-4" />);

      expect(container.firstChild).toHaveClass('my-4');
      expect(container.firstChild).toHaveClass('space-y-2');
    });
  });

  describe('SkeletonCard', () => {
    it('should render card skeleton structure', () => {
      const { container } = render(<SkeletonCard />);

      expect(container.querySelector('.card')).toBeInTheDocument();
      expect(container.querySelector('.card-body')).toBeInTheDocument();
    });

    it('should include avatar skeleton (circular)', () => {
      const { container } = render(<SkeletonCard />);
      const avatar = container.querySelector('.rounded-full');

      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveClass('w-12');
      expect(avatar).toHaveClass('h-12');
    });

    it('should include text skeletons', () => {
      const { container } = render(<SkeletonCard />);
      const skeletons = container.querySelectorAll('.animate-pulse');

      // Should have multiple skeleton elements (avatar, headers, text lines, buttons)
      expect(skeletons.length).toBeGreaterThan(5);
    });

    it('should apply custom className', () => {
      const { container } = render(<SkeletonCard className="shadow-xl" />);

      expect(container.querySelector('.card')).toHaveClass('shadow-xl');
    });
  });

  describe('SkeletonActivityCard', () => {
    it('should render activity card structure', () => {
      const { container } = render(<SkeletonActivityCard />);

      expect(container.querySelector('.card')).toBeInTheDocument();
      expect(container.querySelector('.card-body')).toBeInTheDocument();
    });

    it('should include large icon skeletons', () => {
      const { container } = render(<SkeletonActivityCard />);
      const largeSkeletons = container.querySelectorAll('.w-16.h-16');

      // Should have activity icon and score circle
      expect(largeSkeletons.length).toBeGreaterThanOrEqual(2);
    });

    it('should include rounded elements', () => {
      const { container } = render(<SkeletonActivityCard />);
      const roundedElements = container.querySelectorAll('.rounded-xl, .rounded-full, .rounded-lg');

      expect(roundedElements.length).toBeGreaterThan(0);
    });
  });

  describe('SkeletonHeroCard', () => {
    it('should render with background image', () => {
      const { container } = render(<SkeletonHeroCard />);
      const card = container.querySelector('.card');

      expect(card).toHaveClass('bg-cover');
      expect(card).toHaveClass('bg-center');
      expect(card).toHaveAttribute('style', expect.stringContaining('background-image'));
    });

    it('should render with white text', () => {
      const { container } = render(<SkeletonHeroCard />);
      const card = container.querySelector('.card');

      expect(card).toHaveClass('text-white');
    });

    it('should include semi-transparent skeleton elements', () => {
      const { container } = render(<SkeletonHeroCard />);
      const transparentSkeletons = container.querySelectorAll('.bg-white\\/20');

      expect(transparentSkeletons.length).toBeGreaterThan(0);
    });

    it('should include grid layout for stats', () => {
      const { container } = render(<SkeletonHeroCard />);
      const grid = container.querySelector('.grid-cols-2');

      expect(grid).toBeInTheDocument();
    });
  });

  describe('SkeletonWeatherForecast', () => {
    it('should render 8 forecast items', () => {
      const { container } = render(<SkeletonWeatherForecast />);
      const cards = container.querySelectorAll('.card');

      expect(cards).toHaveLength(8);
    });

    it('should use responsive grid layout', () => {
      const { container } = render(<SkeletonWeatherForecast />);
      const grid = container.firstChild;

      expect(grid).toHaveClass('grid-cols-2');
      expect(grid).toHaveClass('md:grid-cols-4');
      expect(grid).toHaveClass('lg:grid-cols-8');
    });

    it('should include circular weather icon skeletons', () => {
      const { container } = render(<SkeletonWeatherForecast />);
      const circles = container.querySelectorAll('.rounded-full');

      expect(circles.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('SkeletonActivityGrid', () => {
    it('should render default 6 activity cards', () => {
      const { container } = render(<SkeletonActivityGrid />);
      const cards = container.querySelectorAll('.card');

      expect(cards).toHaveLength(6);
    });

    it('should render custom count of activity cards', () => {
      const { container } = render(<SkeletonActivityGrid count={3} />);
      const cards = container.querySelectorAll('.card');

      expect(cards).toHaveLength(3);
    });

    it('should render 12 cards when specified', () => {
      const { container } = render(<SkeletonActivityGrid count={12} />);
      const cards = container.querySelectorAll('.card');

      expect(cards).toHaveLength(12);
    });

    it('should use responsive grid layout', () => {
      const { container } = render(<SkeletonActivityGrid />);
      const grid = container.firstChild;

      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).toHaveClass('md:grid-cols-2');
      expect(grid).toHaveClass('lg:grid-cols-3');
    });

    it('should handle single card', () => {
      const { container } = render(<SkeletonActivityGrid count={1} />);
      const cards = container.querySelectorAll('.card');

      expect(cards).toHaveLength(1);
    });
  });

  describe('SkeletonHomePage', () => {
    it('should render complete home page skeleton', () => {
      const { container } = render(<SkeletonHomePage />);

      expect(container).toBeInTheDocument();
    });

    it('should include header section', () => {
      const { container } = render(<SkeletonHomePage />);
      const headers = container.querySelectorAll('.h-12, .h-6');

      expect(headers.length).toBeGreaterThan(0);
    });

    it('should include location selector skeleton', () => {
      const { container } = render(<SkeletonHomePage />);
      const locationSelector = container.querySelector('.h-12.w-64');

      expect(locationSelector).toBeInTheDocument();
    });

    it('should include hero card', () => {
      const { container } = render(<SkeletonHomePage />);
      // Hero card now uses background image instead of gradient
      const heroCard = container.querySelector('.bg-cover.bg-center');

      expect(heroCard).toBeInTheDocument();
    });

    it('should include weather forecast section', () => {
      const { container } = render(<SkeletonHomePage />);
      const forecastCards = container.querySelectorAll('.card');

      // Should have hero card + 8 forecast cards + 6 activity cards
      expect(forecastCards.length).toBeGreaterThanOrEqual(14);
    });

    it('should include activity grid section', () => {
      const { container } = render(<SkeletonHomePage />);
      const grids = container.querySelectorAll('.grid');

      // Weather forecast grid + activity grid
      expect(grids.length).toBeGreaterThanOrEqual(2);
    });

    it('should have proper spacing', () => {
      const { container } = render(<SkeletonHomePage />);
      const mainContainer = container.firstChild;

      expect(mainContainer).toHaveClass('space-y-8');
    });

    it('should be centered with max width', () => {
      const { container } = render(<SkeletonHomePage />);
      const mainContainer = container.firstChild;

      expect(mainContainer).toHaveClass('max-w-7xl');
      expect(mainContainer).toHaveClass('mx-auto');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero lines in SkeletonText', () => {
      const { container } = render(<SkeletonText lines={0} />);
      const skeletons = container.querySelectorAll('.animate-pulse');

      expect(skeletons).toHaveLength(0);
    });

    it('should handle zero count in SkeletonActivityGrid', () => {
      const { container } = render(<SkeletonActivityGrid count={0} />);
      const cards = container.querySelectorAll('.card');

      expect(cards).toHaveLength(0);
    });

    it('should handle large line count gracefully', () => {
      const { container } = render(<SkeletonText lines={100} />);
      const skeletons = container.querySelectorAll('.animate-pulse');

      expect(skeletons).toHaveLength(100);
    });
  });
});
