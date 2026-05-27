/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        primary: '#1a73e8',
        'primary-hover': '#1557b0',
        'primary-light': '#e8f0fe',
        surface: '#f8f9fa',
        'surface-2': '#f1f3f4',
        border: '#e8eaed',
      },
    },
  },
  plugins: [],
}
