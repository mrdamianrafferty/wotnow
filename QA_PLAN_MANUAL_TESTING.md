# QA Test Plan: Manual Testing Script
**GoDaisy & Findr Platform**

**Tester**: Senior QA (Manual Testing Lead)  
**Date**: October 18, 2025  
**Sprint**: Complete Platform Testing  
**Environment**: Staging → Production

---

## 🎯 Your Mission

You're responsible for thorough manual testing of user journeys, edge cases, and scenarios that can't be automated. Focus on UX, visual consistency, real-world workflows, and things that "feel wrong."

**Your expertise areas:**
- User experience evaluation
- Visual QA (layout, spacing, alignment)
- Cross-device real-world testing
- Business logic validation
- Exploratory testing
- Accessibility hands-on verification

---

## 📋 Test Environment Setup

### Before You Start

**Test Accounts:**
- [ ] Create test account: `qa+test1@godaisy.io`
- [ ] Create test account: `qa+test2@godaisy.io` (for multi-user scenarios)
- [ ] Create test account: `qa+premium@godaisy.io` (if premium features exist)
- [ ] Verify email magic links work
- [ ] Test password reset flow

**Test Data Setup:**
```sql
-- If you have database access, verify:
SELECT COUNT(*) FROM species WHERE is_active = true;  -- Should be 40+
SELECT COUNT(*) FROM ices_rectangles;  -- Should be 1000+
SELECT MAX(data_date) FROM copernicus_data;  -- Should be today or yesterday
```

**Devices & Browsers:**
- [ ] Desktop: Chrome (latest)
- [ ] Desktop: Firefox (latest)
- [ ] Desktop: Safari (latest)
- [ ] Mobile: iPhone (Safari)
- [ ] Mobile: Android (Chrome)
- [ ] Tablet: iPad (Safari)

**Screen Resolutions:**
- [ ] 1920x1080 (Desktop)
- [ ] 1366x768 (Laptop)
- [ ] 375x667 (iPhone SE)
- [ ] 414x896 (iPhone 11 Pro)
- [ ] 768x1024 (iPad)

---

## 🌟 Section 1: GoDaisy Platform Testing

### Test 1.1: First-Time User Onboarding (15 mins)

**Objective**: Verify smooth onboarding experience for new users

**Prerequisites:**
- Clear all cookies/localStorage
- Use incognito/private browsing
- Test on desktop first, then mobile

**Test Steps:**

| # | Action | Expected Result | Pass/Fail | Notes |
|---|--------|----------------|-----------|-------|
| 1 | Navigate to `https://godaisy.io/` | Homepage loads within 3 seconds | ⬜ | Load time: ___s |
| 2 | Check for redirect to `/onboarding` | Redirects automatically if new user | ⬜ | Redirect: Y/N |
| 3 | Observe onboarding UI | Clean, welcoming design with clear instructions | ⬜ | |
| 4 | Click location input | Search field appears, placeholder text visible | ⬜ | |
| 5 | Type "Lond" | Autocomplete suggestions appear | ⬜ | # suggestions: ___ |
| 6 | Select "London, UK" | Location selected, map marker appears (if map shown) | ⬜ | |
| 7 | Click "Next" or equivalent | Proceeds to activity selection | ⬜ | |
| 8 | Observe activity categories | All categories visible (Sports, Water, Cycling, etc.) | ⬜ | # categories: ___ |
| 9 | Expand "Water Activities" | Activities show: Surfing, Kayaking, Swimming, etc. | ⬜ | |
| 10 | Select 5 activities from different categories | Each selection shows visual feedback (checkmark/highlight) | ⬜ | |
| 11 | Try to proceed without selecting any | Validation message: "Please select at least 1 activity" | ⬜ | |
| 12 | Select 1 activity | Can proceed | ⬜ | |
| 13 | Click "Finish" or "Get Started" | Redirects to homepage `/` | ⬜ | |
| 14 | Verify homepage shows activity cards | At least 1 activity card visible | ⬜ | # cards: ___ |
| 15 | Check URL | Should be `/` not `/onboarding` | ⬜ | |

**Visual QA Checks:**
- [ ] Spacing consistent between elements
- [ ] Text readable (good contrast)
- [ ] Buttons have hover states
- [ ] Mobile: elements don't overlap
- [ ] Mobile: font sizes appropriate
- [ ] No broken images
- [ ] No layout shifts during load

**Edge Cases:**
- [ ] Try invalid location: "asdfghjkl" → No results or error message
- [ ] Try location without coordinates → Handled gracefully
- [ ] Select 50+ activities → Performance OK, no UI break
- [ ] Browser back button during onboarding → State preserved or restart gracefully

**UX Notes:**
```
[Your observations about flow, confusing elements, suggestions]





```

---

### Test 1.2: Homepage Activity Recommendations (20 mins)

**Objective**: Verify weather-based activity scoring and display

**Prerequisites:**
- Complete onboarding with 10+ activities
- Use a location with known weather (London, NYC, etc.)

**Test Steps:**

| # | Action | Expected Result | Pass/Fail | Notes |
|---|--------|----------------|-----------|-------|
| 1 | Observe homepage layout | Hero card at top, additional cards below | ⬜ | |
| 2 | Check hero card activity | Shows best activity for current weather | ⬜ | Activity: _______ |
| 3 | Verify weather indicator | Temperature, wind, rain visible | ⬜ | Temp: ___°C |
| 4 | Check activity evaluation | Badge shows: Perfect/Good/Fair/Indoor | ⬜ | Badge: _______ |
| 5 | Read reasoning text | Explains WHY activity is recommended | ⬜ | Makes sense: Y/N |
| 6 | Scroll down | See multiple activity cards | ⬜ | # cards: ___ |
| 7 | Check card categories | Grouped: Perfect, Good, Fair, Indoor | ⬜ | |
| 8 | Click "Today" tab | Shows today's recommendations | ⬜ | |
| 9 | Click "Tomorrow" tab | Shows tomorrow's recommendations, data changes | ⬜ | Data changes: Y/N |
| 10 | Change location (top-right) | Activity recommendations update | ⬜ | Update time: ___s |
| 11 | Pick coastal location | Marine activities appear (surfing, kayaking) | ⬜ | |
| 12 | Pick inland location | Marine activities disappear or marked N/A | ⬜ | |
| 13 | Check in winter | Snow sports appear (if appropriate location) | ⬜ | Season: _______ |
| 14 | Click activity card | Expands to show details | ⬜ | OR navigates to page |
| 15 | Click "Share" button | Share modal opens with options | ⬜ | |

**Scoring Validation:**

Pick 3 activities and verify scoring logic makes sense:

**Activity 1: Running**
- Current temp: ___°C
- Wind: ___ km/h
- Rain: ___ mm
- Score: ___% (Perfect/Good/Fair)
- Does score make sense? Y/N
- Reasoning text accurate? Y/N

**Activity 2: Surfing** (coastal location)
- Wave height: ___ m
- Water temp: ___°C
- Wind: ___ km/h
- Score: ___%
- Makes sense? Y/N

**Activity 3: [Your choice]**
- Conditions: ___________
- Score: ___%
- Makes sense? Y/N

**Visual QA:**
- [ ] Cards aligned properly
- [ ] Images load correctly (or fallback icons)
- [ ] Text doesn't overflow cards
- [ ] Colors consistent with evaluation (green=perfect, yellow=good, etc.)
- [ ] Mobile: cards stack vertically
- [ ] Mobile: readable text sizes
- [ ] Tab switching smooth (no flash)

**Edge Cases:**
- [ ] No weather data available → Shows error or fallback message
- [ ] All activities score "poor" → Shows indoor alternatives
- [ ] User has 0 activities → Shows message to add activities
- [ ] Rapid location switching → No crashes, handles gracefully
- [ ] Offline mode → Shows last cached data or offline message

**UX Notes:**
```
[Observations about clarity, usefulness, confusing elements]





```

---

### Test 1.3: Activity Selection & Management (15 mins)

**Objective**: Verify users can add/remove activities

**Test Steps:**

| # | Action | Expected Result | Pass/Fail | Notes |
|---|--------|----------------|-----------|-------|
| 1 | Navigate to `/interests` | Activity selection page loads | ⬜ | |
| 2 | See current selections | Previously selected activities checked/highlighted | ⬜ | # selected: ___ |
| 3 | Expand "Team Sports" | Shows: Football, Rugby, Cricket, etc. | ⬜ | # activities: ___ |
| 4 | Click "Football" | Adds to selection (visual feedback) | ⬜ | |
| 5 | Click "Football" again | Removes from selection | ⬜ | |
| 6 | Select 10 new activities | All selections tracked | ⬜ | |
| 7 | Click "Save" or "Update" | Saves preferences | ⬜ | |
| 8 | Navigate back to `/` | Homepage shows new activities | ⬜ | Update time: ___s |
| 9 | Return to `/interests` | Selections persisted | ⬜ | |
| 10 | Search for "surf" | Shows surfing-related activities | ⬜ | # results: ___ |
| 11 | Filter by "Outdoor" | Shows only outdoor activities | ⬜ | |
| 12 | Click "Recommended" tab | Shows activities for current location/season | ⬜ | |
| 13 | Deselect all activities | Can save with 0 activities | ⬜ | Warning shown? Y/N |
| 14 | Select 100+ activities | Handles gracefully, no performance issues | ⬜ | |

**Visual QA:**
- [ ] Categories clearly separated
- [ ] Activity icons/emojis display correctly
- [ ] Selection state obvious (checked, highlighted, etc.)
- [ ] Search results highlighted
- [ ] Mobile: scrollable lists, no overlap
- [ ] Save button always accessible (sticky/fixed)

---

### Test 1.4: Weather Page Deep Dive (25 mins)

**Objective**: Verify comprehensive weather display

**Test Steps:**

| # | Action | Expected Result | Pass/Fail | Notes |
|---|--------|----------------|-----------|-------|
| 1 | Navigate to `/weather` | Weather dashboard loads | ⬜ | |
| 2 | Check current conditions | Temp, wind, pressure, humidity visible | ⬜ | |
| 3 | Verify location | Shows correct location name | ⬜ | Location: _______ |
| 4 | Scroll to hourly forecast | 48 hours of data (or at least 24) | ⬜ | # hours: ___ |
| 5 | Check hourly cards | Each shows: time, temp, wind, precipitation | ⬜ | |
| 6 | Click "Wind" card | Opens detailed wind info | ⬜ | OR navigates to page |
| 7 | Verify wind details | Speed, direction, gusts, Beaufort scale | ⬜ | |
| 8 | Check wind direction compass | Arrow points correct direction | ⬜ | |
| 9 | Click "Waves" card (coastal) | Wave height, period, direction | ⬜ | N/A if inland |
| 10 | Click "Tides" card (coastal) | High/low tide times and heights | ⬜ | |
| 11 | Check pressure card | Shows hPa value and trend (rising/falling) | ⬜ | |
| 12 | Verify pressure dial | Visual dial indicator | ⬜ | |
| 13 | Check UV index | Shows value 0-11+ and risk level | ⬜ | |
| 14 | Check air quality | Shows AQI and health advisory | ⬜ | If available |
| 15 | Check pollen count | Shows level and types | ⬜ | If available |
| 16 | Verify sunrise/sunset | Times displayed correctly | ⬜ | |
| 17 | Check moon phase | Shows current phase and % illumination | ⬜ | |
| 18 | Scroll to 7-day forecast | Shows daily min/max, precipitation | ⬜ | |
| 19 | Change location to coastal | Marine data appears (waves, tides, sea temp) | ⬜ | |
| 20 | Change location to inland | Marine data disappears | ⬜ | |

**Data Accuracy Checks:**

Compare with Met.no or other weather service:
- Temperature: GoDaisy __°C vs Source __°C (within ±2°C) | ⬜ |
- Wind speed: GoDaisy __ km/h vs Source __ km/h (within ±5 km/h) | ⬜ |
- Pressure: GoDaisy __ hPa vs Source __ hPa (within ±2 hPa) | ⬜ |

**Visual QA:**
- [ ] Cards layout clean, not cramped
- [ ] Icons intuitive (wind, rain, sun, etc.)
- [ ] Charts/graphs render correctly
- [ ] Responsive: cards reflow on mobile
- [ ] Dark mode (if applicable): readable text
- [ ] Loading states: skeletons or spinners

**Edge Cases:**
- [ ] Location with no marine data → Marine cards hidden or N/A
- [ ] Extreme weather (storm, heat wave) → Warnings displayed
- [ ] No UV data → Card hidden or shows "N/A"
- [ ] API failure → Error message, fallback to cached data

---

### Test 1.5: Activities Page (15 mins)

**Objective**: Verify landscape activity cards and sharing

**Test Steps:**

| # | Action | Expected Result | Pass/Fail | Notes |
|---|--------|----------------|-----------|-------|
| 1 | Navigate to `/activities` | All selected activities shown as cards | ⬜ | # cards: ___ |
| 2 | Check card layout | Landscape (horizontal) cards with image + details | ⬜ | |
| 3 | Verify each card shows | Activity name, conditions, evaluation badge | ⬜ | |
| 4 | Check land activity (running) | Temp, wind, rain, humidity | ⬜ | |
| 5 | Check marine activity (surfing) | Waves, water temp, wind, tide | ⬜ | |
| 6 | Verify evaluation badges | Perfect ✅, Good 👍, Fair 🤔, Indoor 🏠 | ⬜ | |
| 7 | Click "Share" on any card | Share modal opens | ⬜ | |
| 8 | Check share options | Native share OR WhatsApp/link copy | ⬜ | |
| 9 | Test native share (mobile) | Opens device share sheet | ⬜ | Mobile only |
| 10 | Test "Copy link" | Link copied to clipboard, confirmation shown | ⬜ | |
| 11 | Paste link in new tab | Loads activity detail or homepage | ⬜ | |
| 12 | Check WhatsApp share | Opens WhatsApp with pre-filled message | ⬜ | |
| 13 | Scroll through all cards | No layout breaks, images load | ⬜ | |
| 14 | Change location | All card conditions update | ⬜ | |

**Visual QA:**
- [ ] Images fill card space properly (no stretching/squishing)
- [ ] Text overlay readable (good contrast on images)
- [ ] Spacing consistent between cards
- [ ] Mobile: cards stack, full width
- [ ] Share modal: centered, responsive

---

## 🎣 Section 2: Findr Fishing App Testing

### Test 2.1: Findr Predictions - First Use (20 mins)

**Objective**: Verify fishing predictions core functionality

**Prerequisites:**
- Signed in (or test both signed-in and guest)
- Test on desktop first

**Test Steps:**

| # | Action | Expected Result | Pass/Fail | Notes |
|---|--------|----------------|-----------|-------|
| 1 | Navigate to `/findr` | Findr predictions page loads | ⬜ | Load time: ___s |
| 2 | Check default location | Shows default ICES rectangle or prompts selection | ⬜ | Default: _______ |
| 3 | Click location selector | Map or dropdown opens | ⬜ | |
| 4 | Select "North Sea" region | Rectangle options appear | ⬜ | # rectangles: ___ |
| 5 | Select rectangle "39F3" | Predictions start loading | ⬜ | |
| 6 | Observe loading state | Skeleton cards or spinner | ⬜ | |
| 7 | Wait for predictions | Species cards appear | ⬜ | Wait time: ___s |
| 8 | Count species cards | 10-30 species shown | ⬜ | # species: ___ |
| 9 | Check top species | Highest confidence score at top | ⬜ | Top species: _______ |
| 10 | Verify confidence scores | Scores between 0-100% | ⬜ | Range: ___-___ % |
| 11 | Check species card content | Name, image, confidence, summary | ⬜ | |
| 12 | Verify species images | High-quality fish images load | ⬜ | |
| 13 | Look for missing images | GradientFish fallback shown | ⬜ | # fallbacks: ___ |
| 14 | Check guild badges | Pelagic, Demersal, Reef, etc. visible | ⬜ | |
| 15 | Verify environmental indicators | Temp, salinity, depth visible | ⬜ | |
| 16 | Read weather impact message | Guild-specific weather message | ⬜ | Makes sense? Y/N |
| 17 | Click species card | Species modal opens | ⬜ | |
| 18 | Check modal content | Full species details, advice, tips | ⬜ | |
| 19 | Verify modal sections | "Why it works", "Bait", "Tide", "Status" | ⬜ | |
| 20 | Click "Expand" in modal | Shows full details | ⬜ | |
| 21 | Close modal (X button) | Returns to predictions | ⬜ | |
| 22 | Close modal (ESC key) | Returns to predictions | ⬜ | Keyboard |
| 23 | Click modal backdrop | Closes modal | ⬜ | |
| 24 | Click favorite (heart) icon | Adds to favourites (or prompts sign-in) | ⬜ | |

**Species Validation:**

Check 3 species for data quality:

**Species 1: European Bass** (if available)
- Confidence score: ___%
- Guild: _______ (should be "pelagic")
- Image: Loaded Y/N
- Temperature match: ___ → Makes sense? Y/N
- Bait suggestions: ___________
- Advice quality: Good/Fair/Poor

**Species 2: [High confidence species]**
- Name: _______
- Confidence: ___%
- Why high confidence? ___________
- Data complete? Y/N

**Species 3: [Low confidence species]**
- Name: _______
- Confidence: ___%
- Why low confidence? ___________
- Advice still useful? Y/N

**Visual QA:**
- [ ] Species cards clean, not cramped
- [ ] Confidence badges color-coded (green=high, yellow=med, red=low)
- [ ] Images don't distort
- [ ] Modal scrollable if content long
- [ ] Modal fits mobile screen
- [ ] Loading states smooth (no flash)

**Edge Cases:**
- [ ] Rectangle with no data → Shows message, not empty array
- [ ] All species low confidence → All cards shown with context
- [ ] Very long species name → Text wraps or truncates gracefully
- [ ] Network error → Error message, retry option

---

### Test 2.2: Findr Favourites Management (25 mins)

**Objective**: Verify favourites system works correctly

**Prerequisites:**
- Signed in
- Add 5-10 species to favourites first

**Test Steps:**

| # | Action | Expected Result | Pass/Fail | Notes |
|---|--------|----------------|-----------|-------|
| 1 | Navigate to `/findr/favourites` | Favourites page loads | ⬜ | |
| 2 | Check authentication | If not signed in, prompts sign-in | ⬜ | |
| 3 | Count favourites | Shows all added favourites | ⬜ | # favourites: ___ |
| 4 | Check "Hot Right Now" section | Top 3 by confidence | ⬜ | |
| 5 | Verify HRN cards | Shows thumbnail, confidence ring, season label | ⬜ | |
| 6 | Click HRN thumbnail | Species modal opens | ⬜ | ✅ NEW FEATURE |
| 7 | Check confidence ring | Visual ring matches % value | ⬜ | |
| 8 | Read season label | "Hot right now", "In the mood", etc. | ⬜ | |
| 9 | Scroll to "All Your Favourites" | All favourites listed | ⬜ | |
| 10 | Check sort options | By Confidence, Catches, Recent | ⬜ | |
| 11 | Sort by "Confidence" | Highest confidence first | ⬜ | |
| 12 | Verify sort order | Descending confidence scores | ⬜ | Correct? Y/N |
| 13 | Sort by "Catches" | Most catches first | ⬜ | |
| 14 | Sort by "Recent" | Most recently added first | ⬜ | |
| 15 | Check "Active" section (85%+) | Species with 85%+ confidence | ⬜ | # species: ___ |
| 16 | Click Active card | Species modal opens | ⬜ | ✅ NEW FEATURE |
| 17 | Check Active card content | Large, prominent, red theme | ⬜ | |
| 18 | Verify "GO NOW" badge | Urgent call-to-action visible | ⬜ | |
| 19 | Check fishing time | Shows best time (Dawn/Dusk, etc.) | ⬜ | |
| 20 | Check 7-day forecast | Mini calendar with confidence forecast | ⬜ | |
| 21 | Verify environmental data | Temp, salinity, depth, substrate | ⬜ | |
| 22 | Click "Priority" button | Toggles priority flag | ⬜ | |
| 23 | Verify priority indicator | Star or target icon shows | ⬜ | |
| 24 | Click "Remove" button | Confirms removal | ⬜ | |
| 25 | Confirm removal | Species removed from list | ⬜ | |
| 26 | Check "Good" section (70-84%) | Species with 70-84% confidence | ⬜ | # species: ___ |
| 27 | Click Good card | Species modal opens | ⬜ | ✅ NEW FEATURE |
| 28 | Check Good card content | Medium size, yellow theme | ⬜ | |
| 29 | Verify "Plan Trip" message | Encourages planning | ⬜ | |
| 30 | Click "Expand" in Good card | Shows full details | ⬜ | |
| 31 | Check "Waiting" section (<70%) | Species with <70% confidence | ⬜ | # species: ___ |
| 32 | Click Waiting thumbnail | Species action triggered | ⬜ | ✅ NEW FEATURE |
| 33 | Check Waiting card content | Compact, shows when improving | ⬜ | |
| 34 | Verify "Improving" indicator | Shows if forecast improving | ⬜ | |
| 35 | Check mini calendar | 7-day trend visible | ⬜ | |

**Swipe Gestures (Mobile):**
- [ ] Swipe card left → Remove prompt
- [ ] Swipe card right → Priority toggle
- [ ] Swipe hint visible on hover/touch
- [ ] Swipe smooth, no lag

**Data Consistency:**
- [ ] Favourite added on `/findr` appears in `/findr/favourites`
- [ ] Confidence scores match predictions page
- [ ] Species images consistent across pages
- [ ] Removing favourite updates both pages

**Visual QA:**
- [ ] Three-tier layout clear (Active/Good/Waiting)
- [ ] Color coding consistent (red/yellow/gray)
- [ ] Cards aligned properly
- [ ] Mobile: cards full-width
- [ ] Thumbnails correct aspect ratio
- [ ] Stats dashboard clear

**Edge Cases:**
- [ ] 0 favourites → Shows empty state with CTA
- [ ] 100+ favourites → Performance OK, all load
- [ ] All favourites low confidence → All in Waiting section
- [ ] Remove last favourite → Empty state shown
- [ ] Add duplicate → Prevented or handled

**UX Notes:**
```
[Observations about favourites UX, confusing elements, suggestions]





```

---

### Test 2.3: Findr Species Modal Deep Dive (15 mins)

**Objective**: Verify species details modal is comprehensive

**Test Steps:**

| # | Action | Expected Result | Pass/Fail | Notes |
|---|--------|----------------|-----------|-------|
| 1 | Open species modal (any species) | Modal opens, loads quickly | ⬜ | |
| 2 | Check species image | Large, high-quality image | ⬜ | |
| 3 | Verify species name | Common + scientific names | ⬜ | |
| 4 | Check confidence badge | Prominent, color-coded | ⬜ | |
| 5 | Read "Why it works" section | Explains environmental match | ⬜ | # points: ___ |
| 6 | Check environmental conditions | Temp, salinity, depth, substrate details | ⬜ | |
| 7 | Verify data freshness badge | Shows "Fresh", "Recent", etc. | ⬜ | |
| 8 | Read "Bait & presentation" | Specific bait recommendations | ⬜ | # baits: ___ |
| 9 | Check "Tide & timing" | Best tide states and times | ⬜ | |
| 10 | Read "Status & notes" | Regulations, conservation status | ⬜ | |
| 11 | Check playful bio | Engaging species description | ⬜ | Tone: Good/OK/Poor |
| 12 | Verify guild badge | Correct guild for species | ⬜ | Guild: _______ |
| 13 | Check weather impact | Guild-specific weather message | ⬜ | |
| 14 | Scroll through content | All sections visible, no overlap | ⬜ | |
| 15 | Click favorite (heart) | Toggles favourite status | ⬜ | |
| 16 | Verify modal responsive | Fits mobile screen, scrollable | ⬜ | |

**Content Quality Check:**

Rate the usefulness of advice for 2 species:

**Species 1: _______**
- Environmental advice: Useful/Vague/Missing
- Bait advice: Specific/General/Missing
- Timing advice: Helpful/Vague/Missing
- Overall: Would this help an angler? Y/N

**Species 2: _______**
- Environmental advice: _______
- Bait advice: _______
- Timing advice: _______
- Overall: _______

---

### Test 2.4: Findr Conditions Page (10 mins)

**Objective**: Verify environmental conditions display

**Test Steps:**

| # | Action | Expected Result | Pass/Fail | Notes |
|---|--------|----------------|-----------|-------|
| 1 | Navigate to `/findr/conditions` | Conditions page loads | ⬜ | |
| 2 | Check location | Shows selected ICES rectangle | ⬜ | |
| 3 | Verify marine data cards | Temp, salinity, oxygen, etc. | ⬜ | # cards: ___ |
| 4 | Check seabed data | Depth, substrate type | ⬜ | |
| 5 | Verify weather data | Wind, pressure, precipitation | ⬜ | |
| 6 | Check data timestamps | Shows when data was collected | ⬜ | Age: ___ hours |
| 7 | Look for warnings | Alerts for extreme conditions | ⬜ | |
| 8 | Change location | Data updates for new location | ⬜ | |

---

### Test 2.5: Findr Catch Logging (15 mins)

**Objective**: Verify catch logging functionality

**Test Steps:**

| # | Action | Expected Result | Pass/Fail | Notes |
|---|--------|----------------|-----------|-------|
| 1 | Navigate to `/findr/log` | Catch logging page loads | ⬜ | |
| 2 | Check form fields | Species, location, date, weight, length, notes | ⬜ | |
| 3 | Select species | Dropdown or autocomplete with species list | ⬜ | |
| 4 | Enter weight | Accepts numeric input (kg or lbs) | ⬜ | |
| 5 | Enter length | Accepts numeric input (cm or inches) | ⬜ | |
| 6 | Add photo (if available) | Image upload works | ⬜ | |
| 7 | Add notes | Freetext field accepts input | ⬜ | |
| 8 | Submit catch | Success message, catch saved | ⬜ | |
| 9 | View catch history | Previous catches listed | ⬜ | # catches: ___ |
| 10 | Edit catch | Can modify details | ⬜ | |
| 11 | Delete catch | Confirms deletion | ⬜ | |

---

## 🔐 Section 3: Authentication & Account

### Test 3.1: Sign Up Flow (10 mins)

**Test Steps:**

| # | Action | Expected Result | Pass/Fail | Notes |
|---|--------|----------------|-----------|-------|
| 1 | Click "Sign In" (header) | Redirects to `/findr/auth` or `/auth` | ⬜ | |
| 2 | Enter email | Accepts valid email format | ⬜ | |
| 3 | Try invalid email: "test@" | Validation error shown | ⬜ | |
| 4 | Enter valid email | Proceeds | ⬜ | |
| 5 | Click "Send Magic Link" | Confirmation: "Check your email" | ⬜ | |
| 6 | Check email inbox | Magic link email received | ⬜ | Time: ___ seconds |
| 7 | Click magic link | Opens app, user signed in | ⬜ | |
| 8 | Verify signed-in state | User name/email in header | ⬜ | |
| 9 | Check localStorage/cookies | Auth token stored | ⬜ | |

### Test 3.2: Sign In Flow (5 mins)

**Test Steps:**

| # | Action | Expected Result | Pass/Fail | Notes |
|---|--------|----------------|-----------|-------|
| 1 | Sign out (if signed in) | Redirects to public page | ⬜ | |
| 2 | Sign in with existing email | Magic link sent | ⬜ | |
| 3 | Click magic link | Signs in successfully | ⬜ | |
| 4 | Check favourites persist | Previous favourites still there | ⬜ | |

### Test 3.3: Account Management (10 mins)

**Test Steps:**

| # | Action | Expected Result | Pass/Fail | Notes |
|---|--------|----------------|-----------|-------|
| 1 | Navigate to `/account` | Account page loads | ⬜ | |
| 2 | Check profile info | Email, name (if collected) | ⬜ | |
| 3 | Update name | Saves successfully | ⬜ | |
| 4 | Update email | Requires verification | ⬜ | |
| 5 | Check activity history | Shows usage stats | ⬜ | |
| 6 | Check favourites count | Matches actual count | ⬜ | |
| 7 | Click "Sign Out" | Signs out, redirects | ⬜ | |
| 8 | Try accessing `/findr/favourites` | Redirects to sign-in | ⬜ | |

---

## 📱 Section 4: Mobile & Responsive Testing

### Test 4.1: Mobile Navigation (iPhone) (15 mins)

**Device:** iPhone (Safari)

**Test Steps:**

| # | Action | Expected Result | Pass/Fail | Notes |
|---|--------|----------------|-----------|-------|
| 1 | Load homepage on iPhone | Loads within 5 seconds | ⬜ | |
| 2 | Check layout | Elements stack vertically, no horizontal scroll | ⬜ | |
| 3 | Check bottom navigation | Shows: Home, Activities, Weather, Findr, Account | ⬜ | |
| 4 | Tap bottom nav icons | Navigate to correct pages | ⬜ | |
| 5 | Check active tab indicator | Highlights current page | ⬜ | |
| 6 | Test burger menu (if exists) | Opens menu overlay | ⬜ | |
| 7 | Check text readability | All text ≥16px, good contrast | ⬜ | |
| 8 | Test touch targets | All buttons ≥44x44px | ⬜ | |
| 9 | Scroll homepage | Smooth scrolling, no jank | ⬜ | |
| 10 | Pinch to zoom (if allowed) | Zooms content | ⬜ | |
| 11 | Rotate to landscape | Layout adapts or locks | ⬜ | |
| 12 | Check modals | Fill screen, scrollable | ⬜ | |
| 13 | Test swipe gestures | Work on favourite cards | ⬜ | |

### Test 4.2: Mobile Findr Experience (15 mins)

**Test Steps:**

| # | Action | Expected Result | Pass/Fail | Notes |
|---|--------|----------------|-----------|-------|
| 1 | Open `/findr` on mobile | Loads, cards stack | ⬜ | |
| 2 | Tap species card | Opens modal full-screen | ⬜ | |
| 3 | Scroll modal content | Smooth, no stuck scrolling | ⬜ | |
| 4 | Close modal (X button) | Button easy to tap | ⬜ | |
| 5 | Close modal (swipe down) | Swipe to dismiss works | ⬜ | If implemented |
| 6 | Tap location selector | Opens map or list view | ⬜ | |
| 7 | Select new location | Loads predictions | ⬜ | |
| 8 | Check favourites page | Cards readable, not cramped | ⬜ | |
| 9 | Swipe favourite card | Swipe gestures work | ⬜ | |
| 10 | Tap priority button | Toggles without misclicks | ⬜ | |

### Test 4.3: Tablet Experience (iPad) (10 mins)

**Device:** iPad (Safari)

**Test Steps:**

| # | Action | Expected Result | Pass/Fail | Notes |
|---|--------|----------------|-----------|-------|
| 1 | Load app on iPad | Uses desktop or tablet layout | ⬜ | |
| 2 | Check navigation | Top nav or side nav visible | ⬜ | |
| 3 | Verify card layouts | Use available space well (grid) | ⬜ | |
| 4 | Test in portrait | Cards stack or 2-column grid | ⬜ | |
| 5 | Test in landscape | Cards in 3+ column grid | ⬜ | |
| 6 | Check modals | Centered, not full-screen | ⬜ | |

---

## 🌐 Section 5: Cross-Browser Testing

### Test 5.1: Desktop Browsers (10 mins each)

**Browsers to Test:** Chrome, Firefox, Safari, Edge

**For Each Browser:**

| # | Test | Chrome | Firefox | Safari | Edge | Notes |
|---|------|--------|---------|--------|------|-------|
| 1 | Homepage loads | ⬜ | ⬜ | ⬜ | ⬜ | |
| 2 | Activity cards render | ⬜ | ⬜ | ⬜ | ⬜ | |
| 3 | Findr predictions work | ⬜ | ⬜ | ⬜ | ⬜ | |
| 4 | Species modal opens | ⬜ | ⬜ | ⬜ | ⬜ | |
| 5 | Favourites save | ⬜ | ⬜ | ⬜ | ⬜ | |
| 6 | Weather cards display | ⬜ | ⬜ | ⬜ | ⬜ | |
| 7 | Maps render (if used) | ⬜ | ⬜ | ⬜ | ⬜ | |
| 8 | Images load correctly | ⬜ | ⬜ | ⬜ | ⬜ | |
| 9 | CSS animations work | ⬜ | ⬜ | ⬜ | ⬜ | |
| 10 | No console errors | ⬜ | ⬜ | ⬜ | ⬜ | |

**Browser-Specific Issues:**
```
[Note any browser-specific bugs]


```

---

## ♿ Section 6: Accessibility Testing

### Test 6.1: Keyboard Navigation (20 mins)

**Objective:** Verify full keyboard accessibility

**Test Steps:**

| # | Action | Expected Result | Pass/Fail | Notes |
|---|--------|----------------|-----------|-------|
| 1 | Tab from top of page | Focus moves logically through elements | ⬜ | |
| 2 | Check focus indicators | Visible outline/highlight on focused elements | ⬜ | |
| 3 | Tab to navigation | Can navigate between pages | ⬜ | |
| 4 | Tab through activity cards | Each card focusable | ⬜ | |
| 5 | Press Enter on card | Activates card (expands or navigates) | ⬜ | |
| 6 | Tab to species card | Card focusable | ⬜ | |
| 7 | Press Enter | Opens species modal | ⬜ | |
| 8 | Tab inside modal | Focus trapped in modal | ⬜ | |
| 9 | Press Escape | Closes modal | ⬜ | |
| 10 | Tab to buttons | All buttons focusable | ⬜ | |
| 11 | Press Space on button | Activates button | ⬜ | |
| 12 | Tab to dropdowns | Can open with Enter | ⬜ | |
| 13 | Arrow keys in dropdown | Navigate options | ⬜ | |
| 14 | Tab to checkboxes | Toggleable with Space | ⬜ | |
| 15 | Check skip links | "Skip to content" link works | ⬜ | |
| 16 | Tab through entire app | No keyboard traps (can escape every element) | ⬜ | |

**Focus Order:**
- [ ] Focus order is logical (top → bottom, left → right)
- [ ] Modal closes return focus to trigger element
- [ ] No focus on hidden elements

### Test 6.2: Screen Reader Testing (30 mins)

**Tool:** VoiceOver (Mac) or NVDA (Windows)

**Test Steps:**

| # | Action | Expected Result | Pass/Fail | Notes |
|---|--------|----------------|-----------|-------|
| 1 | Enable screen reader | Announces page title on load | ⬜ | |
| 2 | Navigate headings (H key) | All headings readable, hierarchy correct | ⬜ | |
| 3 | Navigate landmarks | Main, nav, footer regions announced | ⬜ | |
| 4 | Navigate to image | Alt text read aloud | ⬜ | |
| 5 | Navigate to button | Button role and label announced | ⬜ | |
| 6 | Navigate to form | Labels read before inputs | ⬜ | |
| 7 | Check activity cards | Content structure clear | ⬜ | |
| 8 | Check species cards | Name, confidence, details read | ⬜ | |
| 9 | Navigate to modal | Modal region announced | ⬜ | |
| 10 | Check ARIA labels | Buttons have meaningful labels | ⬜ | |
| 11 | Check live regions | Updates announced (loading, success, error) | ⬜ | |
| 12 | Check icon buttons | Text alternative provided | ⬜ | |

**ARIA Validation:**
- [ ] No duplicate IDs on page
- [ ] ARIA roles used correctly
- [ ] ARIA labels present where needed
- [ ] No ARIA errors in console

### Test 6.3: Color & Contrast (10 mins)

**Tool:** Browser DevTools or Contrast Checker

**Test Steps:**

| # | Element | Foreground | Background | Ratio | Min Ratio | Pass/Fail |
|---|---------|------------|------------|-------|-----------|-----------|
| 1 | Body text | #000 | #FFF | 21:1 | 4.5:1 | ⬜ |
| 2 | Heading text | | | | 3:1 | ⬜ |
| 3 | Button text | | | | 4.5:1 | ⬜ |
| 4 | Link text | | | | 4.5:1 | ⬜ |
| 5 | Badge text | | | | 4.5:1 | ⬜ |
| 6 | Disabled text | | | | 3:1 | ⬜ |

**Color Blindness:**
- [ ] Test with color blindness simulator
- [ ] Information conveyed beyond just color (icons, text, patterns)

---

## 🐛 Section 7: Exploratory Testing

### Test 7.1: Break Things (30 mins)

**Objective:** Find bugs through creative exploration

**Scenarios to Try:**

1. **Rapid Interactions:**
   - [ ] Click same button 10 times fast → No duplicates, errors
   - [ ] Switch tabs rapidly → No state corruption
   - [ ] Open/close modal repeatedly → No memory leaks

2. **Data Extremes:**
   - [ ] Enter 1000-character name → Handles or validates
   - [ ] Upload 50MB image → Rejects or handles
   - [ ] Select 100+ activities → Performance OK

3. **Network Shenanigans:**
   - [ ] Throttle to 3G → Loading states appear
   - [ ] Go offline mid-load → Error message shown
   - [ ] Resume connection → Recovers gracefully

4. **Browser Storage:**
   - [ ] Clear localStorage → Doesn't crash, prompts re-setup
   - [ ] Clear cookies → Session ends, can re-authenticate
   - [ ] Fill localStorage to limit → Handles gracefully

5. **Timing Issues:**
   - [ ] Submit form before page fully loaded → Waits or disables
   - [ ] Navigate away during API call → Cancels or completes
   - [ ] Let session timeout → Prompts re-auth

6. **Copy/Paste:**
   - [ ] Paste HTML in text field → Sanitizes or rejects
   - [ ] Paste emoji in email field → Validates
   - [ ] Copy species data → Formats nicely

### Test 7.2: Visual Consistency Check (15 mins)

**Compare these pages for visual consistency:**

| Element | Homepage | Activities | Weather | Findr | Consistent? |
|---------|----------|------------|---------|-------|-------------|
| Header height | | | | | ⬜ |
| Font family | | | | | ⬜ |
| Font sizes (h1) | | | | | ⬜ |
| Button styles | | | | | ⬜ |
| Card shadows | | | | | ⬜ |
| Spacing (margins) | | | | | ⬜ |
| Colors (primary) | | | | | ⬜ |
| Loading states | | | | | ⬜ |

---

## 📊 Section 8: Performance Testing

### Test 8.1: Page Load Performance (15 mins)

**Tool:** Browser DevTools Performance Tab

**For each key page:**

| Page | URL | Load Time | LCP | FID | CLS | Notes |
|------|-----|-----------|-----|-----|-----|-------|
| Homepage | `/` | ___s | ___s | ___ms | ___ | Target: <3s |
| Activities | `/activities` | ___s | ___s | ___ms | ___ | |
| Weather | `/weather` | ___s | ___s | ___ms | ___ | |
| Findr | `/findr` | ___s | ___s | ___ms | ___ | |
| Favourites | `/findr/favourites` | ___s | ___s | ___ms | ___ | |

**Metrics:**
- LCP (Largest Contentful Paint): < 2.5s = Good
- FID (First Input Delay): < 100ms = Good
- CLS (Cumulative Layout Shift): < 0.1 = Good

**Check Network Tab:**
- [ ] No unnecessary requests (check for duplicates)
- [ ] Images optimized (webp format)
- [ ] API calls cached when appropriate
- [ ] No 404s or failed requests

### Test 8.2: Interaction Performance (10 mins)

**Test Scenarios:**

| Interaction | Expected Time | Actual Time | Pass/Fail | Notes |
|-------------|---------------|-------------|-----------|-------|
| Click activity card | < 100ms | ___ms | ⬜ | |
| Open species modal | < 200ms | ___ms | ⬜ | |
| Change location | < 500ms | ___ms | ⬜ | (cached) |
| Load predictions | < 1s | ___ms | ⬜ | (cached) |
| Load predictions | < 3s | ___ms | ⬜ | (fresh) |
| Add to favourites | < 500ms | ___ms | ⬜ | |
| Sort favourites | < 100ms | ___ms | ⬜ | |
| Scroll long list | Smooth | Y/N | ⬜ | No jank |

---

## 📝 Section 9: Final Checks & Sign-off

### Test 9.1: SEO & Metadata (10 mins)

**For each page, check:**

| Page | Title Tag | Meta Description | OG Image | Canonical | Pass/Fail |
|------|-----------|------------------|----------|-----------|-----------|
| Homepage | Unique, <60 chars | Compelling, <160 chars | Set | Set | ⬜ |
| Activities | | | | | ⬜ |
| Weather | | | | | ⬜ |
| Findr | | | | | ⬜ |
| Favourites | | | | | ⬜ |

**Additional Checks:**
- [ ] robots.txt exists and correct
- [ ] sitemap.xml exists and up-to-date
- [ ] Structured data (JSON-LD) for fishing content
- [ ] Social sharing preview works (Twitter, Facebook)

### Test 9.2: Legal & Compliance (5 mins)

**Check Pages:**
- [ ] Privacy Policy exists at `/PrivacyPolicy`
- [ ] Terms & Conditions exists at `/TermsAndConditions`
- [ ] Cookie Policy exists at `/CookiePolicy`
- [ ] Cookie consent banner shown (if required)
- [ ] GDPR compliance (data deletion, export)
- [ ] Contact info/support page exists

### Test 9.3: Error Pages (5 mins)

**Test Error Scenarios:**
- [ ] Navigate to `/nonexistent-page` → 404 page shown
- [ ] 404 page has branding, navigation
- [ ] 404 page suggests next steps
- [ ] API error → User-friendly error message
- [ ] Network error → Offline message
- [ ] Auth error → Redirect to sign-in

---

## 🎉 Test Summary & Sign-off

### Overall Test Statistics

| Category | Total Cases | Passed | Failed | Blocked | Pass Rate |
|----------|-------------|--------|--------|---------|-----------|
| GoDaisy Core | ___ | ___ | ___ | ___ | __% |
| Findr Core | ___ | ___ | ___ | ___ | __% |
| Authentication | ___ | ___ | ___ | ___ | __% |
| Mobile/Responsive | ___ | ___ | ___ | ___ | __% |
| Accessibility | ___ | ___ | ___ | ___ | __% |
| Performance | ___ | ___ | ___ | ___ | __% |
| **TOTAL** | **___** | **___** | **___** | **___** | **__%** |

### Critical Bugs Found

| Bug # | Title | Severity | Status | Notes |
|-------|-------|----------|--------|-------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

### Recommendations

**High Priority:**
1. [RECOMMENDATION]
2. [RECOMMENDATION]
3. [RECOMMENDATION]

**Medium Priority:**
1. [RECOMMENDATION]
2. [RECOMMENDATION]

**Low Priority / Future:**
1. [RECOMMENDATION]
2. [RECOMMENDATION]

### Sign-off

**Tested By:** ___________________  
**Date:** ___________________  
**Ready for Production:** YES / NO / CONDITIONAL  

**Conditions (if applicable):**
```



```

**Senior QA Manager Approval:** ___________________  
**Date:** ___________________

---

## 📌 Notes & Tips

### Testing Best Practices

1. **Document Everything:**
   - Screenshot bugs immediately
   - Note exact steps to reproduce
   - Include browser/device info

2. **Think Like a User:**
   - What would confuse someone new?
   - What's not intuitive?
   - Where would they get stuck?

3. **Test Edge Cases:**
   - Minimum values, maximum values
   - Empty states
   - Error states
   - Unusual but valid inputs

4. **Compare to Competitors:**
   - How do other fishing apps work?
   - How do weather apps present data?
   - What UX patterns are standard?

5. **Performance Matters:**
   - Test on slow connections
   - Test on older devices
   - Test with full localStorage/cache

### When to Escalate

**Immediately escalate:**
- Security vulnerabilities
- Data loss scenarios
- App crashes
- Critical functionality broken
- Accessibility blockers (can't use with keyboard/screen reader)

**Report but not blocking:**
- Visual inconsistencies
- Minor text errors
- Edge case bugs affecting <1% users
- Performance issues on old devices

### Tools Checklist

- [ ] Browser DevTools (Chrome, Firefox, Safari)
- [ ] Screen reader (VoiceOver/NVDA)
- [ ] Color contrast checker
- [ ] Screenshot tool
- [ ] Video recorder (for reproducing bugs)
- [ ] Network throttling tools
- [ ] Bug tracking system access

### Daily Routine

**Morning (9:00-9:30):**
- Check for overnight deployments
- Review automated test results (from junior QA)
- Plan day's testing priorities

**Testing (9:30-12:30, 1:30-5:00):**
- Follow test plan systematically
- Document findings in real-time
- Take breaks every 90 minutes

**End of Day (5:00-5:30):**
- Update test tracking sheet
- File bug reports
- Sync with junior QA
- Plan tomorrow

---

**Good luck! Your attention to detail ensures a great user experience. 🎯**
