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
        xoj: {
          bg: '#f8fafc',
          canvas: '#ffffff',
          toolbar: '#1e293b',
          border: '#e2e8f0',
          accent: '#3b82f6',
        }
      }
    },
  },
  plugins: [],
}

