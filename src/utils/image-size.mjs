import { readFileSync } from 'node:fs';

/**
 * Read the intrinsic size of an image file from its header.
 *
 * The build needs the size of a figure before the browser loads it, so the
 * figure can reserve its box and the page does not shift. Only the formats the
 * site uses are supported: SVG for a diagram, PNG for a chart or a screenshot,
 * JPEG and WebP for a photograph.
 */

/** PNG: the IHDR chunk holds the width and the height, big endian. */
export function sizeOfPng(buffer) {
  if (buffer.length < 24 || buffer.readUInt32BE(0) !== 0x89504e47) return null;
  if (buffer.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** JPEG: walk the segments up to the frame header (SOF0 to SOF15). */
export function sizeOfJpeg(buffer) {
  if (buffer.length < 4 || buffer.readUInt16BE(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    // A standalone marker carries no length.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  return null;
}

/** WebP: the three variants store the size in different places. */
export function sizeOfWebp(buffer) {
  if (buffer.length < 30) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    return null;
  }
  const variant = buffer.toString('ascii', 12, 16);
  if (variant === 'VP8X') {
    return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
  }
  if (variant === 'VP8 ') {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }
  if (variant === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

/** SVG: the width and height attributes of the root tag, or its viewBox ratio. */
export function sizeOfSvg(buffer) {
  const head = buffer.subarray(0, 8192).toString('utf8');
  // Only the root tag counts: an inner shape carries its own width and height.
  const root = /<svg\b[^>]*>/i.exec(head);
  if (!root) return null;
  const [tag] = root;
  const width = /\swidth\s*=\s*["']?([\d.]+)/i.exec(tag);
  const height = /\sheight\s*=\s*["']?([\d.]+)/i.exec(tag);
  if (width && height && +width[1] > 0 && +height[1] > 0) {
    return { width: Math.round(+width[1]), height: Math.round(+height[1]) };
  }
  const viewBox = /\sviewBox\s*=\s*["']\s*([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)/i.exec(
    tag,
  );
  if (viewBox && +viewBox[3] > 0 && +viewBox[4] > 0) {
    return { width: Math.round(+viewBox[3]), height: Math.round(+viewBox[4]) };
  }
  return null;
}

/** Return `{ width, height }` of an image file, or null when it cannot be read. */
export function sizeOfFile(file) {
  const buffer = readFileSync(file);
  return sizeOfSvg(buffer) ?? sizeOfPng(buffer) ?? sizeOfJpeg(buffer) ?? sizeOfWebp(buffer) ?? null;
}
