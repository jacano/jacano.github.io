import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const baseUrl = 'https://jacano.github.io';
  const currentDate = new Date().toISOString();

  const posts = [
    { slug: 'web3-security-posture-management', date: '2025-11-15' },
    { slug: 'c-sharp-interop-nativo', date: '2025-08-02' },
    { slug: 'head-of-engineering-remoto', date: '2025-05-20' },
    { slug: 'primer-post', date: '2025-04-10' },
    { slug: 'realtime-mobile-object-detector-xamarin-android', date: '2019-07-04' },
    { slug: 'wasm-sample-mono-webassembly-sdk', date: '2019-05-04' },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${posts.map(post => `  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${post.date}</lastmod>
    <priority>0.7</priority>
    <changefreq>monthly</changefreq>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};