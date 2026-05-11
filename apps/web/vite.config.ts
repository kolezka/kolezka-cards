import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3001',
      '/c': 'http://localhost:3001',
      '/auth': 'http://localhost:3001',
      '/healthz': 'http://localhost:3001',
    },
  },
});
