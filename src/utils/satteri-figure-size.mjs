import path from 'node:path';
import { sizeOfFile } from './image-size.mjs';

/**
 * Give every figure of a Markdown file its real size, and defer the load.
 *
 * A figure without a width and a height makes the browser guess, and the page
 * shifts when the file arrives. The size comes from the file itself, so it
 * cannot drift from the image.
 *
 * This is a Sätteri HAST plugin, the pipeline that `markdown.processor` runs.
 */
export default function figureSize({ publicDir = 'public' } = {}) {
  return {
    name: 'figure-size',
    element: {
      filter: ['img'],
      visit(node, ctx) {
        const src = node.properties?.src;
        if (typeof src !== 'string' || /^([a-z]+:)?\/\//i.test(src) || src.startsWith('data:')) {
          return;
        }
        const file = path.join(publicDir, decodeURIComponent(src.replace(/^\//, '')));
        let measured;
        try {
          measured = sizeOfFile(file);
        } catch {
          throw new Error(`[figure-size] ${file} is missing. Fix the path of the figure, or add the file.`);
        }
        if (!measured) {
          throw new Error(`[figure-size] ${file} has no readable size. Use SVG, PNG, JPEG or WebP.`);
        }
        ctx.setProperty(node, 'width', measured.width);
        ctx.setProperty(node, 'height', measured.height);
        ctx.setProperty(node, 'loading', 'lazy');
        ctx.setProperty(node, 'decoding', 'async');
      },
    },
  };
}
