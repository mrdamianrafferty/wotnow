import React from 'react';
import EnvironmentalIndicators from '../components/EnvironmentalIndicators';
import styles from '../styles/DebugPage.module.css';

/**
 * Debug page to test Environmental Indicators
 * This will help verify that environmental indicators are working correctly
 */
export default function DebugEnvironmentalIndicators() {
  // Sample pollen data
  const samplePollen = {
    grass: 3.5, // Medium-high
    tree: 1.2,  // Low
    weed: 4.8,  // High
  };
  
  // Sample air quality data
  const sampleAirQuality = {
    overall: 78, // Moderate to high
  };

  return (
    <div className={styles.container}>
      <h1>Environmental Indicators Debug</h1>
      
      <section className={styles.section}>
        <h2>Environmental Indicators - Compact Mode</h2>
        <div className={styles.exampleBox}>
          <EnvironmentalIndicators 
            pollen={samplePollen}
            airQuality={sampleAirQuality}
            mode="compact"
          />
        </div>
      </section>
      
      <section className={styles.section}>
        <h2>Environmental Indicators - Full Mode</h2>
        <div className={styles.exampleBox}>
          <EnvironmentalIndicators 
            pollen={samplePollen}
            airQuality={sampleAirQuality}
            mode="full"
          />
        </div>
      </section>
      
      <section className={styles.section}>
        <h2>Pollen Only</h2>
        <div className={styles.exampleBox}>
          <EnvironmentalIndicators 
            pollen={samplePollen}
            mode="compact"
          />
        </div>
      </section>
      
      <section className={styles.section}>
        <h2>Air Quality Only</h2>
        <div className={styles.exampleBox}>
          <EnvironmentalIndicators 
            airQuality={sampleAirQuality}
            mode="compact"
          />
        </div>
      </section>
      
      <section className={styles.section}>
        <h2>Debugging Information</h2>
        <div className={styles.codeBlock}>
          <pre>
            {`
// Sample Pollen Data
${JSON.stringify(samplePollen, null, 2)}

// Sample Air Quality Data
${JSON.stringify(sampleAirQuality, null, 2)}
            `}
          </pre>
        </div>
      </section>
    </div>
  );
}
