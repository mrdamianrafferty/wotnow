import React, { useState } from "react";

const OPENWEATHERMAP_API_KEY = "c3a347c745911a93250ece7a27d16a3f";

const Location: React.FC = () => {
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!city.trim() || !country.trim()) {
      setError("Please enter both city and country.");
      return;
    }

    setLoading(true);
    try {
      // Fetch latitude and longitude using OpenWeatherMap Geocoding API
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
          city
        )},${encodeURIComponent(country)}&limit=1&appid=${OPENWEATHERMAP_API_KEY}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch geocoding data");
      }
      const data = await response.json();
      if (!data || data.length === 0) {
        throw new Error("Location not found");
      }
      const { lat, lon, name, country: countryCode } = data[0];
      // Save to localStorage with lat, lon, city, country
      localStorage.setItem(
        "userLocation",
        JSON.stringify({ lat, lon, city: name, country: countryCode })
      );
      setError(null);
      alert("Location saved successfully.");
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>
          City:
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={loading}
          />
        </label>
      </div>
      <div>
        <label>
          Country:
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={loading}
          />
        </label>
      </div>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Location"}
      </button>
    </form>
  );
};

export default Location;