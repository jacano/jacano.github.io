import { defineConfig, fontProviders } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import figureSize from './src/utils/satteri-figure-size.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://jacano.github.io',
  base: '/',
  output: 'static',
  // The fonts come from Google at build time and are served from this origin
  // at run time, so a visitor makes no third party request. Astro writes the
  // @font-face rules, preloads the files, and adjusts the metrics of the
  // fallback so the swap does not move the text.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: [400, 500, 600, 700, 800],
      styles: ['normal'],
      subsets: ['latin'],
      display: 'swap',
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      display: 'swap',
      fallbacks: ['monospace'],
    },
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      // Do not wrap code lines. A wrapped line breaks in the middle of a token,
      // and a shell command that wraps reads as two commands on a phone. The
      // block scrolls sideways instead.
      wrap: false,
    },
    processor: satteri({
      hastPlugins: [figureSize({ publicDir: 'public' })],
    }),
  },
});
