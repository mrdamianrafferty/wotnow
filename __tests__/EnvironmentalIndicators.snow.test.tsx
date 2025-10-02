/// <reference types="@testing-library/jest-dom" />

import React from 'react';
import { render, screen } from '@testing-library/react';
import EnvironmentalIndicators from '../components/EnvironmentalIndicators';

// Mock next/image to a regular img for tests
jest.mock('next/image', () => ({
  __esModule: true,
  // Use proper typing to avoid `any` and require()
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement('img', props),
}));

describe('EnvironmentalIndicators – snow indicators', () => {
  it('renders nothing when no environmental data provided', () => {
    const { container } = render(<EnvironmentalIndicators />);
    expect(container.firstChild).toBeNull();
  });

  it('shows snow depth pill when snowDepthCm > 0', () => {
    render(<EnvironmentalIndicators snowDepthCm={12.3} />);

    // Image with alt text
    expect(screen.getByRole('img', { name: /snow depth/i })).toBeInTheDocument();
    // Rounded cm text
    expect(screen.getByText('12cm')).toBeInTheDocument();

    // Does not show snowfall when not provided
    expect(screen.queryByRole('img', { name: /snowfall/i })).not.toBeInTheDocument();
  });

  it('shows snowfall pill when snowfallRateMmH > 0', () => {
    render(<EnvironmentalIndicators snowfallRateMmH={1.23} />);

    // Image with alt text
    expect(screen.getByRole('img', { name: /snowfall/i })).toBeInTheDocument();
    // One decimal place rounding
    expect(screen.getByText('1.2mm/h')).toBeInTheDocument();

    // Does not show snow depth when not provided
    expect(screen.queryByRole('img', { name: /snow depth/i })).not.toBeInTheDocument();
  });

  it('shows both snow depth and snowfall and applies compact/full classes', () => {
    const { rerender } = render(<EnvironmentalIndicators snowDepthCm={7.7} snowfallRateMmH={0.56} />);

    // Both present
    expect(screen.getByRole('img', { name: /snow depth/i })).toBeInTheDocument();
    expect(screen.getByText('8cm')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /snowfall/i })).toBeInTheDocument();
    expect(screen.getByText('0.6mm/h')).toBeInTheDocument();

    // Default mode is compact -> pill has compact classes
    const depthPill = screen.getByText('8cm').parentElement as HTMLSpanElement | null;
    expect(depthPill).toHaveClass('text-xs');
    expect(depthPill).toHaveClass('rounded-full');

    // Full mode applies larger text class
    rerender(<EnvironmentalIndicators snowDepthCm={7.7} snowfallRateMmH={0.56} mode="full" />);
    const depthPillFull = screen.getByText('8cm').parentElement as HTMLSpanElement | null;
    expect(depthPillFull).toHaveClass('text-sm');
  });
});
