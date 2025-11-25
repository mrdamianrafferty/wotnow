# Go Daisy Translation Wrapping Guide

**Status**: ✅ System Ready - Database + DeepL Fallback Configured

This guide shows you how to wrap UI strings in Go Daisy pages to enable multi-language support.

---

## 🎯 Quick Start

**The Pattern:**

```typescript
// 1. Import the hook at the top of your file
import { useUIText } from '../hooks/useUIText';

// 2. Inside your component, declare translation variables
export default function MyPage() {
  const title = useUIText('page.section.key_123', 'Default English Text');
  const description = useUIText('page.section.description_456', 'Description text here');

  return (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
```

---

## 🔄 Translation Flow

The `useUIText` hook follows this fallback chain:

1. **Check `ui_text_strings` database** (237 pre-translated strings)
2. **If not found**: Call DeepL API (cached in memory)
3. **If DeepL fails**: Use the fallback text you provided
4. **If no fallback**: Display the key

**Result**: All text is translated, even if not in the database yet!

---

## 📖 Finding Translation Keys

**Use the CSV file** to find existing keys:

```bash
# Open godaisy-text-strings.csv
# Search for your text in the text_en column
# Copy the text_key value
```

**Example from CSV:**
```csv
text_key,text_en,...
support.heading.keep_go_daisy_blooming_21,Keep Go Daisy Blooming,...
```

**Use it:**
```typescript
const title = useUIText('support.heading.keep_go_daisy_blooming_21', 'Keep Go Daisy Blooming');
```

---

## 📝 Step-by-Step Example: Support Page

### Before (Hardcoded Text):

```typescript
export default function Support() {
  return (
    <div className="card">
      <h2 className="card-title">Keep Go Daisy Blooming</h2>
      <p>Join the Go Daisy community on Patreon or tip via Apple.</p>
      <button className="btn btn-primary">Support Now</button>
    </div>
  );
}
```

### After (Translated):

```typescript
import { useUIText } from '../hooks/useUIText';

export default function Support() {
  // Declare all translations at the top of the component
  const heading = useUIText('support.heading.keep_go_daisy_blooming_21', 'Keep Go Daisy Blooming');
  const description = useUIText('support.paragraph.join_the_go_daisy_community_on_15',
    'Join the Go Daisy community on Patreon or tip via Apple.');
  const buttonText = useUIText('support.button.support_now', 'Support Now'); // DeepL fallback

  return (
    <div className="card">
      <h2 className="card-title">{heading}</h2>
      <p>{description}</p>
      <button className="btn btn-primary">{buttonText}</button>
    </div>
  );
}
```

---

## 🎨 Common Patterns

### Pattern 1: Headings & Paragraphs

```typescript
const hero = useUIText('homepage.hero.title', 'Weather-Smart Activity Recommendations');
const subtitle = useUIText('homepage.hero.subtitle', 'Let the weather guide your day');

return (
  <>
    <h1>{hero}</h1>
    <p>{subtitle}</p>
  </>
);
```

### Pattern 2: Button Labels

```typescript
const saveButton = useUIText('settings.button.save', 'Save Changes');
const cancelButton = useUIText('settings.button.cancel', 'Cancel');

return (
  <>
    <button className="btn btn-primary">{saveButton}</button>
    <button className="btn btn-ghost">{cancelButton}</button>
  </>
);
```

### Pattern 3: Loading & Error States

```typescript
const loading = useUIText('common.loading', 'Loading...');
const error = useUIText('common.error', 'Something went wrong');

if (isLoading) return <div>{loading}</div>;
if (isError) return <div className="alert alert-error">{error}</div>;
```

### Pattern 4: Dynamic Content (Interpolation)

For text with dynamic values, wrap only the static parts:

```typescript
const greeting = useUIText('common.greeting', 'Welcome');
const locationLabel = useUIText('common.location', 'Location');

return (
  <>
    <h1>{greeting}, {userName}!</h1>
    <p>{locationLabel}: {cityName}</p>
  </>
);
```

### Pattern 5: Conditional Text

```typescript
const indoorLabel = useUIText('activities.indoor', 'Indoor Activities');
const outdoorLabel = useUIText('activities.outdoor', 'Outdoor Activities');

return <h2>{isIndoor ? indoorLabel : outdoorLabel}</h2>;
```

---

## ⚠️ What NOT to Wrap

**Don't wrap:**
- **Variable names or keys**: `activityId`, `userId`
- **Technical strings**: `'home'`, `'coastal'` (enum values)
- **URLs or paths**: `'/api/weather'`, `'https://...'`
- **CSS classes**: `'btn btn-primary'`
- **Numbers or dates**: They'll be formatted by locale helpers
- **Code comments**: These aren't shown to users

**Example of what to skip:**

```typescript
// ❌ DON'T wrap these
const activityType = 'hiking';
const apiUrl = '/api/activities';
const className = 'card card-body';

// ✅ DO wrap these
const activityLabel = useUIText('activities.hiking', 'Hiking');
const errorMessage = useUIText('errors.api_failed', 'Failed to load activities');
```

---

## 📦 Wrapping Priority

**Start with high-impact pages:**

1. **Homepage** (`pages/index.tsx`)
   - Hero section
   - Activity cards
   - CTA buttons

2. **Support Page** (`pages/support.tsx`)
   - Patronage messaging
   - Tier descriptions

3. **Weather Dashboard** (`pages/weather.tsx`)
   - Weather conditions
   - Forecast labels

4. **Settings/Auth** (`pages/settings.tsx`, `pages/login.tsx`)
   - Form labels
   - Button text
   - Error messages

5. **Lower Priority:**
   - About Us, FAQs, Legal pages
   - These are already in the CSV, just need wrapping

---

## 🧪 Testing Your Changes

### Test Locally:

1. Start dev server: `npm run dev`
2. Open your page
3. Use language selector in header
4. Watch text change instantly!

### Test DeepL Fallback:

1. Add a new string NOT in the database:
   ```typescript
   const newText = useUIText('test.new_string', 'This is brand new text');
   ```
2. Switch to Spanish/French/etc.
3. First load: ~1-2 second delay (DeepL API call)
4. Subsequent switches: Instant (cached)

### Verify Translation Quality:

1. Open http://localhost:3000/translation-test
2. Switch between all 10 languages
3. Verify text looks natural and contextually correct

---

## 📊 Current Coverage

**Database Coverage:**
- **237 strings** pre-translated in `ui_text_strings`
- **97.5% coverage** of extracted Go Daisy text
- **10 languages**: EN, ES, FR, PT, DE, IT, NL, PL, TR, SV

**Pages with Extracted Strings:**
- ✅ `index.tsx` - Homepage (32 strings)
- ✅ `support.tsx` - Support page (21 strings)
- ✅ `weather.tsx` - Weather dashboard (89 strings)
- ✅ `activities.tsx` - Activities (12 strings)
- ✅ `interests.tsx` - Interests (41 strings)
- ✅ `onboarding.tsx` - Onboarding (17 strings)
- ✅ Legal pages (Privacy, Terms, Cookie Policy)
- ✅ About pages (AboutUs, FAQs, HowWeDoIt)

---

## 🚀 Performance Notes

**The system is optimized for performance:**

1. **First Page Load:**
   - 1 database query fetches all 237 translations
   - Cached in memory for entire session
   - ~200ms one-time cost

2. **Language Switching:**
   - **Instant** - no API calls, reads from cache
   - No flicker or loading states

3. **DeepL Fallback (New Strings):**
   - Only called for strings not in database
   - Only called when language ≠ English
   - Cached in memory after first fetch
   - ~500-1000ms delay on first use, then instant

4. **Re-renders:**
   - Translations are reactive
   - Changing language triggers re-render with new text
   - No manual refresh needed

---

## 🔧 Troubleshooting

### "Text not changing when I switch languages"

**Check:**
1. Is the text wrapped in `useUIText`?
2. Is the component inside `LanguageProvider`? (Should be in `_app.tsx`)
3. Open browser console - any errors?

### "Seeing translation keys instead of text"

**Likely causes:**
1. Key doesn't exist in database
2. DeepL API key missing (check `.env.local`)
3. No fallback text provided

**Fix:** Always provide fallback text:
```typescript
// ❌ Bad - no fallback
const text = useUIText('missing.key');

// ✅ Good - has fallback
const text = useUIText('missing.key', 'Default English Text');
```

### "DeepL translations not working"

**Check:**
1. `DEEPL_API_KEY` in `.env.local`
2. Browser console for errors
3. Network tab: Is `/api/translate` being called?
4. Check DeepL API quota

---

## 📚 Reference: Translation Keys in CSV

**Key Format:** `page.category.text_slug_number`

**Examples:**
- `index.heading._also_perfect_today_11`
- `support.paragraph.join_the_go_daisy_community_on_15`
- `weather.label.pick_your_home_location_9`
- `activities.button.add_to_your_interests_347`

**Find keys:**
```bash
# Search CSV for your text
grep "Keep Go Daisy Blooming" godaisy-text-strings.csv

# Result:
# support.heading.keep_go_daisy_blooming_21,Keep Go Daisy Blooming,...
```

---

## 🎯 Next Steps

1. **Start with one page** (e.g., Support or Homepage)
2. **Wrap visible text** using the patterns above
3. **Test locally** with language selector
4. **Commit and deploy**
5. **Repeat for other pages**

---

## ✅ System Status

- ✅ Database schema created (`ui_text_strings`)
- ✅ 237 translations imported (10 languages)
- ✅ `useUIText` hook created with DeepL fallback
- ✅ Language selector integrated (🌐 for English)
- ✅ In-memory caching for instant performance
- ✅ Test page available at `/translation-test`

**You're ready to start wrapping UI strings!** 🚀

---

## 📞 Support

- **Test Page**: http://localhost:3000/translation-test
- **CSV File**: `godaisy-text-strings.csv`
- **Hook**: `hooks/useUIText.ts`
- **API**: `/pages/api/translate.ts`
