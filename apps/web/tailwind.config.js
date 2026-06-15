/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#e0f2e9',
          DEFAULT: '#2b9348',
          dark: '#007f5f'
        }
      }
    },
  },
  plugins: [],
}
