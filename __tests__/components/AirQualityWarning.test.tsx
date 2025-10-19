/**
 * Tests for AirQualityWarning component
 * Health-aware air quality warnings based on EPA AQI standards
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AirQualityWarning from '../../components/AirQualityWarning';
import { AirQualityLevel, AirQualitySummary, AirQualityAssessment } from '../../utils/airQualityUtils';

// Mock OptimizedImage component
jest.mock('../../components/OptimizedImage', () => {
  return function OptimizedImage({ src, alt }: { src: string; alt: string }) {
    return <img src={src} alt={alt} />;
  };
});

describe('AirQualityWarning', () => {
  describe('Rendering Logic', () => {
    it('should not render when no air quality data provided', () => {
      const { container } = render(<AirQualityWarning />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when air quality is GOOD', () => {
      const airQuality: AirQualitySummary = {
        overall: 45, // GOOD level (0-50)
      };

      const { container } = render(<AirQualityWarning airQuality={airQuality} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when air quality is MODERATE or worse', () => {
      const airQuality: AirQualitySummary = {
        overall: 75, // MODERATE level (51-100)
      };

      render(<AirQualityWarning airQuality={airQuality} mode="full" />);
      expect(screen.getByRole('region', { name: /air quality/i })).toBeInTheDocument();
    });

    it('should render when air quality is UNHEALTHY_SENSITIVE', () => {
      const airQuality: AirQualitySummary = {
        overall: 125, // UNHEALTHY_SENSITIVE (101-150)
      };

      render(<AirQualityWarning airQuality={airQuality} mode="full" />);
      expect(screen.getByRole('region', { name: /air quality/i })).toBeInTheDocument();
    });

    it('should render when air quality is HAZARDOUS', () => {
      const airQuality: AirQualitySummary = {
        overall: 350, // HAZARDOUS (301-500)
      };

      render(<AirQualityWarning airQuality={airQuality} mode="full" />);
      expect(screen.getByRole('region', { name: /air quality/i })).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('should render compact mode indicator', () => {
      const airQuality: AirQualitySummary = {
        overall: 125, // UNHEALTHY_SENSITIVE
      };

      const { container } = render(
        <AirQualityWarning airQuality={airQuality} mode="compact" />
      );

      expect(container.querySelector('.air-quality-warning-compact')).toBeInTheDocument();
      expect(container.querySelector('.air-quality-overall-indicator')).toBeInTheDocument();
    });

    it('should apply custom className in compact mode', () => {
      const airQuality: AirQualitySummary = {
        overall: 75,
      };

      const { container } = render(
        <AirQualityWarning airQuality={airQuality} mode="compact" className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Full Mode', () => {
    it('should render full mode with air quality details', () => {
      const airQuality: AirQualitySummary = {
        overall: 125,
        pm2_5: 55,
        pm10: 75,
        no2: 40,
        o3: 90,
      };

      const { container } = render(
        <AirQualityWarning airQuality={airQuality} mode="full" />
      );

      expect(container.querySelector('.air-quality-warning-full')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /air quality/i })).toBeInTheDocument();
    });

    it('should apply custom className in full mode', () => {
      const airQuality: AirQualitySummary = {
        overall: 75,
      };

      const { container } = render(
        <AirQualityWarning airQuality={airQuality} mode="full" className="custom-full-class" />
      );

      expect(container.querySelector('.custom-full-class')).toBeInTheDocument();
    });
  });

  describe('Assessment Prop', () => {
    it('should use provided assessment instead of calculating from air quality', () => {
      const assessment: AirQualityAssessment = {
        overall: AirQualityLevel.UNHEALTHY,
        pm2_5: AirQualityLevel.UNHEALTHY,
        pm10: AirQualityLevel.MODERATE,
        no2: AirQualityLevel.GOOD,
        o3: AirQualityLevel.MODERATE,
        so2: AirQualityLevel.GOOD,
        co: AirQualityLevel.GOOD,
        warnings: ['Custom warning message'],
      };

      render(<AirQualityWarning assessment={assessment} mode="full" />);
      expect(screen.getByRole('region', { name: /air quality/i })).toBeInTheDocument();
    });

    it('should not render if assessment shows GOOD air quality', () => {
      const assessment: AirQualityAssessment = {
        overall: AirQualityLevel.GOOD,
        pm2_5: AirQualityLevel.GOOD,
        pm10: AirQualityLevel.GOOD,
        no2: AirQualityLevel.GOOD,
        o3: AirQualityLevel.GOOD,
        so2: AirQualityLevel.GOOD,
        co: AirQualityLevel.GOOD,
        warnings: [],
      };

      const { container } = render(<AirQualityWarning assessment={assessment} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional pollutant data', () => {
      const airQuality: AirQualitySummary = {
        overall: 125,
        // Only overall provided, no individual pollutants
      };

      render(<AirQualityWarning airQuality={airQuality} mode="full" />);
      expect(screen.getByRole('region', { name: /air quality/i })).toBeInTheDocument();
    });

    it('should handle zero AQI values', () => {
      const airQuality: AirQualitySummary = {
        overall: 0,
      };

      const { container } = render(<AirQualityWarning airQuality={airQuality} />);
      // AQI 0 is GOOD, should not render
      expect(container.firstChild).toBeNull();
    });

    it('should handle very high AQI values (500+)', () => {
      const airQuality: AirQualitySummary = {
        overall: 600, // Beyond standard AQI scale
      };

      render(<AirQualityWarning airQuality={airQuality} mode="full" />);
      expect(screen.getByRole('region', { name: /air quality/i })).toBeInTheDocument();
    });

    it('should handle negative AQI values gracefully', () => {
      const airQuality: AirQualitySummary = {
        overall: -10, // Invalid AQI
      };

      const { container } = render(<AirQualityWarning airQuality={airQuality} />);
      // Negative values should be treated as NONE/no data
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Mode Prop', () => {
    it('should default to full mode when mode not specified', () => {
      const airQuality: AirQualitySummary = {
        overall: 125,
      };

      const { container } = render(<AirQualityWarning airQuality={airQuality} />);
      expect(container.querySelector('.air-quality-warning-full')).toBeInTheDocument();
    });

    it('should render compact mode when explicitly specified', () => {
      const airQuality: AirQualitySummary = {
        overall: 125,
      };

      const { container } = render(<AirQualityWarning airQuality={airQuality} mode="compact" />);
      expect(container.querySelector('.air-quality-warning-compact')).toBeInTheDocument();
      expect(container.querySelector('.air-quality-warning-full')).not.toBeInTheDocument();
    });
  });

  describe('Air Quality Levels', () => {
    it('should render for MODERATE level (51-100)', () => {
      const airQuality: AirQualitySummary = { overall: 75 };
      render(<AirQualityWarning airQuality={airQuality} mode="full" />);
      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('should render for UNHEALTHY_SENSITIVE level (101-150)', () => {
      const airQuality: AirQualitySummary = { overall: 125 };
      render(<AirQualityWarning airQuality={airQuality} mode="full" />);
      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('should render for UNHEALTHY level (151-200)', () => {
      const airQuality: AirQualitySummary = { overall: 175 };
      render(<AirQualityWarning airQuality={airQuality} mode="full" />);
      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('should render for VERY_UNHEALTHY level (201-300)', () => {
      const airQuality: AirQualitySummary = { overall: 250 };
      render(<AirQualityWarning airQuality={airQuality} mode="full" />);
      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('should render for HAZARDOUS level (301-500)', () => {
      const airQuality: AirQualitySummary = { overall: 400 };
      render(<AirQualityWarning airQuality={airQuality} mode="full" />);
      expect(screen.getByRole('region')).toBeInTheDocument();
    });
  });
});
