import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  // Serve files from `public` as static assets and keep project root
  // as Vite root so `index.html` can import `/src/*` modules.
  publicDir: 'public',
  build: {
    outDir: './dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: true,
  }
})
