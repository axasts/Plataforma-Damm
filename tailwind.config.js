/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta corporativa CF Damm (a partir de l'escut)
        damm: {
          red: '#C8102E',
          'red-dark': '#9E0C24',
          'red-darker': '#7A0A1C',
          gold: '#F4C300',
          'gold-dark': '#D9AE00',
          cream: '#FFF7E6',
          ink: '#1A1414',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
