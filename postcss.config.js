// ⚠️ CRITICAL: Tailwind v4 requires '@tailwindcss/postcss' not 'tailwindcss'
// Do NOT change to 'tailwindcss' - that's for v3.x only
// See DO_NOT_TOUCH_CSS_CONFIG.md for details
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};
