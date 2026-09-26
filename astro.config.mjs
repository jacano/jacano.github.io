import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://jacano.github.io',
  base: '/',
  output: 'static',
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  }
});
