/** @type {import('tailwindcss').Config} */
module.exports = {
  // Enable class-based dark mode so `next-themes` can toggle it
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
         colors: {
           primary: {
             DEFAULT: '#4A90E2',
             light: '#A4C8F0',
             dark: '#0E4B8C',
           },
           secondary: {
             DEFAULT: '#7ED321',
             light: '#B8E986',
             dark: '#417505',
           },
           accent: {
             DEFAULT: '#F5A623',
             light: '#F8C471',
             dark: '#B8791A',
           },
           neutral: {
             lightest: '#F8F9FA',
             lighter: '#E9ECEF',
             light: '#DEE2E6',
             DEFAULT: '#CED4DA',
             dark: '#ADB5BD',
             darker: '#6C757D',
             darkest: '#212529',
           },
         },
         keyframes: {
           fadeIn: {
             '0%': { opacity: '0', transform: 'translateY(20px)' },
             '100%': { opacity: '1', transform: 'translateY(0)' },
           },
         },
         animation: {
           fadeIn: 'fadeIn 1s ease-out forwards',
         },
       },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
