import { describe, expect, it } from 'vitest';
import { base, experienceYears, readTime, slugOf, withYears } from './site';

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

describe('experienceYears', () => {
  const now = new Date('2026-10-15T00:00:00Z');

  it('counts from the earliest start year of the timeline', () => {
    expect(experienceYears(['2025 — Present', '2021 — 2023', '2012 — 2013'], now)).toBe(14);
  });

  it('reads a period that holds only one year', () => {
    expect(experienceYears(['2019'], now)).toBe(7);
  });

  it('returns zero when there is no year to read', () => {
    expect(experienceYears([], now)).toBe(0);
    expect(experienceYears(['Present'], now)).toBe(0);
  });
});

describe('withYears', () => {
  it('replaces the placeholder with the count', () => {
    expect(withYears('with {years}+ years of experience', 14)).toBe('with 14+ years of experience');
  });

  it('leaves a sentence without the placeholder alone', () => {
    expect(withYears('no count here', 14)).toBe('no count here');
  });
});
