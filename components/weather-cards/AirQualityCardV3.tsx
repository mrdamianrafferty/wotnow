import React from 'react';

// Super simple card for testing hydration and component updates
export const AirQualityCardV3 = () => {
  // Force re-render with current timestamp
  const [timestamp, setTimestamp] = React.useState('');
  
  React.useEffect(() => {
    // This will only run client-side
    setTimestamp(new Date().toISOString());
    
    // Update timestamp every second to ensure we see changes
    const timer = setInterval(() => {
      setTimestamp(new Date().toISOString());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="card bg-slate-800/35 p-4 rounded-lg shadow-lg border border-white/10 max-w-sm">
      <h3 className="text-white text-xl font-bold">AIR QUALITY CARD V3</h3>
      <p className="text-white">This is a test replacement for AirQualityCardV2</p>
      <div className="mt-2 p-2 bg-slate-700/60 text-white rounded">
        Current time: {timestamp}
      </div>
      <div className="mt-2 bg-slate-600/50 text-white p-2 rounded">
        This card should update every second with the current time.
        If you see this card on the page, it means it's properly rendering.
      </div>
    </div>
  );
};
