import { describe, expect, it } from 'vitest';
import { base, inLanguage, langLabel, langOf, langTag, readTime, slugOf, translations } from './site';

describe('slugOf', () => {
  it('drops the extension and the folder of a collection id', () => {
    expect(slugOf({ id: 'hello-world-why-i-started-blog.md' })).toBe('hello-world-why-i-started-blog');
    expect(slugOf({ id: 'nested/a-post.md' })).toBe('a-post');
  });
});

describe('readTime', () => {
  it('never reports less than a minute', () => {
    expect(readTime('')).toBe('1 min');
    expect(readTime(undefined)).toBe('1 min');
    expect(readTime('twelve words are not a minute')).toBe('1 min');
  });

  it('rounds the count at two hundred words a minute', () => {
    expect(readTime('word '.repeat(400))).toBe('2 min');
    expect(readTime('word '.repeat(500))).toBe('3 min');
  });

  it('does not count a code block or an inline snippet', () => {
    const body = `${'word '.repeat(600)}${'```js\nconst x = 1;\n```\n'}\`inlineCode()\``;
    expect(readTime(body)).toBe('3 min');
  });
});

describe('base', () => {
  it('is empty at the root of the domain', () => {
    expect(base).toBe('');
  });
});

const post = (id: string, lang?: string, pair?: string) => ({ id, data: { lang, pair } });

describe('langOf', () => {
  it('treats a post without a language as English', () => {
    expect(langOf(post('a.md'))).toBe('en');
    expect(langOf(post('a.md', 'en'))).toBe('en');
    expect(langOf(post('a.md', 'es'))).toBe('es');
  });
});

describe('inLanguage', () => {
  it('keeps one language and drops the rest', () => {
    const posts = [post('a.md'), post('b.md', 'es'), post('c.md', 'es', 'c')];
    expect(inLanguage(posts).map((p) => p.id)).toEqual(['a.md']);
    expect(inLanguage(posts, 'es').map((p) => p.id)).toEqual(['b.md', 'c.md']);
  });
});

describe('translations', () => {
  it('returns only the post itself when it has no pair', () => {
    const posts = [post('a.md'), post('b.md', 'es')];
    expect(translations(posts, posts[0])).toHaveLength(1);
  });

  it('groups every language of the same article and nothing else', () => {
    const posts = [post('a.md', 'en', 'a'), post('a-es.md', 'es', 'a'), post('b.md', 'en', 'b')];
    expect(translations(posts, posts[0]).map((p) => p.id)).toEqual(['a.md', 'a-es.md']);
    expect(translations(posts, posts[2]).map((p) => p.id)).toEqual(['b.md']);
  });
});

describe('langLabel and langTag', () => {
  it('names the two languages the site uses', () => {
    expect(langLabel('en')).toBe('English');
    expect(langLabel('es')).toBe('Español');
  });

  it('marks them with two letters', () => {
    expect(langTag('en')).toBe('EN');
    expect(langTag('es')).toBe('ES');
  });
});
