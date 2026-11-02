/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ayur: {
          50: '#f4f7f4',
          100: '#e5ece5',
          200: '#cbd9cb',
          300: '#a3beaa',
          400: '#759d7f',
          500: '#4d7c58',
          600: '#3c6346',
          700: '#314f39',
          800: '#294030',
          900: '#233629',
          950: '#111d15',
        },
        saffron: {
          50: '#fff9eb',
          100: '#feedc7',
          200: '#fedb8a',
          300: '#fec24d',
          400: '#fda61e',
          500: '#f5870b',
          600: '#d96406',
          700: '#b44408',
          800: '#92360e',
          900: '#782e0f',
        },
        clay: {
          50: '#faf6f3',
          100: '#f4ebe5',
          200: '#e8d6cb',
          300: '#d9bda9',
          400: '#c59d83',
          500: '#b38266',
          600: '#a27056',
          700: '#875b47',
          800: '#6f4c3c',
          900: '#5b4034',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
