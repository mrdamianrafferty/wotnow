import Document, { Html, Head, Main, NextScript } from 'next/document';
import Script from 'next/script';

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
  
  <Script
    src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async&v=weekly`}
    strategy="beforeInteractive"
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
