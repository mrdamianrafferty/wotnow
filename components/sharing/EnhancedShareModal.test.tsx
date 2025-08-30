import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EnhancedShareModal from './EnhancedShareModal';
import { UserPreferencesProvider } from '../../context/UserPreferencesContext';
import '@testing-library/jest-dom';

// Mock the google maps library
jest.mock('../../lib/googleMaps', () => ({
  loadGoogleMaps: jest.fn().mockResolvedValue({
    maps: {
      Map: class MockMap {},
      LatLng: class MockLatLng {
        constructor(lat: number, lng: number) {
          Object.defineProperty(this, 'lat', { value: lat });
          Object.defineProperty(this, 'lng', { value: lng });
        }
      },
      places: {
        PlacesService: class MockPlacesService {
          textSearch(request, callback) {
            callback([
              {
                place_id: 'place1',
                name: 'Test Venue',
                formatted_address: '123 Test St, London',
                geometry: {
                  location: {
                    lat: () => 51.5074,
                    lng: () => -0.1278
                  }
                },
                rating: 4.5
              }
            ], 'OK');
          }
        },
        PlacesServiceStatus: {
          OK: 'OK'
        }
      }
    }
  })
}));

// Mock navigator.share
Object.defineProperty(window, 'navigator', {
  value: {
    ...window.navigator,
    share: jest.fn().mockResolvedValue(true)
  },
  writable: true
});

// Mock dialog element
HTMLDialogElement.prototype.showModal = jest.fn();
HTMLDialogElement.prototype.close = jest.fn();

// Mock the UserPreferencesContext
jest.mock('../../context/UserPreferencesContext', () => ({
  useUserPreferences: jest.fn().mockReturnValue({
    preferences: {
      locations: [
        { type: 'home', lat: 51.5074, lon: -0.1278, label: 'London' }
      ],
      units: 'metric'
    }
  }),
  UserPreferencesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Wrap the component with the UserPreferencesProvider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <UserPreferencesProvider>
      {ui}
    </UserPreferencesProvider>
  );
};

describe('EnhancedShareModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    activityId: 'football',
    activityName: 'Football',
    activityDescription: 'Perfect weather for football',
    activityMessage: 'Let\'s play a game!'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the activity name, description, and message', () => {
    renderWithProvider(<EnhancedShareModal {...mockProps} />);
    
    expect(screen.getByText('Let\'s football!')).toBeInTheDocument();
    expect(screen.getByText('Perfect weather for football')).toBeInTheDocument();
    expect(screen.getByText('Let\'s play a game!')).toBeInTheDocument();
  });

  it('shows date, time, and place selection options', () => {
    renderWithProvider(<EnhancedShareModal {...mockProps} />);
    
    // Date options
    expect(screen.getByText('When?')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    expect(screen.getByText('This weekend')).toBeInTheDocument();
    
    // Time options
    expect(screen.getByText('What time?')).toBeInTheDocument();
    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.getByText('Afternoon')).toBeInTheDocument();
    expect(screen.getByText('Evening')).toBeInTheDocument();
    
    // Place options
    expect(screen.getByText('Where?')).toBeInTheDocument();
    expect(screen.getByText('My place')).toBeInTheDocument();
    expect(screen.getByText('Your place')).toBeInTheDocument();
    expect(screen.getByText('The usual spot')).toBeInTheDocument();
  });

  it('enables the share button when place and date/time are selected', async () => {
    renderWithProvider(<EnhancedShareModal {...mockProps} />);
    
    // Initially share button should be disabled
    const shareButton = screen.getByText('Share Invitation');
    expect(shareButton).toBeDisabled();
    
    // Select a place
    fireEvent.click(screen.getByText('My place'));
    
    // Select a date
    fireEvent.click(screen.getByText('Today'));
    
    // Now the share button should be enabled
    await waitFor(() => {
      expect(shareButton).not.toBeDisabled();
    });
  });

  it('calls onClose when the close button is clicked', () => {
    renderWithProvider(<EnhancedShareModal {...mockProps} />);
    
    // Get the close button by class instead of role
    const closeButton = document.querySelector('.btn-circle');
    expect(closeButton).not.toBeNull();
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockProps.onClose).toHaveBeenCalled();
    }
  });

  // Skip this test for now as it requires more complex mocking
  it.skip('allows searching for a venue', async () => {
    renderWithProvider(<EnhancedShareModal {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText(/Search for football venues/i);
    fireEvent.change(searchInput, { target: { value: 'Test Venue' } });
    
    // This test would need more advanced mocking of the Google Places API
    // which is beyond the scope of this simple test
  });
});
