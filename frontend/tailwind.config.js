/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0b0d12',
          card: '#13161d',
          elev: '#1a1e27',
          hover: '#222631',
        },
        border: {
          DEFAULT: '#252a36',
          strong: '#3a4150',
        },
        accent: {
          DEFAULT: '#7c5cff',
          hover: '#6b4eff',
          soft: 'rgba(124, 92, 255, 0.15)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
