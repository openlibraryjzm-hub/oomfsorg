/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        map: {
          dark: '#0b0f19',
          card: 'rgba(17, 24, 39, 0.85)',
          border: 'rgba(255, 255, 255, 0.1)',
          accent: '#3b82f6',
          accentHover: '#2563eb',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'maps': '0 2px 6px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
};
