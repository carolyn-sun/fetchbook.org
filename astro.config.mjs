import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  server: {
    host: "127.0.0.1",
    port: 8787,
  },
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
});
