import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { city, countryCode, category } = req.query;
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey || !city) {
    return res.status(400).json({ error: 'Missing API key or city' });
  }

  let lat: number | undefined;
  let lon: number | undefined;

  // 🌍 Geocode city
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
      return res.status(404).json({ error: 'Could not determine lat/lon for city' });
    }
  } catch {
    return res.status(500).json({ error: 'Geocoding failed' });
  }

  console.log(`📍 Fetching venues for latlong: ${lat},${lon} with radius 60km`);

  try {
    // Step 1: fetch all venues nearby
    const venuesUrl = `https://app.ticketmaster.com/discovery/v2/venues.json?apikey=${apiKey}&latlong=${lat},${lon}&radius=60&size=100`;
    const venuesResp = await fetch(venuesUrl);
    const venuesData = await venuesResp.json();

    if (!venuesData._embedded?.venues) {
      return res.status(404).json({ error: 'No venues found' });
    }

    let allVenues = venuesData._embedded.venues
      .filter((v: any) => {
        const lowerName = (v.name || '').toLowerCase();
        return lowerName !== 'ticketmaster shop' && lowerName !== 'ticketmaster merchandise' && !lowerName.startsWith('live nation');
      })
      .map((v: any) => ({
        id: v.id || null,
        name: v.name || '',
        address: v.address?.line1 || null,
        city: v.city?.name || null,
        country: v.country?.name || null
      }));

    // Supported categories
    const allowedCategories = ['Music', 'Sports', 'Arts & Theatre', 'All'];
    const selectedCategory = typeof category === 'string' ? category : 'All';
    if (!selectedCategory || selectedCategory === 'All') {
      const venuesSorted = allVenues.sort((a, b) => a.name.localeCompare(b.name));
      return res.status(200).json({ venues: venuesSorted });
    }
    if (!allowedCategories.includes(selectedCategory)) {
      return res.status(400).json({ error: 'Unsupported category' });
    }

    // Step 2: fetch events in selected category to find which venues host events
    const eventsUrl = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&latlong=${lat},${lon}&radius=60&classificationName=${encodeURIComponent(selectedCategory)}&size=100`;
    const eventsResp = await fetch(eventsUrl);
    const eventsData = await eventsResp.json();

    if (!eventsData._embedded?.events) {
      return res.status(404).json({ error: 'No events found in this category' });
    }

    const eventVenueIds = new Set(eventsData._embedded.events.map((e: any) => e._embedded?.venues?.[0]?.id).filter(Boolean));

    const filteredVenues = allVenues.filter(v => eventVenueIds.has(v.id));

    const venuesSorted = filteredVenues.sort((a, b) => a.name.localeCompare(b.name));
    res.status(200).json({ venues: venuesSorted });
  } catch (err) {
    console.error('Ticketmaster API failed:', err);
    res.status(500).json({ error: 'Failed to fetch venues from Ticketmaster' });
  }
}