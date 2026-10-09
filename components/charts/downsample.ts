/** Largest-triangle-three-buckets. Always keeps the first and last index. */
export function lttbIndices(xs: number[], ys: number[], target: number): number[] {
  const length = Math.min(xs.length, ys.length);
  if (length === 0) return [];
  if (target >= length) return Array.from({ length }, (_, index) => index);
  if (target < 3) return length === 1 ? [0] : [0, length - 1];

  const indices: number[] = [0];
  const every = (length - 2) / (target - 2);
  let previous = 0;

  for (let bucket = 0; bucket < target - 2; bucket++) {
    const rangeStart = Math.floor(bucket * every) + 1;
    const rangeEnd = Math.min(length - 1, Math.floor((bucket + 1) * every) + 1);
    const avgStart = Math.floor((bucket + 1) * every) + 1;
    const avgEnd = Math.min(length, Math.floor((bucket + 2) * every) + 1);
    let avgX = 0;
    let avgY = 0;
    const avgCount = Math.max(1, avgEnd - avgStart);
    for (let i = avgStart; i < avgEnd; i++) {
      avgX += xs[i]!;
      avgY += ys[i]!;
    }
    avgX /= avgCount;
    avgY /= avgCount;

    const ax = xs[previous]!;
    const ay = ys[previous]!;
    let maxArea = -1;
    let chosen = Math.min(rangeStart, length - 2);
    const end = Math.max(rangeStart + 1, rangeEnd);
    for (let i = rangeStart; i < end && i < length - 1; i++) {
      const px = xs[i]!;
      const py = ys[i]!;
      const area = Math.abs((ax - avgX) * (py - ay) - (ax - px) * (avgY - ay));
      if (area > maxArea) {
        maxArea = area;
        chosen = i;
      }
    }
    indices.push(chosen);
    previous = chosen;
  }

  indices.push(length - 1);
  return indices;
}

export function seriesIndices(xs: number[], ys: number[], target = 500): number[] {
  if (xs.length <= target) return xs.map((_, index) => index);
  return lttbIndices(xs, ys, target);
}
