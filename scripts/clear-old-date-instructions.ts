#!/usr/bin/env tsx
/**
 * Generate a browser script to clear the old date from localStorage
 */

console.log(`
🧹 To clear the old date from your browser localStorage:

1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Paste this command and press Enter:

   localStorage.removeItem('findrSettings');

4. Or to just update the date:

   const settings = JSON.parse(localStorage.getItem('findrSettings') || '{}');
   settings.predictionDate = '2025-10-11';
   localStorage.setItem('findrSettings', JSON.stringify(settings));

5. Then hard refresh the page: Cmd+Shift+R

✅ The code changes will now prevent loading old dates in the future.
`);
