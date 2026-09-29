import { describe, expect, it } from 'vitest';
import { base, readTime, slugOf } from './site';

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
