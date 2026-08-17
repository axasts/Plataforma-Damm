/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta "premium dark editorial" · CF Damm
        damm: {
          bg: '#0a0b0d',       // fondo casi negro
          panel: '#101216',    // panel
          panel2: '#14161b',   // panel elevado
          ink: '#f3f1ec',      // texto principal (cálido, casi blanco)
          muted: '#9b968d',    // texto secundario
          faint: '#6d6960',    // texto terciario / etiquetas
          line: 'rgba(243,241,236,0.09)',   // filete fino
          line2: 'rgba(243,241,236,0.16)',  // filete algo más marcado
          red: '#e01f34',
          'red-dark': '#b3162a',
          'red-darker': '#7A0A1C',
          gold: '#c9a54e',
          'gold-dark': '#a8863a',
          good: '#4fb286',     // verde semántico ("bien")
        },
      },
      fontFamily: {
        display: ['Archivo', 'system-ui', 'sans-serif'],
        sans: ['Hanken Grotesk', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
