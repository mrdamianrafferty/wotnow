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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.36)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div
        style={{
          padding: 28,
          background: '#fff',
          borderRadius: 18,
          maxWidth: 460,
          width: '92vw',
          position: 'relative'
        }}
      >
        <button onClick={onClose} style={{ position: 'absolute', right: 12, top: 8, fontSize: 22, background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>&times;</button>
        <h3 style={{ margin: '0 0 13px 0', color: '#2563eb', fontWeight: 700 }}>Pick your beach or coastal spot</h3>
        <input
          type="text"
          value={query}
          autoFocus
          placeholder="Search for beach, town, or coast"
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doSearch()}
          style={{
            width: '100%',
            padding: 10,
            fontSize: '1rem',
            border: '1.4px solid #bbb',
            borderRadius: 7,
            marginBottom: 13
          }}
        />
        <button
          style={{
            padding: '8px 18px',
            borderRadius: 7,
            fontWeight: 600,
            background: '#059669',
            color: '#fff',
            fontSize: '1rem',
            border: 'none',
            width: '100%',
            marginBottom: 12
          }}
          onClick={doSearch}
          disabled={loading || !query}
        >
          Search
        </button>
        {loading && <div>Searching…</div>}
        {!loading && results.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {results.map((r, i) => (
              <li key={i} style={{
                cursor: 'pointer',
                padding: '10px 0',
                borderBottom: i !== results.length - 1 ? '1px solid #eef' : 'none'
              }}>
                <button
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    color: "#174031",
                    fontSize: "1.09rem",
                    textAlign: "left",
                    padding: 0
                  }}
                  onClick={() => onSave(r)}
                >
                  {r.name}
                  <span style={{ color: "#70b0ea", fontSize: "0.99rem", marginLeft: 6 }}>
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