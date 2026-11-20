/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f2f5ec',
          100: '#e5ecd9',
          200: '#c9d9b6',
          300: '#a9c18d',
          400: '#87a568',
          500: '#6d8f55',
          600: '#557743',
          700: '#405f38',
          800: '#304b30',
          900: '#223a28',
        },
      },
    },
  },
  plugins: [],
};
