/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ed',
          100: '#fcecd4',
          200: '#f8d5a8',
          300: '#f3b871',
          400: '#ed9138',
          500: '#e97316',
          600: '#da5a0c',
          700: '#b5420c',
          800: '#903512',
          900: '#742e12',
          950: '#3f1407',
        },
      },
    },
  },
  plugins: [],
}
