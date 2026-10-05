import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { degeneratePolylines, polylinePointCounts } from './figure-series.mjs';

describe('polylinePointCounts', () => {
  it('counts the points of every polyline', () => {
    const svg = '<polyline points="1,2 3,4 5,6"/><polyline points="7,8 9,10"/>';
    expect(polylinePointCounts(svg)).toEqual([3, 2]);
  });

  it('finds nothing in a figure without lines', () => {
    expect(polylinePointCounts('<svg><rect width="1" height="1"/></svg>')).toEqual([]);
  });
});

describe('degeneratePolylines', () => {
  it('flags a line that cannot be a series', () => {
    expect(degeneratePolylines('<polyline points="1,2 3,4"/>')).toEqual([2]);
    expect(degeneratePolylines('<polyline points="1,2 3,4 5,6"/>')).toEqual([]);
  });
});

describe('the figures of the blog', () => {
  const figures = readdirSync('public/blog').filter((name) => name.endsWith('.svg'));

  it('has figures to check', () => {
    expect(figures.length).toBeGreaterThan(0);
  });

  for (const name of figures) {
    it(`${name} draws a series and not one straight line`, () => {
      const svg = readFileSync(`public/blog/${name}`, 'utf8');
      // Two points per line is the signature of a figure built from a CSV with two
      // rows. The file renders and it says nothing, so the test says it instead.
      expect(degeneratePolylines(svg)).toEqual([]);
    });
  }
});
