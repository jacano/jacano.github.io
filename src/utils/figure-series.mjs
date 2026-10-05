/**
 * How many points each polyline of an SVG figure draws.
 *
 * A chart of a run has one point per logged step. A figure built from the wrong
 * CSV still renders: the box is the right size, the axes are there, and the curve
 * is a straight line from the first row to the last. It says nothing, and nothing
 * in the build complains. This is the reader that catches it.
 */
export function polylinePointCounts(svg) {
  return [...String(svg).matchAll(/<polyline[^>]*\bpoints="([^"]*)"/g)].map(
    ([, points]) => points.trim().split(/\s+/).filter(Boolean).length,
  );
}

/** The polylines that draw too few points to be a series. */
export function degeneratePolylines(svg, minimum = 3) {
  return polylinePointCounts(svg).filter((count) => count < minimum);
}
