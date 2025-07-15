import type { NextApiRequest, NextApiResponse } from 'next';

type GigEvent = {
  date: string;
  artist: string;
  venue: string;
  city: string;
  country: string;
  genres: string[];
  category: string;
};

type TicketmasterEvent = {
  name: string;
  dates?: { start?: { localDate?: string } };
  classifications?: Array<{ genre?: { name: string }; segment?: { name: string } }>;
  _embedded?: { venues?: Array<{ name: string; city?: { name?: string }; country?: { name?: string } }> };
};

const SEGMENT_MAP: Record<string, string> = {
  Music: 'KZFzniwnSyZfZ7v7nJ',
  Sports: 'KZFzniwnSyZfZ7v7nE',
  'Arts & Theatre': 'KZFzniwnSyZfZ7v7na',
};

const DEFAULT_SIZE = 25;
const DEFAULT_RADIUS = 60; // km

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<GigEvent[] | { error: string }>) {
  const { city, countryCode, category, genre, startDate, endDate, page = 0 } = req.query;
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) return res.status(400).json({ error: 'Missing API key' });
  if (!city) return res.status(400).json({ error: 'Missing city' });

  let lat: number | undefined;
  let lon: number | undefined;
  let cityValue = String(city);
  let country = typeof countryCode === 'string' ? countryCode : '';

  // Dynamically geocode city and get country if not provided
  try {
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityValue)}&limit=1&appid=${apiKey}${country ? `&country=${country}` : ''}`;
    const geoResp = await fetch(geoUrl);
    const geoData = await geoResp.json();
    if (!geoData.length || !geoData[0].lat || !geoData[0].lon) {
      return res.status(404).json({ error: `Could not determine coordinates for city: ${cityValue}` });
    }
    lat = parseFloat(geoData[0].lat);
    lon = parseFloat(geoData[0].lon);
    if (!country && geoData[0].country) {
      country = geoData[0].country;
    }
  } catch (err) {
    return res.status(500).json({ error: 'Geocoding failed' });
  }

  const tmParams = new URLSearchParams({
    apikey: apiKey,
    sort: 'date,asc',
    radius: String(DEFAULT_RADIUS),
    unit: 'km',
    size: String(DEFAULT_SIZE),
    latlong: `${lat},${lon}`,
    ...(page ? { page: String(page) } : {})
  });
  if (category && category !== 'All') tmParams.append('segmentId', SEGMENT_MAP[String(category)] || String(category));
  if (genre) tmParams.append('classificationName', String(genre));
  if (startDate) tmParams.append('startDateTime', `${startDate}T00:00:00Z`);
  if (endDate) tmParams.append('endDateTime', `${endDate}T23:59:59Z`);

  try {
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?${tmParams.toString()}`;
    const tmResp = await fetch(url);
    const rawText = await tmResp.text();
    let  any;
    try {
      data = JSON.parse(rawText);
    } catch (err) {
      return res.status(502).json({ error: 'Invalid JSON from Ticketmaster' });
    }

    if (!data._embedded?.events) {
      return res.status(200).json([]);
    }

    const events = data._embedded.events as TicketmasterEvent[];
    const result: GigEvent[] = events.map(evt => {
      const venueObj = evt._embedded?.venues?.[0] || {};
      const segName = evt.classifications?.[0]?.segment?.name || '';
      const cat = ['Music', 'Sports', 'Arts & Theatre'].includes(segName) ? segName : (evt.classifications?.[0]?.segment?.name || 'Other');
      return {
        date: formatDate(evt.dates?.start?.localDate || ''),
        artist: evt.name || 'Unknown Artist',
        venue: venueObj.name || '',
        city: venueObj.city?.name || cityValue,
        country: venueObj.country?.name || country,
        genres: evt.classifications?.map(c => c.genre?.name).filter(Boolean) as string[] || [],
        category: cat,
      };
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events from Ticketmaster' });
  }
}
