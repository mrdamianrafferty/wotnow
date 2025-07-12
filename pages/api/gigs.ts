import type { NextApiRequest, NextApiResponse } from 'next';

type GigEvent = {
  date: string;
  artist: string;
  venue: string;
  genres: string[];
};

type TicketmasterResponse = {
  _embedded?: {
    events: Array<{
      name: string;
      dates?: { start?: { localDate?: string } };
      classifications?: Array<{ genre?: { name: string } }>;
      _embedded?: { venues?: Array<{ name: string }> };
    }>;
  };
};

const musicGenres = new Set([
  'Alternative',
  'Blues',
  'Classical',
  'Country',
  'Dance',
  'Electronic',
  'Folk',
  'Hip-Hop/Rap',
  'Jazz',
  'Latin',
  'Metal',
  'Pop',
  'R&B',
  'Reggae',
  'Rock',
  'Soul',
  'World',
]);

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GigEvent[] | { error: string }>
) {
  const { city, category = '', venues = '', genres = '' } = req.query;

  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    console.error('❌ Missing Ticketmaster API key');
    return res.status(500).json({ error: 'Missing API key' });
  }

  const params = new URLSearchParams({
    apikey: apiKey,
    size: '20',
  });

  if (typeof city === 'string') params.append('city', city);
  params.append('countryCode', 'GB');
  if (typeof category === 'string') params.append('segmentId', category);

  if (typeof venues === 'string' && /^[A-Za-z0-9,]+$/.test(venues)) {
    params.append('venueId', venues);
  } else if (venues) {
    console.warn('⚠️ venues query ignored — likely names not IDs');
  }

  if (typeof genres === 'string') params.append('segmentName', genres);

  try {
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`
    );

    const text = await response.text();

    console.log(`🎟️ Ticketmaster response:`, text.slice(0, 500));

    let data: TicketmasterResponse;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error(`❌ Failed to parse Ticketmaster response as JSON`, err);
      return res.status(500).json({ error: 'Invalid response from Ticketmaster' });
    }

    if (!data._embedded?.events) {
      console.log(`⚠️ No events found for ${city}`);
      return res.status(200).json([]);
    }

    const events: GigEvent[] = data._embedded.events.map((evt) => {
      const rawGenres = (evt.classifications || [])
        .map((c) => c.genre?.name)
        .filter((name): name is string => Boolean(name));

      // Filter genres to only include music-related genres, else empty array
      const filteredGenres = rawGenres.filter((g) => musicGenres.has(g));

      return {
        date: formatDate(evt.dates?.start?.localDate || ''),
        artist: evt.name,
        venue: evt._embedded?.venues?.[0]?.name || '',
        genres: filteredGenres,
      };
    });

    res.status(200).json(events);
  } catch (err) {
    console.error(`❌ Error fetching events:`, err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
}