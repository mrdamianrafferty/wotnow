import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
  {/* Preconnect to external APIs for faster loading */}
  <link rel="preconnect" href="https://api.openweathermap.org" />
  <link rel="preconnect" href="https://maps.googleapis.com" />
  <link rel="preconnect" href="https://api.met.no" />
  <link rel="dns-prefetch" href="https://api.openweathermap.org" />
  <link rel="dns-prefetch" href="https://maps.googleapis.com" />

  {/* Core */}
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="shortcut icon" href="/favicon.ico?v=2" />

  {/* PNG fallbacks */}
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=2" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=2" />

  {/* Apple / iOS */}
  <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Go Daisy" />

  {/* PWA Manifest */}
  <link rel="manifest" href="/manifest-godaisy.json" />

  {/* Safari pinned tab */}
  <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#0f766e" />

  {/* Google Maps API - now loaded lazily via lib/googleMapsLazy.ts when needed */}
  {/* Removed synchronous script to improve initial page load performance */}
</Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
