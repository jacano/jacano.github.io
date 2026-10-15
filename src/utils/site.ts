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

/** The part of a post the language helpers read. */
export interface LangPost {
  id: string;
  data: { lang?: string; pair?: string };
}

/** The language of a post. English is the default. */
export function langOf(post: LangPost): string {
  return post.data.lang ?? 'en';
}

/** The name of a language, as a reader sees it in the switch. */
export function langLabel(code: string): string {
  return code === 'es' ? 'Español' : 'English';
}

/** The short mark of a language, for a compact list. */
export function langTag(code: string): string {
  return code.toUpperCase();
}

/**
 * Every file of the same article, the current one included. Posts without a
 * `pair` are their own article and return only themselves.
 */
export function translations<T extends LangPost>(posts: T[], post: T): T[] {
  const key = post.data.pair;
  if (!key) return [post];
  return posts.filter((other) => other.data.pair === key);
}

/** The posts a reader sees first: one language, English by default. */
export function inLanguage<T extends LangPost>(posts: T[], lang = 'en'): T[] {
  return posts.filter((post) => langOf(post) === lang);
}

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
