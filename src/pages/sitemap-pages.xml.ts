import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const baseUrl = (site ?? new URL('https://jacano.github.io')).toString().replace(/\/$/, '');

  const pages = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/cv/', priority: '0.8', changefreq: 'monthly' },
    { loc: '/blog/', priority: '0.9', changefreq: 'weekly' },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <priority>${page.priority}</priority>
    <changefreq>${page.changefreq}</changefreq>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(xml);
};
