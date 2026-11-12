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

/** The Open Graph locale of the site. English only. */
export const locale = 'en_US';

/**
 * Years of professional experience, taken from the first year of a CV timeline.
 * The number is derived so it cannot drift from the list it describes.
 */
export function experienceYears(periods: readonly string[], now = new Date()): number {
  const starts = periods
    .map((period) => /(\d{4})/.exec(period)?.[1])
    .filter((year): year is string => year !== undefined)
    .map(Number);
  if (starts.length === 0) return 0;
  return now.getFullYear() - Math.min(...starts);
}

/** Fill the `{years}` placeholder of a CV sentence with the derived count. */
export function withYears(text: string, years: number): string {
  return text.replace('{years}', String(years));
}
