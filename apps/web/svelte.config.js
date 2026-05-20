import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      strict: false,
    }),
    csp: {
      mode: 'hash',
      directives: {
        'default-src': ['self'],
        'script-src': ['self', 'https://static.cloudflareinsights.com', 'https://umami.raqz.link'],
        'style-src': ['self', 'unsafe-inline'],
        'img-src': ['self', 'data:', 'https:'],
        'connect-src': [
          'self',
          'https://cloudflareinsights.com',
          'https://*.cloudflareinsights.com',
          'https://umami.raqz.link',
        ],
        'base-uri': ['self'],
        'form-action': ['self'],
      },
    },
  },
};
