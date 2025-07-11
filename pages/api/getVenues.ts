import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { city, countryCode, category } = req.query;
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey || !city) {
    return res.status(400).json({ error: 'Missing API key or city' });
  }

  let lat: number | undefined;
  let lon: number | undefined;

  // 🌍 Dynamic country lookup using OpenStreetMap Nominatim
  try {
    let geoUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city as string)}&format=json&limit=1&addressdetails=1`;
    if (countryCode) {
      geoUrl += `&countrycodes=${encodeURIComponent(countryCode as string)}`;
    }

    const geoResp = await fetch(geoUrl);
    const geoData = await geoResp.json();
    if (geoData.length > 0 && geoData[0].lat && geoData[0].lon) {
      lat = parseFloat(geoData[0].lat);
      lon = parseFloat(geoData[0].lon);
    } else {
      console.error('Geocoding returned empty result for city:', city);
      return res.status(404).json({ error: 'Could not determine lat/lon for city' });
    }
  } catch (geoErr) {
    console.error('Geocoding failed:', geoErr);
    return res.status(500).json({ error: 'Geocoding failed' });
  }

  console.log(`📍 Fetching venues for latlong: ${lat},${lon} with radius 60km`);

  try {
    const url = `https://app.ticketmaster.com/discovery/v2/venues.json?apikey=${apiKey}&latlong=${lat},${lon}&radius=60&size=100`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data._embedded?.venues) {
      console.warn('No venues found in Ticketmaster response');
      return res.status(404).json({ error: 'No venues found' });
    }

    const requestedCategory = typeof category === 'string' ? category.toLowerCase() : null;

    const venueMap = new Map<string, any>();

    data._embedded.venues.forEach((v: any) => {
      const name = v.name || '';
      const lowerName = name.toLowerCase();

      if (
        lowerName === 'ticketmaster shop' ||
        lowerName === 'ticketmaster merchandise' ||
        lowerName.startsWith('live nation')
      ) {
        return;
      }

      if (requestedCategory) {
        const segmentName = v.classifications?.[0]?.segment?.name;
        if (!segmentName || segmentName.toLowerCase() !== requestedCategory) {
          return;
        }
      }

      if (!venueMap.has(name)) {
        venueMap.set(name, {
          id: v.id || null,
          name,
          address: v.address?.line1 || null,
          city: v.city?.name || null,
          country: v.country?.name || null
        });
      }
    });

    const venues = Array.from(venueMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({ venues });
  } catch (err) {
    console.error('Ticketmaster API failed:', err);
    res.status(500).json({ error: 'Failed to fetch venues from Ticketmaster' });
  }
}