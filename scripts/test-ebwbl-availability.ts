#!/usr/bin/env tsx
/**
 * Test EBWBL (EMODnet Bathymetry World Base Layer) tile availability
 *
 * This script tests:
 * 1. Basic connectivity to EBWBL tile server
 * 2. CORS headers (required for browser access)
 * 3. Response time and tile size
 * 4. Multiple zoom levels
 * 5. Different geographic locations
 */

interface TileTest {
  name: string;
  z: number;
  x: number;
  y: number;
  description: string;
}

// CORRECT URL PATTERN (verified Nov 2025):
// The WMTS service requires the TileMatrixSet parameter
// For web maps, use "web_mercator" (EPSG:3857)
const EBWBL_BASE_URL = 'https://tiles.emodnet-bathymetry.eu/2020/baselayer/web_mercator';

// Test tiles at different zoom levels and locations
const TEST_TILES: TileTest[] = [
  {
    name: 'Europe Overview',
    z: 4,
    x: 8,
    y: 5,
    description: 'Low zoom - Europe overview (from spec)'
  },
  {
    name: 'Asturias Coast',
    z: 8,
    x: 125,
    y: 95,
    description: 'Medium zoom - Northern Spain coast'
  },
  {
    name: 'Bay of Biscay',
    z: 10,
    x: 501,
    y: 381,
    description: 'High zoom - Detailed coastal area'
  },
  {
    name: 'Maximum Zoom Test',
    z: 14,
    x: 8018,
    y: 6095,
    description: 'Maximum zoom level - very detailed'
  }
];

interface TestResult {
  tile: TileTest;
  success: boolean;
  responseTime: number;
  statusCode?: number;
  contentType?: string;
  contentLength?: number;
  corsEnabled?: boolean;
  error?: string;
}

async function testTile(tile: TileTest): Promise<TestResult> {
  const url = `${EBWBL_BASE_URL}/${tile.z}/${tile.x}/${tile.y}.png`;
  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD first to check without downloading full tile
      headers: {
        'Origin': 'http://localhost:3000' // Simulate browser request
      }
    });

    const responseTime = performance.now() - startTime;

    // Check CORS headers
    const corsEnabled = response.headers.get('access-control-allow-origin') !== null;

    const result: TestResult = {
      tile,
      success: response.ok,
      responseTime,
      statusCode: response.status,
      contentType: response.headers.get('content-type') || undefined,
      contentLength: parseInt(response.headers.get('content-length') || '0'),
      corsEnabled
    };

    // If HEAD request works, try GET to verify actual tile data
    if (response.ok) {
      const getStartTime = performance.now();
      const getResponse = await fetch(url);
      const getResponseTime = performance.now() - getStartTime;

      if (getResponse.ok) {
        const blob = await getResponse.blob();
        result.contentLength = blob.size;
        result.responseTime = getResponseTime; // Use GET response time as it's more realistic
      }
    }

    return result;
  } catch (error) {
    const responseTime = performance.now() - startTime;
    return {
      tile,
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function runTests() {
  console.log('🗺️  EBWBL Tile Availability Test\n');
  console.log(`Testing endpoint: ${EBWBL_BASE_URL}\n`);
  console.log('─'.repeat(80));

  const results: TestResult[] = [];

  for (const tile of TEST_TILES) {
    process.stdout.write(`Testing: ${tile.name} (z${tile.z})... `);
    const result = await testTile(tile);
    results.push(result);

    if (result.success) {
      console.log(`✅ ${result.responseTime.toFixed(0)}ms`);
    } else {
      console.log(`❌ Failed`);
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log('\n📊 Detailed Results:\n');

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.tile.name}`);
    console.log(`   Description: ${result.tile.description}`);
    console.log(`   Tile: z${result.tile.z}/x${result.tile.x}/y${result.tile.y}`);
    console.log(`   URL: ${EBWBL_BASE_URL}/${result.tile.z}/${result.tile.x}/${result.tile.y}.png`);
    console.log(`   Status: ${result.success ? '✅ Success' : '❌ Failed'}`);

    if (result.success) {
      console.log(`   Response Time: ${result.responseTime.toFixed(0)}ms`);
      console.log(`   Status Code: ${result.statusCode}`);
      console.log(`   Content Type: ${result.contentType}`);
      console.log(`   Content Length: ${(result.contentLength || 0) / 1024}KB`);
      console.log(`   CORS Enabled: ${result.corsEnabled ? '✅' : '❌'}`);
    } else {
      console.log(`   Error: ${result.error || 'Unknown error'}`);
      if (result.statusCode) {
        console.log(`   Status Code: ${result.statusCode}`);
      }
    }
    console.log('');
  });

  // Summary
  const successCount = results.filter(r => r.success).length;
  const avgResponseTime = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.responseTime, 0) / successCount || 0;

  const allCorsEnabled = results
    .filter(r => r.success)
    .every(r => r.corsEnabled);

  console.log('─'.repeat(80));
  console.log('\n📈 Summary:\n');
  console.log(`✅ Successful: ${successCount}/${results.length}`);
  console.log(`⏱️  Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`🌐 CORS Enabled: ${allCorsEnabled ? '✅ Yes' : '❌ No'}`);

  if (successCount === results.length && allCorsEnabled && avgResponseTime < 2000) {
    console.log('\n🎉 All tests passed! EBWBL tiles are accessible and ready to use.');
    console.log('\n✅ You can proceed with Phase 1 implementation.');
  } else if (successCount === 0) {
    console.log('\n⚠️  CRITICAL: No tiles could be fetched!');
    console.log('   This indicates a connectivity issue or the service may be down.');
    console.log('   Check your internet connection and try again.');
  } else if (!allCorsEnabled) {
    console.log('\n⚠️  WARNING: CORS headers not detected!');
    console.log('   Browser-based access may be blocked.');
    console.log('   Consider using a proxy or server-side tile fetching.');
  } else if (avgResponseTime > 2000) {
    console.log('\n⚠️  WARNING: Slow response times detected.');
    console.log('   Average response time exceeds 2 seconds.');
    console.log('   Consider implementing aggressive caching.');
  } else {
    console.log(`\n⚠️  Some tests failed (${results.length - successCount}/${results.length})`);
    console.log('   Review the detailed results above.');
  }

  console.log('\n' + '─'.repeat(80));

  // Return exit code based on results
  return successCount > 0 ? 0 : 1;
}

// Run tests
runTests()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('\n❌ Test script error:', error);
    process.exit(1);
  });
