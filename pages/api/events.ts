// pages/api/events.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type EventResult = {
  id: string;
  name: string;
  date: string;
  venue: string;
  city: string;
  url: string;
};

type ApiResponse =
  | { events: EventResult[] }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  const { city, category, format, keywords, radius } = req.query;

  const token = process.env.EVENTBRITE_API_KEY;

  if (!token) {
    console.error('❌ Missing Eventbrite API token');
    return res.status(500).json({ error: 'Server misconfigured: missing Eventbrite token.' });
  }

  if (!city || typeof city !== 'string' || !city.trim()) {
    return res.status(400).json({ error: 'Missing or invalid city parameter.' });
  }

  const params = new URLSearchParams({
    'location.address': city.trim(),
    'location.within': typeof radius === 'string' && radius.trim() !== '' ? radius : '100km',
    'expand': 'venue',
    'sort_by': 'date'
  });

  // Only append query parameters if their values are defined and non-empty
  if (
    typeof category === 'string' &&
    category.trim() !== '' &&
    category !== 'undefined'
  ) {
    params.set('categories', category.trim());
  }

  if (
    typeof format === 'string' &&
    format.trim() !== '' &&
    format !== 'undefined'
  ) {
    params.set('formats', format.trim());
  }

  if (
    typeof keywords === 'string' &&
    keywords.trim() !== ''
  ) {
    params.set('q', keywords.trim());
  }

    const apiUrl = `https://www.eventbriteapi.com/v3/events/search?${params.toString()}`;
  
    // You likely want to fetch data from Eventbrite here and return a response.
    // For now, just return the constructed URL for demonstration.
    return res.status(200).json({ events: [] });
  }
