const brand = require('./lib/brand.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './sections/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        codiva: {
          primary: brand.colors.primary,
          'primary-dark': brand.colors.primaryDark,
          background: brand.colors.background,
          secondary: brand.colors.secondary,
          muted: brand.colors.muted,
          'accent-light': brand.colors.accentLight,
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwind-scrollbar-hide')],
};
