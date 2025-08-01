import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUserPreferences } from '../context/UserPreferencesContext';
import useHasMounted from '../lib/hooks/useHasMounted';

const availableInterests = [
  { id: 'hiking', label: '🥾 Hiking' },
  { id: 'road_cycling', label: '🚴‍♂️ Road Cycling' },
  { id: 'surfing', label: '🏄‍♀️ Surfing', isMarine: true },
  { id: 'beach', label: '🏖️ Beach', isMarine: true },
  { id: 'museum', label: '🏛️ Museum & Cultural Visits' },
  { id: 'wild_swimming', label: '🏞️ Wild Swimming', isMarine: true },
  { id: 'sea_swimming', label: '🌊 Sea Swimming', isMarine: true },
  { id: 'climbing', label: '🧗‍♂️ Climbing' },
  { id: 'yoga', label: '🧘‍♀️ Yoga' },
  { id: 'reading', label: '📚 Reading' },
  { id: 'trail_running', label: '⛰️ Trail Running' },
  { id: 'birdwatching', label: '🐦 Birdwatching' },
  { id: 'foraging', label: '🍄 Foraging' },
  { id: 'watch_a_movie', label: '📺 Watching TV' },
  { id: 'gaming', label: '🎮 Gaming' },
];

function OnboardingFlow({ setPreferences }: { setPreferences: any }) {
  const router = useRouter(); // Use Next.js router for navigation
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [showMarineLocation, setShowMarineLocation] = useState(false);
  const [homeLocation, setHomeLocation] = useState<string>('');
  const [marineLocation, setMarineLocation] = useState<string>('');

  // Check if any selected interest is marine-related
  useEffect(() => {
    const hasMarineInterest = selectedInterests.some((id) =>
      availableInterests.find((interest) => interest.id === id && interest.isMarine)
    );
    setShowMarineLocation(hasMarineInterest);
  }, [selectedInterests]);

  const handleFinish = (navigateTo: 'home' | 'interests') => {
    setPreferences((prev: any) => ({
      ...prev,
      onboardingComplete: true, // Ensure this is set to true
      interests: selectedInterests,
      locations: {
        home: homeLocation,
        marine: showMarineLocation ? marineLocation : null,
      },
    }));

    if (navigateTo === 'home') {
      router.push('/'); // Navigate to the homepage
    } else if (navigateTo === 'interests') {
      router.push('/interests'); // Navigate to the interests page
    }
  };

  const handleInterestChange = (interestId: string, isChecked: boolean) => {
    setSelectedInterests((prev) =>
      isChecked ? [...prev, interestId] : prev.filter((id) => id !== interestId)
    );
  };

  const requestGeolocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; // Use the environment variable
            if (!apiKey) {
              console.error('Google Maps API key is missing.');
              alert('Unable to fetch location name. Please try again later.');
              return;
            }

            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
            );
            const data = await response.json();

            if (data.results && data.results.length > 0) {
              const placeName = data.results[0].formatted_address; // Get the formatted address
              console.log('Fetched location:', placeName);
              setHomeLocation(placeName); // Set the place name as the home location
            } else {
              alert('Unable to fetch location name. Please enter it manually.');
            }
          } catch (error) {
            console.error('Error fetching location data:', error);
            alert('Error fetching location data. Please try again later.');
          }
        },
        (error) => {
          console.warn('Geolocation access denied:', error);
          alert('Unable to access your location. Please enter it manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  return (
    <div className="onboarding-flow">
      {step === 1 && (
        <div>
          <h1>Welcome to WotNow!</h1>
          <p>Let’s personalize your experience by selecting your interests and setting your location.</p>
          <button onClick={() => setStep(2)}>Get Started</button>
        </div>
      )}
      {step === 2 && (
        <div>
          <h2>Step 2: Choose a few interests to get started</h2>
          <p>Select the activities you’re interested in, don't worry, you can add lots more later. We've got everything from Archery to Zumba:</p>
          <div className="interests-grid">
            {availableInterests.map((interest) => (
              <label key={interest.id} className="interest-item">
                <input
                  type="checkbox"
                  value={interest.id}
                  onChange={(e) => handleInterestChange(e.target.value, e.target.checked)}
                />
                {interest.label}
              </label>
            ))}
          </div>
          <button onClick={() => setStep(3)}>Next</button>
        </div>
      )}
      {step === 3 && (
        <div>
          <h2>Step 3: Set Your Location</h2>
          <p>Set your home location to get personalized activity suggestions based on weather and conditions.</p>
          <div className="location-input">
            <label>
              Home Location:
              <input
                type="text"
                placeholder="Enter your city or town"
                value={homeLocation}
                onChange={(e) => setHomeLocation(e.target.value)}
              />
            </label>
          </div>

          <button onClick={requestGeolocation}>Use My Current Location</button>

          {showMarineLocation && (
            <>
              <p>Set a marine location for trips to the beach:</p>
              <div className="location-input">
                <label>
                  Marine Location:
                  <input
                    type="text"
                    placeholder="Enter a coastal location"
                    value={marineLocation}
                    onChange={(e) => setMarineLocation(e.target.value)}
                  />
                </label>
              </div>
            </>
          )}

          <div className="location-buttons">
            <button onClick={() => handleFinish('home')}>Dive In!</button>
            <button onClick={() => handleFinish('interests')}>+ Add More Activities</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const hasMounted = useHasMounted();
  const { preferences, setPreferences } = useUserPreferences();
  const homeLocation = preferences.locations?.home || null;
  const coastalLocation = preferences.locations?.marine || null;
  const interests = preferences.interests ?? [];
  const isFirstTimeUser = !preferences?.onboardingComplete;

  if (!hasMounted) {
    return null; // Prevent rendering until hydration is complete
  }

  console.log('Preferences:', preferences);

  // Render onboarding flow for first-time users
  if (isFirstTimeUser) {
    return <OnboardingFlow setPreferences={setPreferences} />;
  }

  // Render the main homepage for returning users
  return (
    <div>
      <h1>Homepage</h1>
      <p>Welcome to WotNow! Here's your personalized content:</p>

      {/* Display user's home location */}
      {homeLocation ? (
        <div>
          <h2>Your Home Location</h2>
          <p>{homeLocation.name}</p>
        </div>
      ) : (
        <p>No home location set. Please update your preferences.</p>
      )}

      {/* Display user's coastal location */}
      {coastalLocation ? (
        <div>
          <h2>Your Marine Location</h2>
          <p>{coastalLocation.name}</p>
        </div>
      ) : (
        <p>No marine location set. Add one to get marine activity suggestions.</p>
      )}

      {/* Display user's interests */}
      <div>
        <h2>Your Interests</h2>
        {interests.length > 0 ? (
          <ul>
            {interests.map((interest) => (
              <li key={interest}>{interest}</li>
            ))}
          </ul>
        ) : (
          <p>No interests selected. Add some to personalize your experience.</p>
        )}
      </div>
    </div>
  );
}