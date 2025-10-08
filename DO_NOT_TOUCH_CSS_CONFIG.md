# 🚨 DO NOT TOUCH CSS CONFIGURATION 🚨

## ⚠️ WARNING: Days were spent getting this to work!

## Quick Reference - The Most Common Mistake

**CORRECT:**
```css
@import "tailwindcss";
@plugin "daisyui";  /* ← Use @plugin for DaisyUI */
```

**WRONG (breaks layout completely):**
```css
@import "tailwindcss";
@import "daisyui";  /* ← DON'T DO THIS! */
```

**The issue:** DaisyUI must be loaded as a plugin (`@plugin`), not as a CSS import (`@import`).

This project uses a **non-standard but WORKING** CSS configuration that took multiple days to debug. DO NOT "fix" or "modernize" it based on official documentation.

## Working Configuration (October 2025)

### Key Versioning Note
**Current setup uses Tailwind CSS v4.x** which is DIFFERENT from the v3.x configuration!

### 1. `styles/index.css`
```css
@import "tailwindcss";
@plugin "daisyui";
```
- Uses `@import` for Tailwind (Tailwind v4 style)
- Uses `@plugin` for DaisyUI (Tailwind v4 plugin syntax)
- **DO NOT** change to `@tailwind` directives - breaks layout completely
- **DO NOT** change `@plugin "daisyui"` to `@import "daisyui"` - won't work!

### 2. `postcss.config.js` (Tailwind v4)
```js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};
```
- **MUST** use `module.exports` (CommonJS), not `export default` (ESM)
- **MUST** use `'@tailwindcss/postcss'` for Tailwind v4 (not `tailwindcss`)
- This is the correct v4 setup

### 3. `tailwind.config.js`
```js
module.exports = {
  // ...config...
  plugins: [require('daisyui')],
}
```
- DaisyUI loaded via both CSS import AND tailwind plugin
- Yes, this seems redundant - it's intentional

## Version History

### Tailwind v3.x (Historical - in git stash)
- Used `tailwindcss` in postcss.config.js
- Package: `tailwindcss: ^3.4.15`

### Tailwind v4.x (Current)
- Uses `@tailwindcss/postcss` in postcss.config.js  
- Packages: `tailwindcss: ^4.1.12` and `@tailwindcss/postcss: ^4.1.12`

## Why This Configuration?

Despite DaisyUI v5 and Tailwind v4 official docs saying to use either:
1. `@plugin "daisyui"` (Tailwind 4.x style) OR
2. `plugins: [require('daisyui')]` (Tailwind 3.x style)

**The only working configuration is using BOTH methods simultaneously.**

## Common Mistakes to Avoid

❌ **DON'T** change postcss.config.js to `export default` (ESM format)
❌ **DON'T** change `@tailwindcss/postcss` to `tailwindcss` (for v4)
❌ **DON'T** change `@import` to `@tailwind` directives in CSS
❌ **DON'T** remove DaisyUI from either CSS imports or tailwind plugins
❌ **DON'T** "modernize" this based on official documentation
❌ **DON'T** confuse v3 vs v4 postcss plugin names!

## Symptoms of Broken CSS Config

- Navigation renders twice (duplicated)
- No layout structure visible
- DaisyUI components render as unstyled HTML
- Build succeeds but CSS doesn't apply
- Build fails with "tailwindcss directly as a PostCSS plugin" error

## Testing After Changes

If you MUST touch the CSS config (you shouldn't), test with:
```bash
npm run build
npx vercel deploy --prod --yes
```

Then check the production site for:
- ✅ Single navigation bar (not duplicated)
- ✅ DaisyUI styling applied
- ✅ Layout structure visible
- ✅ Responsive breakpoints working

## Version Info

- Tailwind CSS: 4.1.12 (using v4 @import syntax)
- @tailwindcss/postcss: 4.1.12
- DaisyUI: 5.1.6
- Next.js: 15.5.0
- PostCSS: 8.5.6

**Last verified working: October 8, 2025**

## Recovery Instructions

If someone breaks this (again):

### For Current Tailwind v4 setup:
```bash
git checkout HEAD -- postcss.config.js styles/index.css
```

### If you need Tailwind v3 config (from stash):
```bash
git stash show -p "stash@{0}" | grep -A 30 "postcss.config.js"
# Shows: module.exports with tailwindcss (not @tailwindcss/postcss)
```

### Quick Reference:
- **Tailwind v3**: postcss plugin = `tailwindcss`
- **Tailwind v4**: postcss plugin = `@tailwindcss/postcss`
- **Both versions**: Use `@import` in CSS, not `@tailwind` directives
