import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Railway injects PORT; `npm start` -> vite preview reads it (see package.json).
  preview: {
    // allow the Railway-generated *.up.railway.app host
    allowedHosts: true,
  },
})
