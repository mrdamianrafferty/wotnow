// /Users/damianrafferty/Projects/WotNow/tailwind.config.js
const daisyThemes = require("daisyui/src/theming/themes");
/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  daisyui: {
    // Keep light as the explicit default. We can re-add `wotnow` later once onboarding is stable.
    themes: [
      {
        wotnow_compact: {
          ...daisyThemes["light"],
          "--rounded-box": "0.5rem",
          "--rounded-btn": "0.375rem",
          "--rounded-badge": "0.375rem",
          "--padding-card": "0.75rem",
          "--tab-padding": "0.25rem 0.5rem",
          "--navbar-padding": "0.375rem",
          "--btn-text-case": "none"
        }
      },
      "light",
      "dark",
      "corporate",
      "cupcake",
      "aqua",
      "forest"
    ],
  },
  plugins: [require('daisyui')],
}

module.exports = config
