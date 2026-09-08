import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const baseUrl = 'https://jacano.github.io';
  const currentDate = new Date().toISOString();

  const pages = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/cv', priority: '0.8', changefreq: 'monthly' },
    { loc: '/blog', priority: '0.9', changefreq: 'weekly' },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${currentDate}</lastmod>
    <priority>${page.priority}</priority>
    <changefreq>${page.changefreq}</changefreq>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};