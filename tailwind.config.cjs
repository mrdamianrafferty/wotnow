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
    extend: {
      // Gardening-themed animations for Grow Daisy
      // All respect prefers-reduced-motion via motion-safe: variant
      animation: {
        // Entry animations
        'sprout': 'sprout 400ms ease-out',
        'scale-in': 'scaleIn 200ms ease-out',
        'slide-up': 'slideUp 250ms ease-out',
        'slide-down': 'slideDown 200ms ease-in',
        'fade-in': 'fadeIn 200ms ease-out',
        'fade-out': 'fadeOut 200ms ease-in forwards',
        // Exit animations
        'leaf-fall': 'leafFall 500ms ease-in forwards',
        // Feedback animations
        'check-pop': 'checkPop 300ms ease-out',
        'water-ripple': 'waterRipple 600ms ease-out forwards',
        // Ambient animations
        'gentle-sway': 'gentleSway 2s ease-in-out infinite',
      },
      keyframes: {
        // Sprout: plant growing from ground
        sprout: {
          '0%': { transform: 'scaleY(0) translateY(20%)', opacity: '0', transformOrigin: 'bottom' },
          '60%': { transform: 'scaleY(1.05) translateY(-2%)', opacity: '1' },
          '100%': { transform: 'scaleY(1) translateY(0)', opacity: '1' },
        },
        // Leaf fall: gentle descent with rotation
        leafFall: {
          '0%': { transform: 'translateY(0) rotate(0deg) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(30px) rotate(45deg) scale(0.8)', opacity: '0' },
        },
        // Water ripple: expanding circle
        waterRipple: {
          '0%': { transform: 'scale(0.8)', opacity: '0.7' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
        // Gentle sway: plant in breeze
        gentleSway: {
          '0%, 100%': { transform: 'rotate(-1deg)' },
          '50%': { transform: 'rotate(1deg)' },
        },
        // Standard fade in
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Standard fade out
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        // Scale in from center
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        // Slide up from below
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        // Slide down from above
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        // Pop effect for checkmarks
        checkPop: {
          '0%': { transform: 'scale(0)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
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
