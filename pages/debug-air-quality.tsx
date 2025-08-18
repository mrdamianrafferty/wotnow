import React from 'react';
import AirQualityWarning from '../components/AirQualityWarning';
import EnvironmentalIndicators from '../components/EnvironmentalIndicators';

export default function DebugAirQuality() {
  // Test data that should trigger air quality display
  const testAirQuality = {
    overall: 57  // MODERATE level - should display
  };

  const testPollenData = {
    grass: 0.6,
    tree: undefined,
    weed: 0
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Air Quality Debug Page</h1>
      
      <h2>Direct AirQualityWarning Component (Compact)</h2>
      <div style={{ border: '2px dashed red', padding: '10px', margin: '10px 0' }}>
        <AirQualityWarning airQuality={testAirQuality} mode="compact" />
      </div>

      <h2>Direct AirQualityWarning Component (Full)</h2>
      <div style={{ border: '2px dashed red', padding: '10px', margin: '10px 0' }}>
        <AirQualityWarning airQuality={testAirQuality} mode="full" />
      </div>

      <h2>EnvironmentalIndicators Component (With Both)</h2>
      <div style={{ border: '2px dashed blue', padding: '10px', margin: '10px 0' }}>
        <EnvironmentalIndicators 
          pollen={testPollenData}
          airQuality={testAirQuality}
          mode="compact"
        />
      </div>

      <h2>EnvironmentalIndicators Component (Air Quality Only)</h2>
      <div style={{ border: '2px dashed green', padding: '10px', margin: '10px 0' }}>
        <EnvironmentalIndicators 
          airQuality={testAirQuality}
          mode="compact"
        />
      </div>

      <h3>Test Data</h3>
      <pre>{JSON.stringify({ testAirQuality, testPollenData }, null, 2)}</pre>
    </div>
  );
}
