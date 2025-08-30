/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      "light",
      "dark",
      "aqua",
      "forest",
      "cupcake",
      {
        wotnow: {
          "primary": "#1E40AF",
          "primary-content": "#FFFFFF",
          "secondary": "#0D9488",
          "secondary-content": "#F0F9F7",
          "accent": "#F97316",
          "accent-content": "#FDF6E3",
          "neutral": "#27272A",
          "neutral-content": "#D4D4D8",
          "base-100": "#121212",
          "base-200": "#1F2937",
          "base-300": "#2E3B47",
          "base-content": "#E5E7EB",
          "info": "#3B82F6",
          "info-content": "#FFFFFF",
          "success": "#22C55E",
          "success-content": "#FFFFFF",
          "warning": "#FBBF24",
          "warning-content": "#202020",
          "error": "#EF4444",
          "error-content": "#FFFFFF",
        }
      }
    ],
  },
}
