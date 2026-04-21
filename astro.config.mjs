import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://jeffrey-liwanag.github.io',
  base: '/link-vault',
  integrations: [react(), tailwind()],
  output: 'static',
});
