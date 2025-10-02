import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Heart } from 'lucide-react';

/**
 * DEMO PAGE - No Authentication Required
 * 
 * This demonstrates the favourites UI with live confidence scores
 * from get_fishing_predictions without requiring user sign-in.
 * 
 * Usage: http://localhost:3000/findr/favourites-demo?rectangleCode=31F2
 */

interface Species {
  id: string;
  species_code: string;
  name_en: string;
  scientific_name: string;
  eating_quality: number;
}

interface PredictionResponse {
  species_code?: string;
  species_id?: string;
  confidence?: number;
  confidence_percent?: number;
  headline?: string;
  common_name?: string;
  species_common_name?: string;
}

export default function FavouritesDemoPage() {
  const [rectangleCode, setRectangleCode] = useState('31F2'); // Default to Brighton area
  const [species, setSpecies] = useState<Species[]>([]);
  const [predictions, setPredictions] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch top species from database
  useEffect(() => {
    async function loadSpecies() {
      try {
        const response = await fetch('/api/findr/regional?rectangleCode=' + rectangleCode);
        if (!response.ok) throw new Error('Failed to load species');
        
        const data = await response.json();
        setSpecies(data.slice(0, 5)); // Top 5 species for demo
      } catch (err) {
        console.error('Error loading species:', err);
        setError('Failed to load species data');
      }
    }

    loadSpecies();
  }, [rectangleCode]);

  // Fetch live confidence scores
  useEffect(() => {
    if (species.length === 0) return;

    async function loadPredictions() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/findr/predictions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rectangleCode,
            predictionDate: new Date().toISOString().slice(0, 10),
          }),
        });

        if (!response.ok) throw new Error('Failed to load predictions');

        const data = await response.json();
        const predsArray = data.predictions as PredictionResponse[];

        const scoreMap = new Map<string, number>();
        for (const pred of predsArray) {
          const code = pred.species_code?.toUpperCase();
          if (!code) continue;
          const confidence = pred.confidence ?? pred.confidence_percent ?? 50;
          scoreMap.set(code, confidence);
        }

        setPredictions(scoreMap);
      } catch (err) {
        console.error('Error loading predictions:', err);
        setError('Failed to load live predictions. Using default scores.');
      } finally {
        setLoading(false);
      }
    }

    loadPredictions();
  }, [species, rectangleCode]);

  const getConfidenceColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-50';
    if (score >= 50) return 'text-blue-600 bg-blue-50';
    return 'text-amber-600 bg-amber-50';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 70) return 'Active';
    if (score >= 50) return 'Good';
    return 'Waiting';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎣 Favourites Demo - Live Weather Scoring
          </h1>
          <p className="text-gray-600 mb-4">
            This page demonstrates confidence scoring using your existing{' '}
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">get_fishing_predictions</code> RPC
            with live weather data. No authentication required for demo.
          </p>

          {/* Rectangle Code Input */}
          <div className="flex gap-3 items-center">
            <label className="font-medium text-gray-700">ICES Rectangle:</label>
            <input
              type="text"
              value={rectangleCode}
              onChange={(e) => setRectangleCode(e.target.value.toUpperCase())}
              className="border border-gray-300 rounded px-3 py-2 w-32 uppercase"
              placeholder="31F2"
            />
            <span className="text-sm text-gray-500">
              (Try: 31F2=Brighton, 30F2=Cornwall, 37F4=Norfolk)
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading live predictions...</p>
          </div>
        )}

        {/* Species Cards */}
        <div className="grid gap-4">
          {species.map((sp) => {
            const code = sp.species_code.toUpperCase();
            const confidence = predictions.get(code) ?? 50;
            const colorClass = getConfidenceColor(confidence);
            const label = getConfidenceLabel(confidence);

            return (
              <div
                key={sp.id}
                className="bg-white rounded-lg shadow-sm p-6 flex items-center gap-6"
              >
                {/* Species Image */}
                <div className="w-24 h-24 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden relative">
                  <Image
                    src={`/images/fish/${sp.species_code.toLowerCase()}.jpg`}
                    alt={sp.name_en}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/images/fish/placeholder.jpg';
                    }}
                  />
                </div>

                {/* Species Info */}
                <div className="flex-grow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{sp.name_en}</h3>
                      <p className="text-sm text-gray-500 italic">{sp.scientific_name}</p>
                      <p className="text-xs text-gray-400 mt-1">Code: {sp.species_code}</p>
                    </div>

                    {/* Favourite Heart Icon */}
                    <button className="p-2 rounded-full hover:bg-gray-100">
                      <Heart className="w-6 h-6 text-gray-400" />
                    </button>
                  </div>

                  {/* Eating Quality */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Eating Quality:</span>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={
                            i < sp.eating_quality ? 'text-yellow-500' : 'text-gray-300'
                          }
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Confidence Score */}
                <div className="text-center flex-shrink-0">
                  <div
                    className={`${colorClass} rounded-lg px-4 py-3 min-w-[120px]`}
                  >
                    <div className="text-3xl font-bold">{confidence}%</div>
                    <div className="text-sm font-medium uppercase">{label}</div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Live Weather Score</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">✅ How This Works</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>
              Fetches species from your <code>species</code> table via{' '}
              <code>/api/findr/regional</code>
            </li>
            <li>
              Gets live confidence scores from <code>get_fishing_predictions</code> RPC
            </li>
            <li>
              Uses real weather data (wind, temperature, pressure, tides) for scoring
            </li>
            <li>Updates daily as weather conditions change</li>
            <li>No authentication needed for demo - just exploring the data</li>
          </ul>

          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Next Step:</strong> Add authentication to allow users to save favourites
              and track their personal species list. The full system in{' '}
              <code>/findr/favourites-modern</code> includes this + catch tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
