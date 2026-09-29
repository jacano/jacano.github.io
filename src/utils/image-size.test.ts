import { describe, expect, it } from 'vitest';
import { sizeOfFile, sizeOfJpeg, sizeOfPng, sizeOfSvg, sizeOfWebp } from './image-size.mjs';
import figureSize from './satteri-figure-size.mjs';

/** A PNG header is all the reader needs: the IHDR chunk carries the size. */
function pngHeader(width: number, height: number) {
  const buffer = Buffer.alloc(24);
  buffer.writeUInt32BE(0x89504e47, 0);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

/** A JPEG is a chain of segments up to the frame header. */
function jpegHeader(width: number, height: number) {
  const buffer = Buffer.alloc(20);
  buffer.writeUInt16BE(0xffd8, 0);
  buffer.writeUInt16BE(0xffc0, 2);
  buffer.writeUInt16BE(17, 4);
  buffer.writeUInt16BE(height, 7);
  buffer.writeUInt16BE(width, 9);
  return buffer;
}

/** A lossless WebP announces its size as width minus one, three bytes each. */
function webpHeader(width: number, height: number) {
  const buffer = Buffer.alloc(30);
  buffer.write('RIFF', 0, 'ascii');
  buffer.write('WEBP', 8, 'ascii');
  buffer.write('VP8X', 12, 'ascii');
  buffer.writeUIntLE(width - 1, 24, 3);
  buffer.writeUIntLE(height - 1, 27, 3);
  return buffer;
}

describe('the size in a header', () => {
  it('reads a PNG', () => {
    expect(sizeOfPng(pngHeader(640, 480))).toEqual({ width: 640, height: 480 });
    expect(sizeOfPng(Buffer.alloc(4))).toBeNull();
  });

  it('reads a JPEG', () => {
    expect(sizeOfJpeg(jpegHeader(640, 480))).toEqual({ width: 640, height: 480 });
    expect(sizeOfJpeg(Buffer.from('not a jpeg'))).toBeNull();
  });

  it('reads a WebP', () => {
    expect(sizeOfWebp(webpHeader(640, 480))).toEqual({ width: 640, height: 480 });
    expect(sizeOfWebp(Buffer.from('RIFF____NOPE____________'))).toBeNull();
  });

  it('reads the ratio of an SVG from its root tag alone', () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 560"><rect width="32" height="32"/></svg>',
    );
    // An inner shape must not be mistaken for the figure: it carries its own size.
    expect(sizeOfSvg(svg)).toEqual({ width: 1100, height: 560 });
    expect(sizeOfSvg(Buffer.from('<div>no svg here</div>'))).toBeNull();
  });

  it('reads the width and the height of an SVG that states them', () => {
    expect(sizeOfSvg(Buffer.from('<svg width="24" height="16"></svg>'))).toEqual({
      width: 24,
      height: 16,
    });
  });
});

describe('the size of the files the site ships', () => {
  it('reads the chart, the diagram and the two photographs', () => {
    expect(sizeOfFile('public/blog/deepseek-harness-session-stats.png')).toEqual({
      width: 620,
      height: 258,
    });
    expect(sizeOfFile('public/blog/arp-mitm-flow.svg')).toEqual({ width: 1100, height: 560 });
    expect(sizeOfFile('public/avatar.webp')).toEqual({ width: 460, height: 460 });
    expect(sizeOfFile('public/avatar.jpg')).toEqual({ width: 460, height: 460 });
  });
});

/** Run the visitor over one image node with the given source. */
function visit(src: string) {
  const properties: Record<string, unknown> = { src };
  const plugin = figureSize({ publicDir: 'public' });
  plugin.element.visit(
    { properties },
    {
      setProperty: (_node: unknown, key: string, value: unknown) => {
        properties[key] = value;
      },
    },
  );
  return properties;
}

describe('figureSize', () => {
  it('writes the size of the file and defers the load', () => {
    expect(visit('/blog/arp-mitm-flow.svg')).toEqual({
      src: '/blog/arp-mitm-flow.svg',
      width: 1100,
      height: 560,
      loading: 'lazy',
      decoding: 'async',
    });
  });

  it('leaves a figure that this site does not serve alone', () => {
    expect(visit('https://example.com/a.png')).toEqual({ src: 'https://example.com/a.png' });
  });

  it('stops the build when the file is missing', () => {
    expect(() => visit('/blog/not-a-file.png')).toThrow(/is missing/);
  });
});
