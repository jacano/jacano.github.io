import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { slugOf } from '../utils/site';

export const GET: APIRoute = async ({ site }) => {
  const baseUrl = (site ?? new URL('https://jacano.github.io')).toString().replace(/\/$/, '');
  const posts = await getCollection('blog');
  const sorted = [...posts].sort((a, b) => +new Date(b.data.date) - +new Date(a.data.date));

  const urls = sorted
    .map(
      (post) => `  <url>
    <loc>${baseUrl}/blog/${slugOf(post)}/</loc>
    <lastmod>${post.data.date}</lastmod>
    <priority>0.7</priority>
    <changefreq>monthly</changefreq>
  </url>`,
    )
    .join('\n');

  // A header on this response does not survive a static build: GitHub Pages
  // serves the file with its own content type and cache policy.
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
};
