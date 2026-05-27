import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
  {/* Site verification */}
  <meta name="google-site-verification" content="fcfe641a3f11aa29" />
  <meta name="msvalidate.01" content="7EC292D292011752BACC24475D691844" />

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

  {/* Google Search Console verification — grow.godaisy.io property */}
  {/* Harmless on other domains served by this codebase (godaisy.io, findr); */}
  {/* Search Console only checks the specific property it's verifying. */}
  {/* Add additional <meta name="google-site-verification" .../> tags here when verifying other properties. */}
  <meta name="google-site-verification" content="ADOaxDfzCoVFJKP8GUU5tVAAXwmhDhTa1kSAqsNm3NE" />

  {/* Bing Webmaster Tools verification — grow.godaisy.io property */}
  {/* Same hosting model as Google: harmless on other domains; Bing only checks its target property. */}
  <meta name="msvalidate.01" content="7EC292D292011752BACC24475D691844" />

  {/* Favicons and apple-touch-icon are set dynamically per-app in _app.tsx */}
  {/* (Go Daisy, Grow Daisy, Findr each have their own favicon set) */}

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
