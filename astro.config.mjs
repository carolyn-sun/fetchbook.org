import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  server: {
    port: 8787,
  },
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
});
