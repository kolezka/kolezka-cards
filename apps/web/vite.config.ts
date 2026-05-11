import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const apiOrigin = process.env.VITE_API_ORIGIN ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
    strictPort: true,
    host: process.env.VITE_API_ORIGIN ? '0.0.0.0' : 'localhost',
    proxy: {
      '/api': apiOrigin,
      '/c': apiOrigin,
      '/auth': apiOrigin,
      '/healthz': apiOrigin,
    },
  },
});
