# Findr Catch Log Validation System

## Overview

This document describes the complete catch logging and validation system built for WotNow's Findr fishing predictions. The system creates a feedback loop that tracks prediction accuracy by recording both prediction views (impressions) and actual fishing outcomes (catches), enabling automatic validation of the AI's fishing recommendations.

## Architecture

### Core Components

1. **Database Schema** (`supabase/migrations/20251001001_create_findr_validation_schema.sql`)
   - `findr_prediction_impressions`: Records when users view predictions
   - `findr_catch_entries`: Records actual fishing outcomes  
   - `findr_fishing_sessions`: Groups related catches and trips
   - All tables include RLS policies for user data protection

2. **API Endpoints**
   - `/api/findr/record-impression`: Tracks prediction views for validation baseline
   - `/api/findr/catch-log`: Handles catch creation and retrieval with validation linkage
   - `/api/findr/record-blank-trip`: Records unsuccessful fishing sessions

3. **React Hooks**
   - `useCatchLogger`: Handles authenticated catch submission with enrichment pipeline
   - `useImpressionTracking`: Automatically records prediction views for validation

4. **UI Components**
   - Updated `pages/findr/log.tsx` with validation questions and time picker
   - Automatic impression tracking when users view fish predictions
   - Blank trip logging dialog for unsuccessful sessions

## Key Features

### Validation Tracking
- **Automatic Impression Recording**: When users view fish predictions, the system records the species rankings, confidence scores, environmental conditions, and urgency levels
- **Catch Linking**: New catches are automatically linked to recent impressions (within 24 hours) based on location and timing
- **Advice Following Metrics**: Users indicate whether they followed Findr's bait and habitat recommendations
- **Success Rate Calculation**: Backend calculates `prediction_matched`, `used_recommended_bait`, and `used_recommended_habitat` flags

### User Experience
- **Time Picker**: Users can specify when they caught fish, not just current time
- **Validation Questions**: "Were you using Findr predictions?" with follow-up questions about advice adherence
- **Blank Trip Logging**: "No luck today?" button to record unsuccessful sessions for complete validation data
- **Optimistic Updates**: UI updates immediately while syncing to backend
- **Offline Support**: localStorage fallback when network unavailable

### Data Quality
- **Rate Limiting**: Duplicate impressions prevented within 5-minute windows
- **Environmental Snapshots**: Automatic capture of marine conditions with each record
- **Comprehensive Logging**: All operations include detailed logging for debugging and monitoring
- **Authentication Integration**: Proper Supabase auth integration with RLS policies

## API Reference

### POST /api/findr/record-impression
Records prediction views for validation baseline.

**Request Body:**
```typescript
{
  rectangle_code: string;           // ICES rectangle identifier
  prediction_date: string;          // Date of prediction (YYYY-MM-DD)
  ranked_species: RankedSpecies[];  // Species with confidence scores
  environmental_snapshot?: object;  // Marine conditions snapshot
  urgency_level: 'high' | 'medium' | 'low';
  source?: string;                  // Client identifier
}
```

**Features:**
- Duplicate prevention (5-minute window)
- Environmental condition capture
- Species ranking preservation
- Automatic user association via RLS

### GET/POST /api/findr/catch-log
Retrieves user's catch history or creates new catch entries.

**GET Query Parameters:**
- `limit`: Number of records (default: 50)
- `offset`: Pagination offset
- `species_filter`: Filter by species name
- `start_date`: Filter catches after date
- `end_date`: Filter catches before date

**POST Request Body:**
```typescript
{
  species_id: string;
  species_common_name: string;
  rectangle_code: string;
  caught_at: string;               // ISO datetime
  quantity: number;
  size_category: 'small' | 'average' | 'large' | 'mixed';
  bait_used: string;
  habitat_type?: string;
  notes?: string;
  followed_findr_advice: boolean;
  environmental_conditions?: object;
}
```

**Features:**
- Automatic impression linking
- Validation metric calculation
- Optimistic response for immediate UI updates
- Comprehensive error handling

### POST /api/findr/record-blank-trip
Records unsuccessful fishing sessions.

**Request Body:**
```typescript
{
  rectangle_code: string;
  latitude: number;
  longitude: number;
  environmental_conditions?: object;
  notes?: string;
}
```

**Features:**
- Creates catch entry with `is_blank_trip: true`
- Optional fishing session record
- Environmental condition capture
- Encouraging user feedback

## React Hook Usage

### useCatchLogger
```typescript
const { logCatch, loading, error, response } = useCatchLogger();

// Log a new catch
await logCatch({
  speciesId: 'bass-001',
  speciesCommonName: 'Sea Bass',
  rectangleCode: 'VIIIc',
  catchDate: '2024-01-15',
  catchTime: '14:30:00',
  quantity: 2,
  sizeCategory: 'average',
  baitUsed: 'ragworm',
  entryType: 'detailed',
  environmentalConditions: { sea_temp: 14.2 },
});
```

### useImpressionTracking
```typescript
const { recordPredictionView } = useImpressionTracking();

// Automatically called when users view predictions
await recordPredictionView(
  'VIIIc',                    // rectangle code
  fishMatches,                // species with confidence scores
  environmentalData,          // marine conditions
  'high'                      // urgency level
);
```

## Database Schema Details

### findr_prediction_impressions
Records when users view fishing predictions, creating the baseline for validation.

```sql
- id (uuid, primary key)
- user_id (uuid, references auth.users)
- rectangle_code (text, references ices_rectangles) 
- prediction_date (date)
- ranked_species (jsonb) -- Array of species with confidence scores
- environmental_snapshot (jsonb) -- Marine conditions at time of view
- urgency_level (text) -- 'high', 'medium', 'low'
- source (text) -- Client application identifier
- created_at (timestamptz)
```

### findr_catch_entries  
Records actual fishing outcomes with automatic validation linkage.

```sql
- id (uuid, primary key)
- user_id (uuid, references auth.users)
- species_common_name (text)
- caught_at (timestamptz) -- When fish was caught
- logged_at (timestamptz) -- When entry was created
- rectangle_code (text, references ices_rectangles)
- quantity (integer)
- size_category (text) -- 'small', 'average', 'large', 'mixed'
- bait_used (text)
- habitat_type (text)
- notes (text)
- followed_findr_advice (boolean) -- User reported following predictions
- used_recommended_bait (boolean) -- Calculated: bait matches prediction
- used_recommended_habitat (boolean) -- Calculated: habitat matches prediction  
- prediction_matched (boolean) -- Calculated: species was in top predictions
- prediction_impression_id (uuid) -- Link to related impression
- environmental_conditions (jsonb) -- Marine conditions snapshot
- is_blank_trip (boolean) -- True for unsuccessful sessions
```

### findr_fishing_sessions
Groups related catches and trips for session analysis.

```sql
- id (uuid, primary key)
- user_id (uuid, references auth.users)  
- session_date (date)
- rectangle_code (text)
- started_at (timestamptz)
- ended_at (timestamptz)
- total_catches (integer) -- Calculated from linked entries
- species_variety (integer) -- Number of different species caught
- notes (text)
```

## Validation Metrics

The system automatically calculates several validation metrics:

1. **Prediction Accuracy**: Percentage of catches that match top-ranked predictions
2. **Confidence Calibration**: How well confidence scores correlate with actual success rates  
3. **Urgency Validation**: Catch rates during different urgency levels
4. **Advice Effectiveness**: Success rates when users follow vs. ignore recommendations
5. **Environmental Correlation**: How marine conditions affect prediction accuracy

These metrics are calculated in real-time as catches are logged and can be queried for validation dashboards.

## Implementation Details

### Authentication
- Uses Supabase Auth with RLS policies
- Hooks automatically retrieve session tokens
- Graceful degradation when unauthenticated (localStorage fallback)
- All API endpoints verify authentication before data operations

### Error Handling
- Comprehensive try-catch blocks with user-friendly messages
- Automatic fallback to localStorage when API calls fail
- Detailed logging for debugging and monitoring
- Optimistic updates for better perceived performance

### Performance Optimizations
- Impression rate limiting prevents duplicate records
- Automatic pagination in catch history retrieval
- Index on frequently queried columns (user_id, rectangle_code, caught_at)
- JSONB for flexible environmental data storage

### Mobile Considerations
- Responsive UI design with touch-friendly controls
- Offline support with localStorage synchronization
- Optimistic updates for immediate feedback
- Minimal network requests with batched operations

## Future Enhancements

1. **Photo Storage**: Integrate Supabase Storage for catch photos
2. **Real-time Sync**: WebSocket connections for live data updates
3. **Advanced Analytics**: Machine learning models for prediction improvement
4. **Social Features**: Share catches and compete with other anglers
5. **Weather Integration**: Automatic environmental data enrichment
6. **Export Tools**: PDF reports and data export functionality

## Monitoring and Analytics

The system includes comprehensive logging for:
- API endpoint performance and error rates
- User engagement with validation questions
- Prediction accuracy trends over time
- Environmental condition correlations
- Geographic usage patterns

All logs include request IDs for debugging and can be integrated with monitoring services like Sentry or LogRocket.

## Getting Started

1. **Database Setup**: Run the migration to create validation tables
2. **Environment Variables**: Ensure Supabase credentials are configured
3. **Authentication**: Set up user accounts or guest mode
4. **Seed Data**: Run seed scripts to populate test impressions and catches
5. **UI Integration**: Import hooks and components into your application

The system is designed to work alongside existing fishing prediction APIs and can be gradually integrated into production applications.
