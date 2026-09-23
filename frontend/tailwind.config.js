/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#16120f',
        surface: {
          DEFAULT: '#201c19',
          1: '#201c19',
          2: '#292623',
        },
        border: 'rgba(255, 255, 255, 0.1)',
        'text-primary': '#ffffff',
        'text-secondary': '#cecdc9',
        'text-tertiary': '#9f9b92',
        accent: {
          DEFAULT: '#ed670f',
          soft: '#f4b084',
          deep: '#622d08',
        },
        verdict: {
          supported: '#3ddc84', // phosphor green "OK"
          contradicted: '#ff4d4d', // terminal "FAULT" red
          nei: '#9f9b92', // no signal (text-tertiary)
        },
      },
      fontFamily: {
        brand: ['"Inter Tight"', '"Inter Tight Fallback"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Inter Tight"', '"Inter Tight Fallback"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        tamil: ['"Anek Tamil"', '"Noto Sans Tamil"', 'sans-serif'],
        sans: ['"Inter Tight"', '"Inter Tight Fallback"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"Inter Tight"', '"Inter Tight Fallback"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'monospace'],
        terminal: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '0px',
        pill: '10px',
        badge: '10px',
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        10: '40px',
        15: '60px',
        16: '64px',
      },
      maxWidth: {
        'content': '1440px',
      },
    },
  },
  plugins: [],
}
