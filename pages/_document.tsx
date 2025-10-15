import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
  {/* Core */}
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="shortcut icon" href="/favicon.ico?v=2" />

  {/* PNG fallbacks */}
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=2" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=2" />

  {/* Apple / iOS */}
  <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />

  {/* Optional: PWA */}
  <link rel="manifest" href="/site.webmanifest?v=2" />
  {/* Optional: Safari pinned tab (supply a monochrome SVG if you want this) */}
  <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#0f766e" />
  
  {/* Google Maps API - loaded with callback-based event pattern for reliability */}
  {/* eslint-disable-next-line @next/next/no-sync-scripts */}
  <script
    src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async&v=weekly&callback=initGoogleMaps`}
  />
  <script dangerouslySetInnerHTML={{
    __html: `
      // Timeout to detect if Google Maps fails to load
      window.googleMapsLoadTimeout = setTimeout(function() {
        if (!window.google || !window.google.maps) {
          console.error('❌ Google Maps failed to load within 15 seconds');
          window.dispatchEvent(new Event('googleMapsLoadError'));
        }
      }, 15000);

      // Callback function that Google Maps will call when ready
      window.initGoogleMaps = function() {
        clearTimeout(window.googleMapsLoadTimeout);
        window.googleMapsReady = true;
        window.dispatchEvent(new Event('googleMapsLoaded'));
        console.log('✅ Google Maps API loaded successfully');
      };

      // Catch script load errors
      window.addEventListener('error', function(e) {
        if (e.filename && e.filename.includes('maps.googleapis.com')) {
          console.error('❌ Error loading Google Maps script:', e.message);
          clearTimeout(window.googleMapsLoadTimeout);
          window.dispatchEvent(new Event('googleMapsLoadError'));
        }
      }, true);
    `
  }} />
</Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
