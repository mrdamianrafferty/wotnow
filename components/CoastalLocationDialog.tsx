import React, { useState } from 'react';
// --------------- COASTAL LOCATION MODAL ---------------
const CoastalLocationDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSave: (loc: { name: string; lat: number; lon: number }) => void;
}> = ({ open, onClose, onSave }) => {
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

  if (!open) return null;

  return (
    <div className="coastal-dialog-backdrop">
      <div className="coastal-dialog">
        <button className="coastal-dialog-close" onClick={onClose}>&times;</button>
        <h3 className="coastal-dialog-title">Pick your beach or coastal spot</h3>
        <input
          type="text"
          value={query}
          autoFocus
          placeholder="Search for beach, town, or coast"
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doSearch()}
          className="coastal-dialog-input"
        />
        <button
          className="coastal-dialog-search"
          onClick={doSearch}
          disabled={loading || !query}
        >
          Search
        </button>
        {loading && <div className="coastal-dialog-loading">Searching…</div>}
        {!loading && results.length > 0 && (
          <ul className="coastal-dialog-list">
            {results.map((r, i) => (
              <li key={i} className="coastal-dialog-list-item">
                <button
                  className="coastal-dialog-list-btn"
                  onClick={() => onSave(r)}
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