// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://sandboxreseau.com',
  output: 'static',
  // Lets the build fetch and optimise podcast cover art from Substack's CDN.
  image: {
    domains: ['substackcdn.com'],
  },
  vite: {
    plugins: [tailwindcss()]
  }
});