export default async function handler(req, res) {
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

  if (city) params.append('city', city);
  params.append('countryCode', 'GB'); // Adjust as needed
  if (category) params.append('classificationName', category);

  if (venues) params.append('venueId', venues);
  if (genres) params.append('segmentName', genres);

  try {
    const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`);
    const text = await response.text();

    // Log the raw Ticketmaster response for debugging
    console.log(`🎟️ Ticketmaster response:`, text.slice(0, 500));

    // Try to parse as JSON
    let data;
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

    const events = data._embedded.events.map(evt => ({
      date: evt.dates?.start?.localDate || '',
      artist: evt.name,
      venue: evt._embedded?.venues?.[0]?.name || '',
      genres: (evt.classifications || []).map(c => c.genre?.name).filter(Boolean),
    }));

    res.status(200).json(events);
  } catch (err) {
    console.error(`❌ Error fetching events:`, err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
}