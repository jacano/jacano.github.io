const rawBase = import.meta.env.BASE_URL;

/** The site base without the trailing slash. It is "" for the root. */
export const base = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

/** Return the slug of a post, from the id of the content collection. */
export function slugOf(post: { id: string }): string {
  return post.id.replace(/\.md$/, '').split('/').pop()!;
}

/** Return the reading time of a post body, for example "2 min". */
export function readTime(body: string | undefined): string {
  const text = String(body || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_\-[\]()]/g, ' ');
  const words = (text.match(/[A-Za-z0-9']+/g) || []).length;
  return Math.max(1, Math.round(words / 200)) + ' min';
}
