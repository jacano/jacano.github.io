import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('blog');
  const sorted = [...posts].sort((a, b) => +new Date(b.data.date) - +new Date(a.data.date));
  return rss({
    title: 'Juan Antonio Cano Salado — Blog',
    description: 'Articles on Web3 security, C# and .NET, architecture and technical leadership.',
    site: context.site ?? 'https://jacano.github.io',
    items: sorted.map((post) => ({
      title: post.data.title,
      description: post.data.excerpt,
      pubDate: new Date(post.data.date),
      link: `/blog/${post.id.replace(/\.md$/, '').split('/').pop()}/`,
      categories: [post.data.tag],
    })),
  });
}
