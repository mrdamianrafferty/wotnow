import React, { useState } from 'react';

// Define the component interface
const CoastalLocationDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  onSave: (loc: { name: string; lat: number; lon: number }) => void;
  homeLocation?: any;
  coastalLocation?: any;
  setHomeLocation?: (loc: any) => void;
  setCoastalLocation?: (loc: any) => void;
}> = ({ 
  open, 
  onClose, 
  title = "Pick your location",
  onSave, 
  homeLocation,
  coastalLocation,
  setHomeLocation,
  setCoastalLocation
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ name: string; lat: number; lon: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = async () => {
    if (!query) return;
    setLoading(true);
    setResults([]);
    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
      const resp = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`
      );
      const data = await resp.json();
      setResults(
        Array.isArray(data)
          ? data.map((r: any) => ({
            name: `${r.name}${r.state ? ', ' + r.state : ''}${r.country ? ', ' + r.country : ''}`,
            lat: r.lat,
            lon: r.lon
          }))
          : []
      );
    } catch (e) {
      setResults([]);
    }
    setLoading(false);
  };

  // If dialog is not open, don't render anything
  if (!open) return null;

  // Use CSS classes from index.css for styling
  return (
    <div className="coastal-dialog-backdrop coastal-dialog-modal">
      <div className="coastal-dialog coastal-dialog-content">
        {/* Close button */}
        <button className="coastal-dialog-close" onClick={onClose}>&times;</button>
        
        {/* Dialog title */}
        <h3 className="coastal-dialog-title">{title}</h3>
        
        {/* Search input */}
        <input
          type="text"
          value={query}
          autoFocus
          placeholder="Search for location"
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doSearch()}
          className="coastal-dialog-input location-banner__input"
        />
        
        {/* Search button */}
        <button
          className="coastal-dialog-search location-banner__button"
          onClick={doSearch}
          disabled={loading || !query}
        >
          Search
        </button>
        
        {/* Loading indicator */}
        {loading && <div className="coastal-dialog-loading">Searching…</div>}
        
        {/* Results list */}
        {!loading && results.length > 0 && (
          <ul className="coastal-dialog-list">
            {results.map((r, i) => (
              <li key={i} className="coastal-dialog-list-item">
                <button
                  className="coastal-dialog-list-btn"
                  onClick={() => {
                    // Save the selected location and close the dialog
                    onSave(r);
                  }}
                >
                  {r.name}
                  <span className="coastal-dialog-list-coords">
                    ({r.lat.toFixed(3)}, {r.lon.toFixed(3)})
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CoastalLocationDialog;