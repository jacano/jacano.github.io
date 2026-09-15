const rawBase = import.meta.env.BASE_URL;

/** The site base without the trailing slash. It is "" for the root. */
export const base = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

/** Return the slug of a post, from the id of the content collection. */
export function slugOf(post: { id: string }): string {
  return post.id.replace(/\.md$/, '').split('/').pop()!;
}
