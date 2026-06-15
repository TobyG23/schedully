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
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea6c0a',
          700: '#c2570a',
          800: '#9a4412',
          900: '#7c3912',
          950: '#431d07',
        },
        navy: {
          50: '#f0f3fa',
          100: '#dde4f4',
          200: '#c0ccea',
          300: '#94a9d9',
          400: '#6480c3',
          500: '#4562b3',
          600: '#3550a0',
          700: '#2c4285',
          800: '#1e2d5e',
          900: '#172349',
          950: '#0f1830',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
