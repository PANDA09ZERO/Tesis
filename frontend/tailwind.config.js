/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E8F0FE',
          100: '#D1E3FD',
          200: '#A4C7F9',
          300: '#76A9F5',
          400: '#498BF1',
          500: '#1C6DEE',
          600: '#1E40AF',
          700: '#1E3A8A',
          800: '#163366',
          900: '#0F2744',
        },
        secondary: {
          50: '#F5E6D3',
          100: '#EAD0B5',
          200: '#D4A987',
          300: '#BF8260',
          400: '#A95B38',
          500: '#934511',
          600: '#7C390E',
          700: '#652D0B',
          800: '#4E2108',
          900: '#371505',
        }
      }
    },
  },
  plugins: [],
}