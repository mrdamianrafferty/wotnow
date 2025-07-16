// pages/api/eventVenues.ts
import type { NextApiRequest, NextApiResponse } from 'next';

// Type definition for returned venues
type VenueResult = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  lat?: number;
  lon?: number;
  url?: string;
};

type ApiResponse =
  | { venues: VenueResult[] }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const {
    city,
    radius = '100km',
    keywords // optional, for future use
  } = req.query;

  const token = process.env.EVENTBRITE_API_KEY;

  if (!token) {
    console.error('Missing Eventbrite API key');
    return res.status(500).json({ error: 'Server misconfigured: missing Eventbrite token' });
  }

  if (!city || typeof city !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid city parameter' });
  }

  const params = new URLSearchParams({
    'location.address': city,
    'location.within': String(radius),
    'expand': 'venue'
  });

  // Optionally filter by search keywords
  if (keywords) {
    params.set('q', String(keywords));
  }

  try {
    const apiUrl = `https://www.eventbriteapi.com/v3/venues/search/?${params.toString()}`;
    const resp = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!resp.ok) {
      const msg = await resp.text();
      console.error('Eventbrite venue API responded:', msg);
      return res.status(502).json({ error: 'Failed to fetch venues from Eventbrite' });
    }

    const json = await resp.json();

    // Map venues to normalized structure
    const venues: VenueResult[] = (json.venues || []).map((venue: any) => ({
      id: venue.id,
      name: venue.name,
      address: [
        venue.address?.address_1,
        venue.address?.address_2
      ].filter(Boolean).join(', '),
      city: venue.address?.city || '',
      country: venue.address?.country || '',
      lat: venue.address?.latitude ? parseFloat(venue.address.latitude) : undefined,
      lon: venue.address?.longitude ? parseFloat(venue.address.longitude) : undefined,
      url: venue.resource_uri // Not always present
    }));

    return res.status(200).json({ venues });
  } catch (err) {
    console.error('Venue fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
