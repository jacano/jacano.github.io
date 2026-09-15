import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://jacano.github.io',
  base: '/',
  output: 'static',
  redirects: {
    '/blog/read-your-real-electricity-use': '/blog/understand-electricity-patterns/'
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  }
});
