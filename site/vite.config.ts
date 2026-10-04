import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// dev only: stand-in for public/api/contact.php (PHP is not available locally)
const devContactApi = {
  name: 'dev-contact-api',
  configureServer(server: { middlewares: { use: (p: string, h: (req: any, res: any) => void) => void } }) {
    server.middlewares.use('/api/contact.php', (req, res) => {
      let body = ''
      req.on('data', (c: string) => (body += c))
      req.on('end', () => { console.log('[dev] enquiry', body); res.setHeader('Content-Type', 'application/json'); res.end('{"ok":true}') })
    })
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devContactApi],
  build: { outDir: 'dist', emptyOutDir: true },
})
