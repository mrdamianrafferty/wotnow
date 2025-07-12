// src/api/fetchTicketmasterVenues.ts
import axios from 'axios';

const TICKETMASTER_API_KEY = import.meta.env.NEXT_PUBLIC_TICKETMASTER_API_KEY;

export interface Venue {
  id: string;
  name: string;
  city?: string;
  country?: string;
  address?: string;
  url?: string;
}

export async function fetchTMVenues(
  keyword: string,
  latlong: string,
  radius: number = 50,
  size: number = 10
): Promise<Venue[]> {
  const url = 'https://app.ticketmaster.com/discovery/v2/venues.json';

  try {
    const response = await axios.get(url, {
      params: {
        apikey: TICKETMASTER_API_KEY,
        keyword,
        latlong,
        radius,
        size,
      },
    });

    const venuesData = response.data?._embedded?.venues || [];

    const venues: Venue[] = venuesData.map((v: any) => ({
      id: v.id,
      name: v.name,
      city: v.city?.name,
      country: v.country?.name,
      address: v.address?.line1,
      url: v.url,
    }));

    return venues;

  } catch (error) {
    console.error('Error fetching Ticketmaster venues:', error);
    return [];
  }
}