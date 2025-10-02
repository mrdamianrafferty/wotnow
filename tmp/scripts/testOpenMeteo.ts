import { fetchOpenMeteoMarineSeries } from '../../lib/services/weatherService';

async function run() {
  const now = new Date();
  const start = now.toISOString();
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const result = await fetchOpenMeteoMarineSeries(36.4649, -4.9803, start, end);
  console.log(JSON.stringify(result, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
