import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
  {/* Critical resource hints - preconnect establishes early connections to reduce API latency */}
  <link rel="preconnect" href="https://api.openweathermap.org" crossOrigin="anonymous" />
  <link rel="preconnect" href="https://maps.googleapis.com" />
  <link rel="preconnect" href="https://api.met.no" crossOrigin="anonymous" />

  {/* DNS prefetch as fallback for browsers that don't support preconnect */}
  <link rel="dns-prefetch" href="https://api.openweathermap.org" />
  <link rel="dns-prefetch" href="https://maps.googleapis.com" />
  <link rel="dns-prefetch" href="https://api.met.no" />

  {/* Preconnect to Supabase for faster auth and data fetching */}
  <link rel="preconnect" href="https://swmviqpxetwziqxhzldh.supabase.co" crossOrigin="anonymous" />

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

  {/* PWA Manifest - Handled dynamically in _app.tsx based on domain/route */}

  {/* Safari pinned tab */}
  <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#0f766e" />

  {/* Google Maps API - now loaded lazily via lib/googleMapsLazy.ts when needed */}
  {/* Removed synchronous script to improve initial page load performance */}

  {/* Cookie consent banner (Go Daisy + Findr) */}
  <script
    dangerouslySetInnerHTML={{
      __html: `(() => {
        if (typeof window === 'undefined') return;
        const host = window.location.hostname || '';
        let src = '//cdn.cookie-script.com/s/3f706315ee259f92cd8374e4d3d1d9ad.js';
        if (host.includes('fishfindr') || host.includes('findr')) {
          src = '//cdn.cookie-script.com/s/cbca916912f8ea2e15a91f35dc2880e5.js';
        }
        const node = document.createElement('script');
        node.type = 'text/javascript';
        node.charset = 'UTF-8';
        node.src = src;
        node.async = true;
        document.head.appendChild(node);
      })();`,
    }}
  />
</Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
