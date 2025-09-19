// /Users/damianrafferty/Projects/WotNow/tailwind.config.js
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
      "light",
      "dark",
      "corporate",
      "cupcake",
      "aqua",
      "forest",
    ],
  },
  plugins: [require('daisyui')],
}

export default config
