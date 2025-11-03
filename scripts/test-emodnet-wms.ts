#!/usr/bin/env tsx
/**
 * Test EMODnet WMS (Web Map Service) endpoints
 *
 * Tests both:
 * 1. EMODnet Bathymetry WMS (fallback for EBWBL)
 * 2. EMODnet Geology WMS (seabed substrate)
 */

interface WMSTest {
  name: string;
  service: 'bathymetry' | 'geology';
  baseUrl: string;
  layer: string;
  description: string;
  bbox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

const TEST_SERVICES: WMSTest[] = [
  {
    name: 'EMODnet Bathymetry',
    service: 'bathymetry',
    baseUrl: 'https://ows.emodnet-bathymetry.eu/wms',
    layer: 'emodnet:mean_atlas_land',
    description: 'Mean depth atlas with land coverage (~115m resolution)',
    bbox: {
      // Bay of Biscay area (EPSG:4326)
      minX: -6.0,
      minY: 43.0,
      maxX: -5.0,
      maxY: 44.0
    }
  },
  {
    name: 'EMODnet Geology - Seabed Substrate',
    service: 'geology',
    baseUrl: 'https://ows.emodnet-geology.eu/geoserver/emodnet/wms',
    layer: 'seabed_substrate_1m',
    description: 'Seabed substrate composition (1:1M scale)',
    bbox: {
      // Same area for comparison
      minX: -6.0,
      minY: 43.0,
      maxX: -5.0,
      maxY: 44.0
    }
  },
  {
    name: 'EMODnet Bathymetry - Latest DTM',
    service: 'bathymetry',
    baseUrl: 'https://ows.emodnet-bathymetry.eu/wms',
    layer: 'emodnet:mean_2024',
    description: '2024 DTM release (highest resolution)',
    bbox: {
      minX: -6.0,
      minY: 43.0,
      maxX: -5.0,
      maxY: 44.0
    }
  }
];

interface TestResult {
  test: WMSTest;
  success: boolean;
  responseTime: number;
  statusCode?: number;
  contentType?: string;
  contentLength?: number;
  corsEnabled?: boolean;
  error?: string;
  capabilitiesUrl?: string;
}

async function buildWMSUrl(test: WMSTest): Promise<string> {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    LAYERS: test.layer,
    BBOX: `${test.bbox.minX},${test.bbox.minY},${test.bbox.maxX},${test.bbox.maxY}`,
    CRS: 'EPSG:4326',
    WIDTH: '256',
    HEIGHT: '256',
    FORMAT: 'image/png',
    TRANSPARENT: 'true'
  });

  return `${test.baseUrl}?${params.toString()}`;
}

async function testWMSService(test: WMSTest): Promise<TestResult> {
  const url = await buildWMSUrl(test);
  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });

    const responseTime = performance.now() - startTime;
    const corsEnabled = response.headers.get('access-control-allow-origin') !== null;

    // Check if we got an image or an error
    const contentType = response.headers.get('content-type') || '';
    const isImage = contentType.includes('image/png');
    const isError = contentType.includes('xml') || contentType.includes('json');

    let success = response.ok && isImage;
    let error: string | undefined;

    if (!success && isError) {
      const errorBody = await response.text();
      error = errorBody.substring(0, 200); // First 200 chars of error
    }

    // Build GetCapabilities URL for reference
    const capabilitiesUrl = `${test.baseUrl}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities`;

    return {
      test,
      success,
      responseTime,
      statusCode: response.status,
      contentType,
      contentLength: parseInt(response.headers.get('content-length') || '0'),
      corsEnabled,
      capabilitiesUrl,
      error
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    return {
      test,
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testGetCapabilities(baseUrl: string): Promise<{
  success: boolean;
  layers?: string[];
  error?: string;
}> {
  try {
    const url = `${baseUrl}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities`;
    const response = await fetch(url);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const xml = await response.text();

    // Simple regex to extract layer names (not a full XML parser)
    const layerMatches = xml.matchAll(/<Name>(.*?)<\/Name>/g);
    const layers = Array.from(layerMatches).map(m => m[1]).filter(l => !l.startsWith('WMS') && !l.startsWith('OGC'));

    return { success: true, layers: layers.slice(0, 10) }; // First 10 layers
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function runTests() {
  console.log('🗺️  EMODnet WMS Services Test\n');
  console.log('─'.repeat(80));

  const results: TestResult[] = [];

  // Test each WMS service
  for (const test of TEST_SERVICES) {
    process.stdout.write(`Testing: ${test.name}... `);
    const result = await testWMSService(test);
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
    console.log(`${index + 1}. ${result.test.name}`);
    console.log(`   Service: ${result.test.service.toUpperCase()}`);
    console.log(`   Description: ${result.test.description}`);
    console.log(`   Layer: ${result.test.layer}`);
    console.log(`   Base URL: ${result.test.baseUrl}`);
    console.log(`   Status: ${result.success ? '✅ Success' : '❌ Failed'}`);

    if (result.success) {
      console.log(`   Response Time: ${result.responseTime.toFixed(0)}ms`);
      console.log(`   Status Code: ${result.statusCode}`);
      console.log(`   Content Type: ${result.contentType}`);
      console.log(`   Content Length: ${((result.contentLength || 0) / 1024).toFixed(2)}KB`);
      console.log(`   CORS Enabled: ${result.corsEnabled ? '✅' : '❌'}`);
      if (result.capabilitiesUrl) {
        console.log(`   Capabilities: ${result.capabilitiesUrl}`);
      }
    } else {
      console.log(`   Error: ${result.error || 'Unknown error'}`);
      if (result.statusCode) {
        console.log(`   Status Code: ${result.statusCode}`);
      }
    }
    console.log('');
  });

  // Test GetCapabilities for unique services
  console.log('─'.repeat(80));
  console.log('\n🔍 Testing GetCapabilities Endpoints:\n');

  const uniqueServices = [...new Set(TEST_SERVICES.map(t => t.baseUrl))];

  for (const baseUrl of uniqueServices) {
    const serviceName = baseUrl.includes('bathymetry') ? 'Bathymetry' : 'Geology';
    process.stdout.write(`Fetching ${serviceName} capabilities... `);

    const caps = await testGetCapabilities(baseUrl);

    if (caps.success) {
      console.log(`✅`);
      console.log(`   Available layers (first 10):`);
      caps.layers?.forEach(layer => console.log(`     - ${layer}`));
    } else {
      console.log(`❌ ${caps.error}`);
    }
    console.log('');
  }

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
  console.log(`🌐 CORS Enabled: ${allCorsEnabled ? '✅ Yes' : '⚠️  Partial or No'}`);

  if (successCount === results.length && allCorsEnabled && avgResponseTime < 2000) {
    console.log('\n🎉 All WMS services are accessible and ready to use!');
    console.log('\n✅ Both EBWBL (WMTS) and WMS fallbacks are operational.');
  } else if (successCount === 0) {
    console.log('\n⚠️  CRITICAL: No WMS services could be accessed!');
    console.log('   Check internet connection and service status.');
  } else if (!allCorsEnabled) {
    console.log('\n⚠️  WARNING: Some services lack proper CORS headers!');
    console.log('   Browser-based access may be blocked for these services.');
    console.log('   Consider using a proxy or server-side rendering.');
  } else if (avgResponseTime > 2000) {
    console.log('\n⚠️  WARNING: Slow response times detected.');
    console.log('   Average response time exceeds 2 seconds.');
    console.log('   WMS services are typically slower than WMTS tiles.');
    console.log('   This is expected - prioritize EBWBL WMTS when available.');
  } else {
    console.log(`\n⚠️  Some tests failed (${results.length - successCount}/${results.length})`);
    console.log('   WMS services may have limited layer availability.');
  }

  console.log('\n' + '─'.repeat(80));

  return successCount > 0 ? 0 : 1;
}

// Run tests
runTests()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('\n❌ Test script error:', error);
    process.exit(1);
  });
