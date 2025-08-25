# Environmental Indicators Update Frequency

## Summary

This document provides information about the update frequency of environmental indicators (AQI, pollen, UVI) in the WotNow app, along with implementation details for handling these data sources properly.

## Update Cadence

| Indicator       | Data Source / Model                | Update Frequency                                |
|-----------------|-----------------------------------|------------------------------------------------|
| AQ (Europe)     | CAMS European forecast            | Every 24 hours                                 |
| AQ (Global)     | CAMS global composition forecast  | Every 12 hours                                 |
| Pollen / UVI    | Not specified                     | Typically updated "every few hours"            |

## Implementation Details

### 1. API Response Caching

We've implemented a caching mechanism for the `/api/weather-with-pollen` endpoint with the following features:

- **Cache Duration**: 15 minutes, which balances freshness with API load reduction
- **Cache Key**: Generated from latitude and longitude coordinates
- **Cache Storage**: In-memory cache with timestamp and expiration tracking
- **Cache Bypass**: Clients can force a refresh by appending `?forceRefresh=true` to the request

### 2. User-Facing Indicators

We've enhanced the UI to provide transparency about data freshness:

- **Historical Data Warning**: When data is from a date beyond the Open-Meteo API's maximum supported date
- **Last Updated Timestamp**: Shows when the environmental data was last updated
- **Update Frequency Info**: Tooltip explaining the typical update cadence for each indicator

### 3. Fallback Mechanism

When the current date is beyond Open-Meteo's maximum supported date (2025-08-24):

- The API fetches data for the most recent available date (2025-08-24)
- The UI clearly indicates that this is historical data with a warning banner
- The timestamp of when the data was last fetched is displayed

## Best Practices

1. **Reasonable Polling**: The app should not request new environmental data more frequently than every 10-15 minutes
2. **Graceful Degradation**: When data is stale or unavailable, the UI should still function and provide a helpful message
3. **Transparency**: Users should always be informed when they're viewing historical or potentially outdated data

## API Guidance

- **Avoid Overloading**: Open-Meteo is a free service with rate limits; excessive requests may lead to IP blocking
- **Batch Requests**: When possible, request multiple variables in a single API call rather than separate calls
- **Error Handling**: Always handle API errors gracefully and provide appropriate fallbacks

## Future Improvements

- Implement a more persistent caching solution (e.g., Redis or database) for higher reliability
- Add conditional requests with ETags to further reduce API load
- Consider adding a background job to periodically refresh the cache for common locations
