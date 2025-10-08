// scripts/migrateCoordinatePrecision.js

/**
 * Migration script to update existing cached data from 5 to 4 decimal places
 * Run this ONCE after deploying the coordinate precision update
 */

function migrateLocalStorageKey(key, oldPrecision = 5, newPrecision = 4) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    
    const data = JSON.parse(raw);
    
    // Handle arrays of items with lat/lon
    if (Array.isArray(data)) {
      const updated = data.map(item => {
        if (typeof item.lat === 'number' && typeof item.lon === 'number') {
          return {
            ...item,
            lat: +item.lat.toFixed(newPrecision),
            lon: +item.lon.toFixed(newPrecision)
          };
        }
        return item;
      });
      localStorage.setItem(key, JSON.stringify(updated));
      console.log(`✅ Migrated ${key}: ${data.length} items`);
    }
    // Handle single objects with lat/lon
    else if (typeof data === 'object' && data !== null) {
      if (typeof data.lat === 'number' && typeof data.lon === 'number') {
        const updated = {
          ...data,
          lat: +data.lat.toFixed(newPrecision),
          lon: +data.lon.toFixed(newPrecision)
        };
        localStorage.setItem(key, JSON.stringify(updated));
        console.log(`✅ Migrated ${key}: single location`);
      }
    }
  } catch (e) {
    console.error(`❌ Failed to migrate ${key}:`, e);
  }
}

// Run migration on all known location storage keys
function runMigration() {
  console.log('🔄 Starting coordinate precision migration...');
  
  const keysToMigrate = [
    'wotnow.coast.orientation.v1',
    'cachedBeaches',
    'recentCoastalLocations',
    'advancedGeolocationCache',
    'selectedPlace',
    'lastCoords',
    'userLocation',
    'mapCenter',
    'cachedCoords',
    'currentSearchLocation',
    'wotnow.beach.user.orientation.v1'
  ];
  
  keysToMigrate.forEach(key => migrateLocalStorageKey(key));
  
  // Mark migration as complete
  localStorage.setItem('coordinatePrecisionMigrated', 'true');
  console.log('✅ Migration complete!');
}

// Auto-run if not already migrated
if (typeof window !== 'undefined' && !localStorage.getItem('coordinatePrecisionMigrated')) {
  runMigration();
}