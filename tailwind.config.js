/** @type {import('tailwindcss').Config} */
module.exports = {
  // Enable class-based dark mode so `next-themes` can toggle it
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
