import type { NextApiRequest, NextApiResponse } from 'next';

type VenueResult = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
};

type ApiSuccessResponse = {
  venues: VenueResult[];
};

type ApiErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiSuccessResponse | ApiErrorResponse>
) {
  const { city, countryCode, category } = req.query;
  const apiKey = process.env.TICKETMASTER_API_KEY;
  const geoKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;

  if (!apiKey || !geoKey || !city) {
    return res.status(400).json({ error: 'Missing API key, geo key, or city' });
  }

  let lat: number | undefined;
  let lon: number | undefined;
  let country: string = typeof countryCode === 'string' ? countryCode : '';

  // Geocode city
  try {
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city as string)}&limit=1&appid=${geoKey}`;
    const geoResp = await fetch(geoUrl);
    const geoData = await geoResp.json();

    if (!geoData.length || !geoData[0].lat || !geoData[0].lon) {
      return res.status(404).json({ error: `Could not geocode city: ${city}` });
    }

    lat = geoData[0].lat;
    lon = geoData[0].lon;
    if (!country && geoData[0].country) {
      country = geoData[0].country;
    }
  } catch (err) {
    console.error('Geocoding failed:', err);
    return res.status(500).json({ error: 'Geocoding failed' });
  }

  // Build Ticketmaster venue search
  const TM_RADIUS = 60;
  const TM_SIZE = 100;

  const venuesParams = new URLSearchParams({
    apikey: apiKey,
    latlong: `${lat},${lon}`,
    radius: String(TM_RADIUS),
    size: String(TM_SIZE),
  });

  if (country) venuesParams.append('countryCode', country);
  let allVenues: VenueResult[] = [];

  try {
    const venuesUrl = `https://app.ticketmaster.com/discovery/v2/venues.json?${venuesParams.toString()}`;
    const venuesRes = await fetch(venuesUrl);
    const venuesData = await venuesRes.json();

    if (venuesData._embedded?.venues?.length) {
      allVenues = venuesData._embedded.venues
        .filter((v: any) => {
          const name = (v.name || '').toLowerCase();
          return name && !name.includes('ticketmaster') && !name.startsWith('live nation');
        })
        .map((v: any) => ({
          id: v.id,
          name: v.name || '',
          address: v.address?.line1 || '',
          city: v.city?.name || '',
          country: v.country?.name || country,
        }));
    }

    // Filter event venues by category (Music, Sports, etc.)
    const allowedCategories = ['All', 'Music', 'Sports', 'Arts & Theatre'];
    const selectedCategory = typeof category === 'string' ? category : 'All';

    if (selectedCategory !== 'All' && allowedCategories.includes(selectedCategory)) {
      const eventsParams = new URLSearchParams({
        apikey: apiKey,
        latlong: `${lat},${lon}`,
        radius: String(TM_RADIUS),
        size: String(TM_SIZE),
        classificationName: selectedCategory,
      });
      if (country) eventsParams.append('countryCode', country);

      const eventsUrl = `https://app.ticketmaster.com/discovery/v2/events.json?${eventsParams.toString()}`;
      const eventsRes = await fetch(eventsUrl);
      const eventsData = await eventsRes.json();

      const eventVenueIds = new Set<string>(
        (eventsData._embedded?.events || [])
          .map((e: any) => e._embedded?.venues?.[0]?.id)
          .filter(Boolean)
      );

      allVenues = allVenues.filter(v => eventVenueIds.has(v.id));
    }

    const sortedVenues = allVenues.sort((a, b) => a.name.localeCompare(b.name));
    return res.status(200).json({ venues: sortedVenues });
  } catch (err) {
    console.error('Ticketmaster API failed:', err);
    return res.status(500).json({ error: 'Failed to fetch venues from Ticketmaster' });
  }
}
