import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://jacano.github.io',
  base: '/',
  output: 'static',
  viewTransitions: {
    prefer: 'navigate'
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  }
});
