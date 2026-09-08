import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const baseUrl = 'https://jacano.github.io';
  const posts = await getCollection('blog');
  const sorted = [...posts].sort((a, b) => +new Date(b.data.date) - +new Date(a.data.date));

  const urls = sorted
    .map((post) => {
      const slug = post.id.replace(/\.md$/, '').split('/').pop();
      return `  <url>
    <loc>${baseUrl}/blog/${slug}</loc>
    <lastmod>${post.data.date}</lastmod>
    <priority>0.7</priority>
    <changefreq>monthly</changefreq>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
