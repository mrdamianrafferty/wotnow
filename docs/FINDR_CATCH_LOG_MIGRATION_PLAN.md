# Findr Catch Log Migration Plan (Validation-Focused Revision)

## Current state snapshot
The UI renders a three-tab catch log experience with mock fish matches and marine signals persisted in localStorage. All data comes from hard-coded mock objects without Supabase persistence. Users lose history on device reset and there is no cross-device synchronization. Most importantly, there is no connection between displayed predictions and logged catches, which prevents any validation of the prediction engine's accuracy.

## Target architecture goals

The primary goal of this migration is to build a validation system that measures whether Findr's predictions actually help users catch fish. Every architectural decision should support this validation objective. Secondary goals include providing users with a personal fishing journal, enabling future community features, and contributing to fisheries science through aggregated data.

The validation architecture requires two parallel data streams that get linked together. The first stream captures prediction impressions whenever users view predictions, recording what the system recommended. The second stream captures catch outcomes when users log what they actually caught. By linking these streams, we can measure prediction accuracy, calibrate confidence scores, validate urgency triggers, and refine species-specific advice based on empirical outcomes.

Supporting systems include live marine conditions from the existing Findr pipeline, species metadata from the ICES and DATRAS integration, and fallback datasets that keep the UI functional when external services are unavailable. All data storage uses Supabase with row-level security, authenticated API routes, and caching strategies similar to the existing predictions endpoint.

## Migration phases

### Phase 1: Foundational schema with validation infrastructure

This phase establishes the database tables that form the core of the validation system. Both prediction impressions and catch entries must be created together because they function as a pair. Without impressions, catch data provides no validation. Without catches, impressions are just unused snapshots. The relationship between these tables is the foundation that enables all subsequent validation analysis.

**Create `findr_prediction_impressions` table:**
- `id uuid primary key default uuid_generate_v4()`
- `user_id uuid references auth.users not null`
- `rectangle_code text references findr_rectangles not null`
- `viewed_at timestamptz not null default now()`
- `prediction_date date not null` (the date predictions were for, might be future)
- `ranked_species jsonb not null` (array of objects with species_id, rank, confidence_pct, urgency_level)
- `environmental_snapshot jsonb` (sea_temp, tide_phase, wind_speed, etc. at viewing time)
- `urgency_level text` (high, medium, low - overall urgency for this rectangle/time)
- `source text` (which API version generated these predictions)
- `created_at timestamptz default now()`

The ranked species JSON should store the complete prediction state with a structure like: `[{"species_id": "DICL", "species_name": "Sea Bass", "rank": 1, "confidence": 92, "urgency": "high"}, ...]`. This structure makes validation queries straightforward because you can check whether a caught species appears in this array and at what rank.

**Create `findr_catch_entries` table:**
- `id uuid primary key default uuid_generate_v4()`
- `user_id uuid references auth.users not null`
- `species_id text not null` (matches lib/findr/species catalogue)
- `species_common_name text`
- `scientific_name text`
- `rectangle_code text references findr_rectangles not null`
- `prediction_impression_id uuid references findr_prediction_impressions` (nullable - links to prediction if user was using Findr)
- `caught_at timestamptz not null` (actual time of catch, different from created_at)
- `logged_at timestamptz not null default now()` (when user logged it)
- `quantity integer default 1`
- `size_category text` (small, average, large, mixed)
- `weight_kg numeric`
- `length_cm numeric`
- `bait_used text`
- `method text` (shore, boat, kayak)
- `habitat_type text` (rocky_shore, sandy_beach, pier_harbor, etc.)
- `depth_range text` (shallow_water, deep_water, etc.)
- `notes text`
- `photo_urls text[]`
- `followed_findr_advice boolean` (did user deliberately act on predictions)
- `used_recommended_bait boolean` (calculated by comparing bait_used to species advice)
- `used_recommended_habitat boolean` (calculated by comparing habitat to species preferences)
- `is_blank_trip boolean default false` (true for unsuccessful fishing sessions)
- `environmental_conditions jsonb` (captured from findr_conditions_snapshots at catch time)
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

**Create `findr_fishing_sessions` table** (optional but recommended for better session tracking):
- `id uuid primary key default uuid_generate_v4()`
- `user_id uuid references auth.users not null`
- `rectangle_code text references findr_rectangles not null`
- `prediction_impression_id uuid references findr_prediction_impressions` (nullable)
- `started_at timestamptz not null`
- `ended_at timestamptz`
- `target_species_ids text[]` (what user was trying to catch)
- `outcome text` (successful, blank, conditions_poor, etc.)
- `notes text`
- `created_at timestamptz default now()`

Catches can optionally reference a session via `session_id uuid references findr_fishing_sessions`. This allows multiple catches from one trip to be grouped together and enables calculating catch-per-unit-effort metrics.

**Indexes for performance:**
- `findr_prediction_impressions`: composite on `(user_id, viewed_at desc)` for user timeline, composite on `(rectangle_code, viewed_at desc)` for location-based queries, single on `viewed_at` for cleanup jobs
- `findr_catch_entries`: composite on `(user_id, caught_at desc)` for user timeline, composite on `(rectangle_code, caught_at desc)` for location analysis, composite on `(species_id, caught_at desc)` for species analysis, single on `prediction_impression_id` for validation joins, composite on `(user_id, species_id)` for personal species stats

**Row-level security policies:**
Both tables get identical RLS policies. Users can select, insert, and update rows where `auth.uid() equals user_id`. Delete policies are more restrictive since we want to preserve validation data even if users want to hide catches from their personal view. Consider soft deletes with a `deleted_at timestamptz` column instead of allowing hard deletes.

**Seed script for development:**
Create `scripts/seedFindrCatchValidation.ts` that generates realistic impression and catch data for demo accounts. The script should create impressions first, then create catches that link to some of those impressions, creating both matches where the caught species was predicted and mismatches where it wasn't. This synthetic data lets you test validation queries immediately without waiting for real users.

### Phase 2: Impression tracking implementation

Before users can log catches that validate predictions, the system needs to start recording what predictions users actually see. This phase instruments your existing prediction display pages to automatically capture impressions, creating the historical context that catches will link back to.

**Create API route `pages/api/findr/record-impression.ts`:**

This endpoint accepts POST requests with the current prediction state and creates impression records. The route receives the rectangle code, prediction date, array of ranked species with scores, environmental conditions, and urgency level. It validates the user is authenticated, checks the rectangle exists in your reference tables, and inserts the impression record into Supabase.

The route should be called automatically by your prediction display hook rather than requiring explicit user action. When `useFishingPredictions` successfully fetches predictions, it makes a secondary non-blocking call to record the impression. If impression recording fails, it logs a warning but doesn't interrupt the user experience because impression tracking is telemetry rather than critical functionality.

**Modify `hooks/useFishingPredictions.ts`:**

After successfully fetching and processing predictions, add impression recording. The hook already has the rectangle code, prediction date, ranked species, and language context. It needs to package this data and POST to the record-impression endpoint. Wrap this call in a try-catch that logs failures without throwing errors to the UI layer.

Consider rate-limiting impression recording to avoid creating duplicate impressions when users refresh predictions rapidly. Use a debounce mechanism where impressions are only recorded if at least five minutes have passed since the last impression for this user and rectangle combination. This prevents pollution of the impression table while ensuring you capture distinct prediction viewing sessions.

**Modify `pages/findr/index.tsx` (prediction deck display):**

The prediction deck page already uses the `useFishingPredictions` hook, so impression tracking happens automatically once the hook is updated. However, you should add user-visible acknowledgment that predictions are being tracked for validation purposes. A small text indicator near the settings controls could say "Prediction tracking enabled - help us improve accuracy by logging your catches" with a link to documentation explaining how validation works.

This transparency serves two purposes. It builds trust by showing users their interactions contribute to system improvement. It also primes users to think about logging catches after fishing trips, increasing the likelihood they'll complete the validation loop by actually reporting outcomes.

**Background cleanup job:**

Impression records accumulate indefinitely but become less useful over time for validation purposes. Create a database function or scheduled job that archives impressions older than six months. The archived impressions move to a separate table for long-term analysis while keeping the active impression table performant for recent validation queries. Alternatively, simply delete impressions older than one year after extracting any aggregate statistics you want to preserve.

### Phase 3: Enhanced catch logging with automatic prediction linking

This phase upgrades your existing catch log UI to persist data in Supabase and automatically connects catches back to the predictions that preceded them. The linkage happens behind the scenes based on temporal and spatial correlation, requiring no additional user input beyond what your current UI already collects.

**Create API route `pages/api/findr/catch-log.ts`:**

This route handles both GET requests for retrieving catch history and POST requests for creating new catch entries. The POST handler accepts the catch details from your logging form, validates required fields, queries for recent prediction impressions to establish linkage, and inserts the catch record with all contextual enrichment.

The impression linkage logic searches for impressions from this user in the same rectangle within the past twenty-four hours, ordered by recency. The first match becomes the linked impression. If multiple impressions exist, the most recent one is most likely to represent the fishing trip that produced this catch. If no matching impression exists within the time window, the prediction_impression_id remains null, indicating this catch occurred independently of viewing Findr predictions.

The route should also calculate derived validation fields. Compare the bait_used against the species CSV advice to set used_recommended_bait. Compare habitat_type against species habitat preferences to set used_recommended_habitat. Capture current environmental conditions from the findr_conditions_latest view and store them in the environmental_conditions JSON field. These enrichments happen server-side to ensure consistency.

**Create API route `pages/api/findr/record-blank-trip.ts`:**

This specialized endpoint handles unsuccessful fishing sessions. It creates either a fishing_sessions record or a catch_entry record with is_blank_trip set to true, depending on which schema approach you choose. The route accepts minimal data since users won't want to provide much detail about unsuccessful trips: target species, time fished, brief notes about why they think it didn't work.

Like catch logging, this route queries for recent impressions to link the blank trip back to predictions if the user was following Findr advice. Blank trips linked to predictions are especially valuable for validation because they indicate prediction failures or edge cases where conditions looked good but fish weren't caught.

**Modify `hooks/useFishingPredictions.ts` to add `useLogCatch`:**

Create a new hook that wraps the catch logging API with optimistic updates and error handling. The hook accepts catch details, immediately adds the catch to local state for instant UI feedback, POSTs to the API, and reconciles when the server responds. If the server request fails, it shows an error message and reverts the optimistic update while preserving the catch data in localStorage as a backup that can be retried later.

The hook should return loading states, error states, and a submit function that the UI can call. This pattern matches your existing `useFavouriteInsights` and `useFindrConditions` hooks, maintaining consistency across the codebase.

**Update `pages/findr/log.tsx` to use Supabase storage:**

Your existing catch log page already has excellent UI with the logging modal and fish match display. The main change needed is connecting it to the new useLogCatch hook instead of localStorage. When users submit the catch form, call the hook's submit function with the form data. When users view their history, call the hook's fetch function to retrieve catches from Supabase with fallback to localStorage if the API is unavailable.

Add time-of-catch capture to your existing form. You can implement this as a simple time picker that defaults to "now" or as preset buttons for time-of-day periods. Most users won't remember exact times for catches logged hours later, so period buttons like "Dawn (5-7am)", "Morning (7-11am)", "Midday (11-2pm)", "Afternoon (2-6pm)", "Evening (6-9pm)", "Night (9pm+)" provide sufficient temporal resolution while being easy to use.

Add the question "Were you using Findr predictions for this trip?" to your form with simple Yes/No buttons. This populates the followed_findr_advice field and provides subjective validation data about whether users were deliberately acting on your recommendations versus fishing independently.

**Update the "Find fish" tab to support blank trip logging:**

Add two prominent action buttons above the fish match cards. The first button "Log a catch" opens your existing detailed catch modal without pre-selecting a species. The second button "Log unsuccessful trip" opens a simplified modal with just target species, time period, and brief notes. The simplified modal should show encouraging messaging that frames blanks as valuable contribution to improving predictions rather than personal failure.

When users submit an unsuccessful trip, show a supportive toast message: "Thanks for logging this session. Data from challenging conditions helps us improve predictions for everyone." This positive reinforcement encourages continued reporting even when fishing doesn't go well.

The existing "Caught this" buttons on individual species cards remain as convenient shortcuts. When someone taps "Caught this" on the sea bass card, it pre-fills species in the logging modal, saving them a selection step. These shortcuts handle the common case where predictions matched reality, while the global "Log a catch" button handles cases where users caught something unexpected.

### Phase 4: Validation queries and dashboards

This phase builds the analytical infrastructure that transforms raw catch and impression data into actionable validation metrics. These queries measure prediction accuracy from multiple angles, identify which components of your system are working well versus needing improvement, and surface insights that drive product decisions.

**Create database view `findr_prediction_accuracy_by_species`:**

This materialized view calculates accuracy metrics for each species across all users. The query joins catch entries to prediction impressions, extracts whether each caught species appeared in the ranked_species array, and aggregates statistics. For each species, calculate total catches, catches where species was in top five predictions, catches where species was top prediction, average rank when species was predicted, average confidence score when caught, and percentage of prediction impressions that resulted in catches.

Refresh this view daily via a scheduled job since the underlying data changes continuously. The view provides a quick lookup table that your validation dashboard can query without expensive joins on every page load.

**Create database view `findr_urgency_validation`:**

This view measures whether urgency flags correlate with increased catch success. Group prediction impressions by urgency level (high, medium, low) and join to catch entries, calculating catch rate for each urgency category. The query should show what percentage of high-urgency impressions resulted in catches within six hours versus what percentage of low-urgency impressions resulted in catches.

If urgency is working correctly, high-urgency windows should show meaningfully higher catch rates than low-urgency windows. This view quantifies the urgency lift and validates whether your urgency triggers are calibrated correctly.

**Create database view `findr_confidence_calibration`:**

This view tests whether confidence scores accurately reflect catch probability. Group catches by confidence bands (ninety-plus percent, eighty to ninety percent, seventy to eighty percent, etc.) and calculate actual catch rates for each band. If ninety percent confidence predicts ninety percent catch rate and eighty percent confidence predicts eighty percent catch rate, your confidence scores are well calibrated.

Most prediction systems show overconfident or underconfident bias where stated confidence doesn't match empirical outcomes. This view reveals the bias direction and magnitude, allowing you to recalibrate your confidence calculations with correction factors.

**Create database view `findr_advice_effectiveness`:**

This view measures whether specific pieces of advice correlate with successful catches. For catches where recommended baits were used, calculate success metrics versus catches using non-recommended baits. For catches at recommended times, calculate success versus catches at non-recommended times. For catches in recommended habitats, calculate success versus other habitats.

The challenge is defining "success" appropriately. You might measure it as catch quantity (users caught more fish when following advice), catch size (users caught larger fish when following advice), or catch probability (users more frequently caught target species when following advice). Experiment with different success metrics to see which tells the clearest story.

**Create admin dashboard page `pages/admin/validation-dashboard.tsx`:**

This protected page (requiring admin authentication) displays all validation metrics in a single view. Show prediction accuracy by species with charts highlighting which species predictions work best. Show urgency validation with time-series graphs of catch rates during different urgency levels. Show confidence calibration with actual versus predicted success rates. Show advice effectiveness broken down by advice type.

The dashboard should update automatically as new data arrives, giving you a real-time view of system performance. Add filters for date ranges, rectangles, and user cohorts so you can slice the data to investigate specific patterns or anomalies.

**Add user-visible validation metrics:**

Select key validation statistics to display publicly as social proof that your predictions work. On your main prediction deck page, add a credibility indicator showing aggregate accuracy: "Predictions validated by 1,247 catches logged by users. Overall accuracy: 79%". On individual species cards, show species-specific validation: "Sea bass predictions validated by 156 catches (82% accuracy)".

These metrics build trust by demonstrating empirical validation rather than just claiming your system works. Users who see concrete evidence that following advice produces results are more likely to trust predictions, log catches, and recommend the app to friends. This creates a positive feedback loop where validation metrics improve engagement which produces more validation data which builds more trust.

### Phase 5: Historical analysis and continuous improvement

This phase establishes the ongoing processes that use validation data to improve predictions over time. Unlike previous phases that build infrastructure, this phase creates the operational rhythm of reviewing metrics, identifying problems, adjusting algorithms, and measuring whether changes improve accuracy.

**Weekly validation review process:**

Schedule a weekly review where you examine validation metrics from the dashboard and identify patterns. Look for species where prediction accuracy is declining, rectangles where urgency triggers aren't producing expected lift, advice elements that don't correlate with success, and confidence bands that are systematically miscalibrated.

For each issue identified, create a hypothesis about the root cause. Maybe mackerel predictions are declining because their migratory patterns changed this season. Maybe urgency isn't working in shallow rectangles because tidal influence is less important there. Maybe your recommended baits for whiting are outdated. Document these hypotheses along with specific metrics that would validate whether proposed fixes work.

**Algorithm adjustment pipeline:**

When you identify needed improvements, create a systematic process for testing changes before deploying them. Extract the last three months of catch and impression data as a historical dataset. Modify your prediction algorithm with proposed improvements and run it against the historical data to see if it would have produced better accuracy. This retrospective testing validates improvements before shipping them to users.

For example, if you think adjusting temperature sensitivity for mackerel would improve accuracy, modify those parameters and recalculate what predictions would have been for all historical impressions. Compare how many historical mackerel catches would have been correctly predicted with the new parameters versus the old parameters. If accuracy improves in historical testing, deploy the change and monitor whether real-world accuracy improves over the next month.

**A/B testing framework for prediction improvements:**

For more significant algorithm changes where historical testing isn't sufficient, implement A/B testing where a percentage of users receive predictions from the new algorithm while others receive predictions from the current algorithm. Track validation metrics separately for each cohort and measure whether the new algorithm produces statistically significant improvement.

The A/B testing infrastructure requires modifying your prediction RPC function to accept an algorithm version parameter and maintaining multiple prediction models in parallel. This is complex but becomes essential once your user base grows large enough that algorithm changes could have significant impact.

**Seasonal pattern analysis:**

As validation data accumulates across multiple seasons, analyze how prediction accuracy varies by time of year. Some species predictions might work well in summer but poorly in winter due to migration patterns your model doesn't capture. Some rectangles might show strong seasonal differences in productivity that should influence confidence scores.

Create quarterly reports that analyze seasonal patterns in validation metrics and identify seasonal adjustments needed. These insights feed back into your algorithm as seasonal modifiers that adjust predictions based on time of year, improving accuracy for the next year's cycle.

**User feedback integration:**

Validation metrics show whether predictions work but don't always explain why they fail. User feedback from catch log notes and direct support inquiries often reveals issues that metrics alone wouldn't surface. Create a process for regularly reviewing user feedback about predictions, categorizing common complaints or confusions, and correlating feedback themes with validation metrics to identify root causes.

For example, if multiple users note catches that don't match predictions and you also see accuracy declining in those rectangles, investigation might reveal a data quality issue with your marine conditions ingestion for that area. The combination of quantitative validation metrics and qualitative user feedback creates a complete picture of system performance.

## Revised observability and rollout strategy

Your Phase 5 from the original plan covers observability but needs enhancement to account for the validation infrastructure. Monitoring needs to cover not just whether the system is running but whether it's producing accurate predictions.

**Add validation-specific monitoring:**

Create alerts that trigger when validation metrics fall outside expected ranges. If overall prediction accuracy drops below seventy percent, alert immediately since this indicates a systemic problem. If catch logging stops entirely, alert since this means validation data stopped flowing. If impression-to-catch linkage rate drops below fifty percent, alert since this suggests the linkage logic is failing.

Set up weekly automated reports that email validation statistics showing trends over time. These reports should highlight improvements and degradations, making it easy to spot when changes to your prediction algorithm or data pipeline affected validation metrics.

**Feature flag both impression and catch logging:**

Gate both new systems behind environment toggles so you can pilot with internal testers before public launch. Start with a small group of trusted users who understand they're helping validate the system. These early adopters provide high-quality feedback about UI friction and data accuracy issues before you expose the features to your full user base.

Monitor the early adopter cohort closely to ensure linkage between impressions and catches works correctly and validation metrics are calculated as expected. Fix any issues discovered during the pilot before expanding access.

**Progressive rollout plan:**

After validating with early adopters, roll out in stages. First enable impression tracking for all users but keep catch logging restricted to pilot users. This builds up a large corpus of impression data. Then gradually expand catch logging access to larger user segments while monitoring validation metrics at each stage. If accuracy metrics look good with the expanded cohort, continue expanding. If metrics degrade, pause to investigate before expanding further.

**Documentation updates:**

Create a comprehensive validation documentation page at `/findr/info` or similar that explains to users how validation works, why their catch logs matter for improving predictions, what privacy protections are in place, and how validation data contributes to fisheries science. Transparency about how the system works builds trust and increases engagement.

Update your technical documentation (the Findr Supabase reference) with detailed schema diagrams showing the relationships between impressions, catches, conditions, and rectangles. Document the validation queries with explanations of what metrics they calculate and how to interpret results. Create operational runbooks that explain how to investigate validation issues when alerts trigger.

## Addressing the original open questions

**Photo storage decision:** Start with Supabase Storage since it's simpler and you're already using Supabase for everything else. Create a bucket called findr-catch-photos with public read access but authenticated write access. Implement basic size limits (ten megabytes per photo, maximum three photos per catch) and content type validation. Defer CDN considerations until you see significant storage costs or performance issues. Photos are nice-to-have for personal logging but not critical for validation, so keep the initial implementation minimal.

**Anonymization for aggregated insights:** Your validation metrics work on aggregated data by design and contain no personally identifiable information. When showing community features like "forty-eight sea bass catches in rectangle VIIIc this month," you're not revealing who caught them or precise locations. The privacy architecture discussed earlier with generalized locations, time delays, and graduated sharing controls applies when you eventually build features that show individual catches publicly. For pure validation statistics that appear on prediction cards and dashboards, aggregation itself provides sufficient anonymization.

**Data validation for species and rectangle mismatches:** Implement server-side validation that checks caught species against the ICES species presence data for that rectangle and season. If someone logs a tropical species in a subarctic rectangle, flag it for review since it's likely a data entry error. Create an admin queue where flagged catches can be reviewed and corrected or confirmed if they represent unusual but genuine catches. Over time, this quality control improves the overall dataset reliability.

**Bait recommendations alignment:** Your catch log already captures which baits users actually use through the bait selection interface. The validation queries can directly measure whether catches using CSV-recommended baits are more successful than catches using other baits. This empirical validation is more reliable than trying to keep recommendation systems synchronized. If your catch data shows certain baits work better than your CSV advice suggests, update the CSV advice based on the empirical evidence from your validation data. Let real outcomes drive your recommendations rather than the reverse.

## Implementation timeline and priorities

The immediate first step is implementing Phase 1 schema changes and Phase 2 impression tracking. These can ship quickly since they don't require UI changes beyond the automatic impression recording that happens behind the scenes. Start capturing impression data immediately because every day of delay is lost validation opportunity.

The second priority is Phase 3 catch logging enhancements. The UI already exists in draft form, so this is primarily about connecting it to Supabase and adding the time picker and advice-following questions. This should take a few weeks to implement properly with testing.

The third priority is Phase 4 validation queries. You can build these incrementally as catch data starts flowing in, starting with simple accuracy queries and gradually adding more sophisticated analysis. Even basic queries like "what percentage of catches matched top five predictions" provide immediate value.

Phase 5 continuous improvement processes can develop organically as you accumulate data and learn what insights are most valuable. The weekly review cadence and algorithm adjustment pipeline are operational habits that emerge over time rather than features that get built all at once.

The entire migration from current mock-data state to fully functional validation system should be achievable in eight to twelve weeks assuming this is your primary focus. The payoff is a system that not only helps users catch fish but continuously proves it's working and gets smarter over time through the validation feedback loop.
