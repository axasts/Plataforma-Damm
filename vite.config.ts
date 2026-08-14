import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Desplegament a Vercel: la web es serveix a l'arrel del domini.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
