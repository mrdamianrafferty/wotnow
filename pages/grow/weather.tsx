import Head from 'next/head';
import { GrowLayout } from '../../components/grow/GrowLayout';
import { WeatherPage } from '../../components/grow/WeatherPage';

export default function GrowWeatherRoute() {
  return (
    <>
      <Head>
        <title>Weather Conditions | Grow Daisy</title>
        <meta name="description" content="Real-time weather conditions and forecasts for your garden" />
      </Head>
      <GrowLayout title="Weather">
        <div className="container mx-auto px-4 py-6">
          <WeatherPage />
        </div>
      </GrowLayout>
    </>
  );
}
