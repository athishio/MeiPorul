/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        supported: {
          light: '#dcfce7',
          DEFAULT: '#16a34a',
          dark: '#15803d',
          border: '#86efac'
        },
        contradicted: {
          light: '#fee2e2',
          DEFAULT: '#dc2626',
          dark: '#b91c1c',
          border: '#fca5a5'
        },
        nei: {
          light: '#fef9c3',
          DEFAULT: '#ca8a04',
          dark: '#a16207',
          border: '#fde047'
        }
      }
    },
  },
  plugins: [],
}
