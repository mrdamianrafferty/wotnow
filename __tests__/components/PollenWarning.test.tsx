/**
 * Tests for PollenWarning component
 * Health-aware pollen warnings for allergy sufferers
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import PollenWarning from '../../components/PollenWarning';
import { PollenLevel, PollenSummary, PollenAssessment } from '../../utils/pollenUtils';

// Mock OptimizedImage component
jest.mock('../../components/OptimizedImage', () => {
  return function OptimizedImage({ src, alt }: { src: string; alt: string }) {
    return <img src={src} alt={alt} />;
  };
});

describe('PollenWarning', () => {
  describe('Rendering Logic', () => {
    it('should not render when no pollen data provided', () => {
      const { container } = render(<PollenWarning />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when all pollen levels are NONE', () => {
      const pollen: PollenSummary = {
        grass: 0, // NONE
        tree: 0,  // NONE
        weed: 0,  // NONE
      };

      const { container } = render(<PollenWarning pollen={pollen} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render for LOW pollen levels (helpful for sensitive individuals)', () => {
      const pollen: PollenSummary = {
        grass: 0.3, // LOW
      };

      render(<PollenWarning pollen={pollen} mode="full" />);
      // Component shows LOW levels for sensitive individuals
      expect(screen.getByRole('region', { name: /pollen/i })).toBeInTheDocument();
    });

    it('should render when grass pollen is MODERATE or higher', () => {
      const pollen: PollenSummary = {
        grass: 1.5, // MODERATE (0.5-2)
      };

      render(<PollenWarning pollen={pollen} mode="full" />);
      expect(screen.getByRole('region', { name: /pollen/i })).toBeInTheDocument();
    });

    it('should render when tree pollen is HIGH', () => {
      const pollen: PollenSummary = {
        tree: 3.5, // HIGH (2-4)
      };

      render(<PollenWarning pollen={pollen} mode="full" />);
      expect(screen.getByRole('region', { name: /pollen/i })).toBeInTheDocument();
    });

    it('should render when weed pollen is VERY_HIGH', () => {
      const pollen: PollenSummary = {
        weed: 7, // VERY_HIGH (4-10)
      };

      render(<PollenWarning pollen={pollen} mode="full" />);
      expect(screen.getByRole('region', { name: /pollen/i })).toBeInTheDocument();
    });

    it('should render when olive pollen is EXTREME', () => {
      const pollen: PollenSummary = {
        olive: 12, // EXTREME (11+)
      };

      render(<PollenWarning pollen={pollen} mode="full" />);
      expect(screen.getByRole('region', { name: /pollen/i })).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('should render compact mode indicator for moderate+ pollen', () => {
      const pollen: PollenSummary = {
        grass: 1.5, // MODERATE
      };

      const { container } = render(
        <PollenWarning pollen={pollen} mode="compact" />
      );

      expect(container.querySelector('.pollen-warning-compact')).toBeInTheDocument();
    });

    it('should apply custom className in compact mode', () => {
      const pollen: PollenSummary = {
        tree: 3, // HIGH
      };

      const { container } = render(
        <PollenWarning pollen={pollen} mode="compact" className="custom-pollen-class" />
      );

      expect(container.querySelector('.custom-pollen-class')).toBeInTheDocument();
    });
  });

  describe('Full Mode', () => {
    it('should render full mode with pollen type indicators', () => {
      const pollen: PollenSummary = {
        grass: 1.5,
        tree: 3.5,
        weed: 0.8,
      };

      const { container } = render(
        <PollenWarning pollen={pollen} mode="full" />
      );

      expect(container.querySelector('.pollen-warning-full')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /pollen/i })).toBeInTheDocument();
    });

    it('should apply custom className in full mode', () => {
      const pollen: PollenSummary = {
        grass: 2,
      };

      const { container } = render(
        <PollenWarning pollen={pollen} mode="full" className="custom-full-pollen" />
      );

      expect(container.querySelector('.custom-full-pollen')).toBeInTheDocument();
    });
  });

  describe('Assessment Prop', () => {
    it('should use provided assessment instead of calculating from pollen data', () => {
      const assessment: PollenAssessment = {
        grass: PollenLevel.HIGH,
        tree: PollenLevel.MODERATE,
        weed: PollenLevel.LOW,
        olive: PollenLevel.NONE,
        overall: PollenLevel.HIGH,
        warnings: ['High grass pollen levels detected'],
      };

      render(<PollenWarning assessment={assessment} mode="full" />);
      expect(screen.getByRole('region', { name: /pollen/i })).toBeInTheDocument();
    });

    it('should render if assessment shows LOW pollen levels (for sensitive individuals)', () => {
      const assessment: PollenAssessment = {
        grass: PollenLevel.LOW,
        tree: PollenLevel.LOW,
        weed: PollenLevel.LOW,
        olive: PollenLevel.NONE,
        overall: PollenLevel.LOW,
        warnings: [],
      };

      render(<PollenWarning assessment={assessment} mode="full" />);
      // Component shows LOW levels for sensitive individuals
      expect(screen.getByRole('region', { name: /pollen/i })).toBeInTheDocument();
    });

    it('should not render if assessment shows only NONE pollen levels', () => {
      const assessment: PollenAssessment = {
        grass: PollenLevel.NONE,
        tree: PollenLevel.NONE,
        weed: PollenLevel.NONE,
        olive: PollenLevel.NONE,
        overall: PollenLevel.NONE,
        warnings: [],
      };

      const { container } = render(<PollenWarning assessment={assessment} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional pollen types', () => {
      const pollen: PollenSummary = {
        grass: 2, // Only grass provided
      };

      render(<PollenWarning pollen={pollen} mode="full" />);
      expect(screen.getByRole('region', { name: /pollen/i })).toBeInTheDocument();
    });

    it('should handle zero pollen values', () => {
      const pollen: PollenSummary = {
        grass: 0,
        tree: 0,
        weed: 0,
      };

      const { container} = render(<PollenWarning pollen={pollen} />);
      // All zero values should not render warning
      expect(container.firstChild).toBeNull();
    });

    it('should handle very high pollen values (20+)', () => {
      const pollen: PollenSummary = {
        grass: 25, // Extremely high
      };

      render(<PollenWarning pollen={pollen} mode="full" />);
      expect(screen.getByRole('region', { name: /pollen/i })).toBeInTheDocument();
    });

    it('should handle negative pollen values gracefully', () => {
      const pollen: PollenSummary = {
        grass: -5, // Invalid value
      };

      const { container } = render(<PollenWarning pollen={pollen} />);
      // Negative values should be treated as NONE
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Mode Prop', () => {
    it('should default to full mode when mode not specified', () => {
      const pollen: PollenSummary = {
        tree: 3,
      };

      const { container } = render(<PollenWarning pollen={pollen} />);
      expect(container.querySelector('.pollen-warning-full')).toBeInTheDocument();
    });

    it('should render compact mode when explicitly specified', () => {
      const pollen: PollenSummary = {
        weed: 2,
      };

      const { container } = render(<PollenWarning pollen={pollen} mode="compact" />);
      expect(container.querySelector('.pollen-warning-compact')).toBeInTheDocument();
      expect(container.querySelector('.pollen-warning-full')).not.toBeInTheDocument();
    });
  });

  describe('Pollen Levels', () => {
    it('should render for MODERATE level grass pollen (0.5-2)', () => {
      const pollen: PollenSummary = { grass: 1.5 };
      render(<PollenWarning pollen={pollen} mode="full" />);
      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('should render for HIGH level tree pollen (2-4)', () => {
      const pollen: PollenSummary = { tree: 3 };
      render(<PollenWarning pollen={pollen} mode="full" />);
      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('should render for VERY_HIGH level weed pollen (4-10)', () => {
      const pollen: PollenSummary = { weed: 7 };
      render(<PollenWarning pollen={pollen} mode="full" />);
      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('should render for EXTREME level olive pollen (11+)', () => {
      const pollen: PollenSummary = { olive: 15 };
      render(<PollenWarning pollen={pollen} mode="full" />);
      expect(screen.getByRole('region')).toBeInTheDocument();
    });
  });

  describe('Multiple Pollen Types', () => {
    it('should handle multiple elevated pollen types simultaneously', () => {
      const pollen: PollenSummary = {
        grass: 3, // HIGH
        tree: 2,  // MODERATE
        weed: 8,  // VERY_HIGH
      };

      render(<PollenWarning pollen={pollen} mode="full" />);
      expect(screen.getByRole('region', { name: /pollen/i })).toBeInTheDocument();
    });

    it('should prioritize highest pollen level when multiple types present', () => {
      const pollen: PollenSummary = {
        grass: 0.5, // LOW
        tree: 0.3,  // LOW
        weed: 5,    // VERY_HIGH (should trigger warning)
      };

      render(<PollenWarning pollen={pollen} mode="full" />);
      expect(screen.getByRole('region', { name: /pollen/i })).toBeInTheDocument();
    });
  });
});
