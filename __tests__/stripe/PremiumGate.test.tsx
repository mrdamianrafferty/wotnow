/**
 * Tests for PremiumGate component
 */

import { render, screen } from '@testing-library/react';
import { PremiumGate, PremiumBadge, PremiumLabel } from '@/components/findr/premium/PremiumGate';

// Mock useRouter
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

// Mock useSubscription hook
jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: jest.fn(),
}));

describe('PremiumGate Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading spinner when loading', () => {
    const { useSubscription } = require('@/hooks/useSubscription');
    useSubscription.mockReturnValue({
      isPremium: false,
      isLoading: true,
    });

    render(
      <PremiumGate>
        <div>Premium Content</div>
      </PremiumGate>
    );

    // Check for loading class instead of role
    expect(screen.getByText((content, element) => {
      return element?.className?.includes('loading-spinner') ?? false;
    })).toBeInTheDocument();
  });

  it('should show premium content when user is premium', () => {
    const { useSubscription } = require('@/hooks/useSubscription');
    useSubscription.mockReturnValue({
      isPremium: true,
      isLoading: false,
    });

    render(
      <PremiumGate>
        <div>Premium Content</div>
      </PremiumGate>
    );

    expect(screen.getByText('Premium Content')).toBeInTheDocument();
  });

  it('should show upgrade prompt when user is free', () => {
    const { useSubscription } = require('@/hooks/useSubscription');
    useSubscription.mockReturnValue({
      isPremium: false,
      isLoading: false,
    });

    render(
      <PremiumGate>
        <div>Premium Content</div>
      </PremiumGate>
    );

    expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument();
    expect(screen.getByText('Premium Feature')).toBeInTheDocument();
    expect(screen.queryByText('Premium Content')).not.toBeInTheDocument();
  });

  it('should show custom fallback when provided', () => {
    const { useSubscription } = require('@/hooks/useSubscription');
    useSubscription.mockReturnValue({
      isPremium: false,
      isLoading: false,
    });

    render(
      <PremiumGate fallback={<div>Custom Upgrade Message</div>}>
        <div>Premium Content</div>
      </PremiumGate>
    );

    expect(screen.getByText('Custom Upgrade Message')).toBeInTheDocument();
    expect(screen.queryByText('Upgrade to Premium')).not.toBeInTheDocument();
  });

  it('should hide content when showUpgradePrompt is false', () => {
    const { useSubscription } = require('@/hooks/useSubscription');
    useSubscription.mockReturnValue({
      isPremium: false,
      isLoading: false,
    });

    const { container } = render(
      <PremiumGate showUpgradePrompt={false}>
        <div>Premium Content</div>
      </PremiumGate>
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe('PremiumBadge Component', () => {
  it('should show badge for premium users', () => {
    const { useSubscription } = require('@/hooks/useSubscription');
    useSubscription.mockReturnValue({
      isPremium: true,
      isTrial: false,
    });

    render(<PremiumBadge />);

    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('should show trial badge for trial users', () => {
    const { useSubscription } = require('@/hooks/useSubscription');
    useSubscription.mockReturnValue({
      isPremium: true,
      isTrial: true,
    });

    render(<PremiumBadge />);

    expect(screen.getByText('Trial')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('should not show badge for free users', () => {
    const { useSubscription } = require('@/hooks/useSubscription');
    useSubscription.mockReturnValue({
      isPremium: false,
      isTrial: false,
    });

    const { container } = render(<PremiumBadge />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('PremiumLabel Component', () => {
  it('should render PRO label', () => {
    render(<PremiumLabel />);

    expect(screen.getByText('PRO')).toBeInTheDocument();
  });

  it('should have correct styling classes', () => {
    render(<PremiumLabel />);

    const label = screen.getByText('PRO');
    expect(label).toHaveClass('badge', 'badge-warning', 'badge-xs');
  });
});
