# WotNow - Activity Recommendation PWA

**ALWAYS** reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

WotNow is a Next.js React Progressive Web App that provides intelligent weather-based activity recommendations. The system combines real-time weather data, astronomical calculations, pollen information, and activity scoring to suggest optimal outdoor and indoor activities based on current and forecasted conditions.

## Working Effectively

### Initial Setup and Dependencies
- **Node.js Installation**: Required for Next.js development. The application uses Next.js 15.5.2 with React 18.3.1.
- **Dependencies Installation**: 
  ```bash
  npm install
  ```
  Takes approximately 25 seconds. Installs 716 packages including Next.js, React, TypeScript, Tailwind CSS, Jest, and mapping libraries.

- **Additional Type Definitions**: 
  ```bash
  npm install --save-dev @types/leaflet
  ```
  Required for Leaflet map components to compile without TypeScript errors.

### Build and Development Commands

- **Development Server**:
  ```bash
  npm run dev
  ```
  Starts development server on `http://localhost:3000`. Ready in ~1-2 seconds after dependencies are installed.

- **Production Build**:
  ```bash
  npm run build
  ```
  **NEVER CANCEL**: Build takes 2-3 minutes to complete. Set timeout to 5+ minutes.
  Creates optimized production build with static page generation and image optimization.

- **Production Server**:
  ```bash
  npm run start
  ```
  Starts production server on `http://localhost:3000` using the built assets.

- **Test Suite**:
  ```bash
  npm run test
  ```
  Runs Jest test suite. Takes ~1 second. Currently includes weatherService tests for API integration.

- **Astronomy Service**:
  ```bash
  npm run astro:canaries
  ```
  **NEVER CANCEL**: Takes ~23 seconds to process 31 global locations. Set timeout to 60+ seconds.
  Generates astronomy highlights for representative locations worldwide.

### Build Environment Considerations

- **Google Fonts Access Issue**: In environments with restricted network access, Google Fonts may fail to load during build. The codebase includes a workaround in `app/fonts.ts` that falls back to serif fonts when Google Fonts cannot be accessed.

- **TypeScript Strict Mode**: The codebase uses TypeScript in strict mode. All implicit `any` types must be explicitly typed or cast.

- **Environment Variables**: Uses Next.js environment variables:
  - `NEXT_PUBLIC_OPENWEATHER_KEY`: OpenWeather API key
  - `STORMGLASS_SECRET_KEY`: Stormglass marine data API key  
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Google Maps API key

## Validation and Testing

### ALWAYS Run Complete Validation After Changes
After making any code changes, **ALWAYS** run this complete validation sequence:

1. **Build Validation**:
   ```bash
   npm run build
   ```
   **NEVER CANCEL**: Set timeout to 5+ minutes. Build must complete successfully.

2. **Test Suite**:
   ```bash
   npm run test
   ```
   All tests must pass.

3. **Development Server Test**:
   ```bash
   npm run dev
   ```
   Start dev server and verify it loads on `http://localhost:3000`.

4. **Manual Functionality Validation**:
   - **Home Page**: Verify the main activity recommendation interface loads
   - **Location Selection**: Test both home and coastal location dialogs
   - **Activity Cards**: Verify activity cards display with proper weather data
   - **Interests Page**: Test activity interest selection functionality
   - **Weather Page**: Verify marine data and tide information display
   - **Astronomy Integration**: If stargazing is selected, verify astronomy card appears

### Manual Testing Scenarios
Execute these scenarios after making changes to ensure functionality:

- **Location Setup Flow**: Set home location → Select interests → View activity recommendations
- **Activity Evaluation**: Check that activities show proper scoring (perfect, good, fair, poor)
- **Responsive Design**: Test mobile breakpoint behavior at 800px width
- **Pollen Integration**: Verify pollen warnings appear for relevant outdoor activities
- **Marine Data**: For coastal locations, verify tide and marine condition data

## Python Astronomy Service

### Setup Requirements
The astronomy service requires Python 3.11+ with specific dependencies:

```bash
cd services/astro_highlights/astro_highlights
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -e .
```

### Running Astronomy Service
```bash
# Via npm script (recommended)
npm run astro:canaries

# Or directly
cd services/astro_highlights/astro_highlights
.venv/bin/python run_canaries.py
```

**NEVER CANCEL**: Takes ~23 seconds to process all 31 global canary locations. Set timeout to 60+ seconds.

### Outputs
- Individual location files: `services/astro_highlights/out/highlights_{region}_{location}.json`
- Master manifest: `services/astro_highlights/out/index_canaries.json`

## Key Architecture Components

### Core Technologies
- **Next.js 15.5.2**: React framework with SSG and API routes
- **TypeScript**: Strict mode enabled for type safety
- **Tailwind CSS**: Utility-first CSS framework
- **Jest**: Testing framework with React Testing Library
- **Leaflet**: Interactive mapping functionality
- **Python/Skyfield**: Astronomy calculations and predictions

### Important Directories
- `/pages`: Next.js pages and API routes
- `/components`: React components including activity cards, popups, dialogs
- `/data`: Activity definitions, moon lore, activity messages
- `/utils`: Utility functions for weather scoring, activity evaluation
- `/services`: Backend services including astronomy calculations
- `/lib`: Shared libraries and hooks
- `/types`: TypeScript type definitions

### Key Files to Know
- `data/activityTypes.ts`: Defines all supported activities with weather criteria
- `data/activityMessages.ts`: Activity-specific messaging and category system
- `utils/getSuggestionsByDay.ts`: Core activity scoring and recommendation engine
- `utils/buildReasons.ts`: Builds explanatory text for activity recommendations
- `pages/index.tsx`: Main homepage with activity recommendations
- `pages/activities.tsx`: Activity browsing and selection interface
- `components/Card.tsx`: Individual activity card component
- `components/Popup.tsx`: Detailed activity view with weather breakdown

### Activity Recommendation System
The core recommendation engine evaluates activities based on:
- **Weather Conditions**: Temperature, precipitation, wind, visibility
- **Seasonal Appropriateness**: Monthly activity calendars
- **User Interests**: Selected activity preferences
- **Location Context**: Home vs coastal location differences
- **Time Context**: Current conditions vs forecast
- **Additional Factors**: Pollen levels, air quality, astronomical events

### API Integration Points
- **OpenWeather**: Current conditions and 5-day forecasts
- **Stormglass**: Marine data including waves, tides, wind
- **Custom Astronomy**: ISS visibility, moon phases, planetary events
- **Pollen Data**: Integrated into activity scoring for outdoor activities

## Common Development Tasks

### Adding New Activities
1. Add activity definition to `data/activityTypes.ts`
2. Add weather scoring criteria (poorConditions, goodConditions, etc.)
3. Optionally add specific messaging in `data/activityMessages.ts`
4. Test activity appears in recommendations and scores correctly

### Modifying Weather Scoring
1. Update criteria in `data/activityTypes.ts` for the specific activity
2. Test scoring changes with various weather conditions
3. Verify activity moves between perfect/good/fair/poor categories appropriately

### UI Component Changes
1. Make changes to components in `/components` directory
2. Test responsive behavior at mobile breakpoint (800px)
3. Verify both popup and card views if modifying activity display
4. Run through manual validation scenarios

### Adding New Location Features
1. Consider impact on both home and coastal location functionality
2. Update location selection dialogs if needed
3. Test marine data integration for coastal features
4. Verify mobile location detection works properly

## Error Prevention

### TypeScript Issues
- Always add explicit types for function parameters in strict mode
- Use type assertions `as any` only when necessary for gradual migration
- Import type definitions for external libraries (e.g., `@types/leaflet`)

### Build Failures
- Google Fonts issues: Check `app/fonts.ts` for proper fallback configuration
- Missing exports: Verify all imported functions/types are properly exported
- Circular imports: Avoid importing a module from itself

### Runtime Issues
- Environment variables: Ensure all required API keys are present in `.env`
- Network dependencies: Consider offline behavior and API rate limits
- Mobile compatibility: Test touch interactions and responsive layouts

## CI/CD Pipeline

### GitHub Actions
- **Astronomy Canaries**: `.github/workflows/astro_canaries.yml` runs nightly at 02:00 UTC
- **Manual Trigger**: Workflow dispatch available for on-demand astronomy builds
- **Artifact Storage**: Generated astronomy highlights stored for 30 days

### Local CI Simulation
To simulate CI environment locally:
```bash
npm install
npm run build
npm run test
npm run astro:canaries
```

All commands must complete successfully with proper timeout settings.

## Performance Considerations

### Image Optimization
- Next.js automatic image optimization enabled
- WebP and AVIF format support configured
- Responsive image sizes defined in `next.config.mjs`

### Build Output
- Static page generation for optimal performance
- CSS optimization and minification
- JavaScript code splitting and optimization

### API Response Times
- Weather API calls typically <2 seconds
- Marine data calls may take 3-5 seconds
- Astronomy calculations are pre-computed to avoid runtime delays

## Debugging and Development

### Logging
- Activity scoring includes detailed console output
- Weather service calls include request/response logging
- Astronomy service provides progress indicators

### Development Tools
- React DevTools supported
- Next.js development features enabled
- Hot module reloading for rapid iteration

### Common Debug Scenarios
- Activity not appearing: Check activity type definition and seasonal months
- Wrong activity score: Review weather criteria and current conditions
- Missing marine data: Verify coastal location is properly set
- Astronomy card not showing: Ensure stargazing is in user interests

**Remember**: ALWAYS follow these instructions and validate all changes through the complete build and test cycle. Only seek additional context if these instructions are incomplete or contradictory to what you observe.