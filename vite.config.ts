import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El base ha de coincidir amb el nom del repositori per a GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: '/Plataforma-Damm/',
})
