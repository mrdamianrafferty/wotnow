/**
 * Tests for Findr Account Page - Profile Settings
 * 
 * Focused tests for the profile settings section added to the account page.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/router';
import AccountPage from '../../../pages/findr/account';
import { useSubscription } from '../../../hooks/useSubscription';
import { createClient } from '../../../lib/supabase/client';

// Mock dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../../hooks/useSubscription', () => ({
  useSubscription: jest.fn(),
}));

jest.mock('../../../lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Findr Account Page - Profile Settings', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    query: {},
  };

  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
  };

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    (useSubscription as jest.Mock).mockReturnValue({
      subscription: null,
      isPremium: false,
      isTrial: false,
      isLoading: false,
      refetch: jest.fn(),
    });
  });

  it('should display profile section with display name and email fields', async () => {
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock user settings API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        settings: {
          displayName: 'Captain Hook',
          email: mockUser.email,
          hasBoat: false,
          fishingTechniques: [],
          favoriteHabitats: [],
          preferencesJson: {},
          updatedAt: null,
        },
      }),
    });

    render(<AccountPage />);

    // Wait for profile section to load
    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    // Check display name field is present and populated
    const displayNameInput = screen.getByPlaceholderText('e.g. Captain Hook');
    expect(displayNameInput).toBeInTheDocument();
    expect(displayNameInput).toHaveValue('Captain Hook');

    // Check email field is present and read-only
    const emailInput = screen.getByDisplayValue(mockUser.email);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toBeDisabled();
  });

  it('should show save profile button', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        settings: {
          displayName: '',
          email: mockUser.email,
          hasBoat: false,
          fishingTechniques: [],
          favoriteHabitats: [],
          preferencesJson: {},
          updatedAt: null,
        },
      }),
    });

    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText('Save Profile')).toBeInTheDocument();
    });
  });

  it('should call API when save profile button is clicked', async () => {
    const user = userEvent.setup();

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock GET request for initial load
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        settings: {
          displayName: 'Old Name',
          email: mockUser.email,
          hasBoat: false,
          fishingTechniques: [],
          favoriteHabitats: [],
          preferencesJson: {},
          updatedAt: null,
        },
      }),
    });

    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    // Mock PATCH request for save
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
      }),
    });

    // Click save button
    const saveButton = screen.getByText('Save Profile');
    await user.click(saveButton);

    // Verify PATCH request was made
    await waitFor(() => {
      const patchCalls = (global.fetch as jest.Mock).mock.calls.filter(
        (call) => call[1]?.method === 'PATCH'
      );
      expect(patchCalls.length).toBeGreaterThan(0);
    });
  });

  it('should display success message after saving profile', async () => {
    const user = userEvent.setup();

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock GET request
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        settings: {
          displayName: 'Test User',
          email: mockUser.email,
          hasBoat: false,
          fishingTechniques: [],
          favoriteHabitats: [],
          preferencesJson: {},
          updatedAt: null,
        },
      }),
    });

    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    // Mock successful PATCH request
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
      }),
    });

    const saveButton = screen.getByText('Save Profile');
    await user.click(saveButton);

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
    });
  });

  it('should show loading state while profile is being saved', async () => {
    const user = userEvent.setup();

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock GET request
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        settings: {
          displayName: 'Test User',
          email: mockUser.email,
          hasBoat: false,
          fishingTechniques: [],
          favoriteHabitats: [],
          preferencesJson: {},
          updatedAt: null,
        },
      }),
    });

    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    // Mock delayed PATCH request
    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true }),
      }), 100))
    );

    const saveButton = screen.getByText('Save Profile');
    await user.click(saveButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });
});
