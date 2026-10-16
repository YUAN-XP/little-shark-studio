// Outside these spans every bilinear alpha sample is zero. Account for the
// largest horizontal sway, the vertical crown motion and neighboring texels.
export function palmMaskBounds(pixels, width, height) {
  const left = new Int32Array(height).fill(width), right = new Int32Array(height).fill(-1);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!pixels[(y * width + x) * 4 + 3]) continue;
    left[y] = Math.min(left[y], x); right[y] = Math.max(right[y], x);
  }
  const starts = new Int32Array(height), ends = new Int32Array(height);
  for (let y = 3; y < height - 3; y++) {
    let lo = width, hi = -1;
    for (let row = Math.max(0, y - 2); row <= Math.min(height - 1, y + 2); row++) {
      lo = Math.min(lo, left[row]); hi = Math.max(hi, right[row]);
    }
    if (hi >= 0) { starts[y] = Math.max(3, lo - 11); ends[y] = Math.min(width - 3, hi + 12); }
  }
  return { starts, ends };
}
