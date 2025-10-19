# Findr Translation Implementation Status

## Overview
All UI text in Findr components and pages should be wrapped in `<TranslatedText>` components for i18n support using DeepL API with caching.

## Completed Files

### ✅ Components
- **FindrFooter.tsx** - All link labels, tagline, and copyright text wrapped in `<TranslatedText>`

### ✅ Pages  
- **findr/support.tsx** - Main headings and key user-facing text wrapped in `<TranslatedText>`
  - Page title
  - Section headings
  - Call-to-action buttons
  - Key messages

## Files Requiring Translation Wrapping

### 🔄 Remaining Pages
The following pages were created but need comprehensive translation wrapping:

1. **findr/how-it-works.tsx**
   - Page title, section headings
   - Data source explanations
   - Bite Score scale labels
   - Feature descriptions

2. **findr/about.tsx**
   - Page title, section headings  
   - Mission statement
   - Team descriptions
   - Key messaging

3. **findr/terms.tsx**
   - Legal section headings
   - Plain English summaries
   - Disclaimer text

4. **findr/privacy.tsx**
   - Section headings
   - Privacy explanations
   - Rights descriptions
   - Plain English summaries

5. **findr/cookies.tsx**
   - Section headings
   - Cookie type descriptions
   - Management instructions
   - Plain English explanations

## Translation Pattern

### Import Statement
```typescript
import { TranslatedText } from '../../components/translation/TranslatedFishCard';
```

### Usage Examples

#### Headings
```tsx
<h1><TranslatedText text="Support Findr" /></h1>
<h2><TranslatedText text="Why Support Findr?" /></h2>
```

#### Paragraphs
```tsx
<p>
  <TranslatedText text="Your support helps keep it running and growing!" />
</p>
```

#### Buttons/Links
```tsx
<button>
  <TranslatedText text="Join on Patreon" />
</button>
```

#### List Items
```tsx
<li><TranslatedText text="Covers costs for marine and weather data APIs" /></li>
```

## Translation Guidelines

### What to Translate
- ✅ Headings and titles
- ✅ Body text and descriptions
- ✅ Button labels and CTAs
- ✅ Navigation links
- ✅ Error messages and alerts
- ✅ Form labels and placeholders
- ✅ Help text and tooltips

### What NOT to Translate
- ❌ Code examples and technical identifiers
- ❌ Email addresses and URLs
- ❌ Brand names (Go Daisy, Findr)
- ❌ Copyright symbols and years
- ❌ Data values and numbers
- ❌ API endpoint names

## Implementation Priority

### High Priority (User-Facing UI)
1. Navigation menus
2. Page titles and main headings
3. Buttons and CTAs
4. Form labels
5. Error/success messages

### Medium Priority (Content Pages)
6. About/support page content
7. Legal page headings
8. Help documentation

### Low Priority (Static Content)
9. Detailed legal text (often requires legal review per language)
10. Technical documentation

## Next Steps

1. **Systematically wrap remaining pages** - Work through findr/how-it-works.tsx, findr/about.tsx, etc.
2. **Add TranslatedText to list items** - Ensure all bullet points are translatable
3. **Review alert/info boxes** - Make sure dynamic messages use TranslatedText
4. **Test language switching** - Verify translations work correctly
5. **Cache warming** - Pre-translate common strings for performance

## Notes

- The translation system uses DeepL API with caching for performance
- Translations are cached to minimize API calls
- Always wrap user-facing text, even if initially supporting only English
- Future languages can be added without code changes once all text is wrapped

## Status: ⚠️ In Progress

Footer and primary support page completed. Remaining pages need systematic translation wrapping.

Last Updated: October 19, 2025
