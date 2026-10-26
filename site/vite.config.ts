import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist', emptyOutDir: true },
  // the Django backend (backend/, runserver 127.0.0.1:8011) answers these paths, as it does on the server
  server: { proxy: Object.fromEntries(['/api', '/dashboard', '/media', '/static'].map((p) => [p, 'http://127.0.0.1:8011'])) },
})
