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
        // Tinta institucional: rampa continua (antes 500 era más claro y saturado que 600).
        primary: {
          50: '#EEF2FB',
          100: '#DCE4F7',
          200: '#B9C8EE',
          300: '#8FA6E0',
          400: '#5F7FCF',
          500: '#3A5FBF',
          600: '#23408E',
          700: '#1D3577',
          800: '#182C62',
          900: '#13234D',
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