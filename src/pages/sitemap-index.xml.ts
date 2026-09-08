import type { APIRoute } from 'astro';

const posts = [
  'web3-security-posture-management',
  'c-sharp-interop-nativo',
  'head-of-engineering-remoto',
  'primer-post',
  'realtime-mobile-object-detector-xamarin-android',
  'wasm-sample-mono-webassembly-sdk'
];

export const GET: APIRoute = () => {
  const baseUrl = 'https://jacano.github.io';
  const currentDate = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-pages.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-blog.xml</loc>
    <lastmod>${currentDate}</lastmod>
  </sitemap>
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};