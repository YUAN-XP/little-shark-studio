import test from 'node:test';
import assert from 'node:assert/strict';
import { palmMaskBounds } from '../src/palm-mask-bounds.js';

test('bounded palm sampling retains every possible nonzero texel across its animation', () => {
  const width = 381, height = 354, mask = new Uint8ClampedArray(width * height * 4);
  for (let y = 20; y < height - 16; y++) for (let x = 30; x < width - 30; x++) {
    if (y < 120 || Math.abs(x - width / 2) < 14) mask[(y * width + x) * 4 + 3] = (x * 29 + y * 17) % 255 + 1;
  }
  const { starts, ends } = palmMaskBounds(mask, width, height);
  let bounded = 0;
  for (let y = 3; y < height - 3; y++) bounded += ends[y] - starts[y];
  assert.ok(bounded < (width - 6) * (height - 6) * .55);
  for (let frame = 0; frame < 480; frame += 7) {
    const phase = 2 * Math.PI * frame / 480, sin = Math.sin(4 * phase), cos = Math.cos(4 * phase);
    for (let y = 3; y < height - 3; y++) {
      const bend = Math.pow(Math.max(0, Math.min(1, (333 - y) / 316)), 1.8);
      const crown = Math.max(0, Math.min(1, (265 - y) / 75));
      const sway = (6.4 * Math.sin(2 * phase) + .9 * Math.sin(4 * phase)) * bend;
      for (let x = 3; x < width - 3; x++) {
        if (x >= starts[y] && x < ends[y]) continue;
        const ix = Math.floor(x - sway - 1.1 * crown * (sin * Math.cos(x * .034) + cos * Math.sin(x * .034)));
        const iy = Math.floor(y - 1.05 * crown * (sin * Math.sin(x * .034) - cos * Math.cos(x * .034)));
        if (ix < 0 || ix >= width - 1 || iy < 0 || iy >= height - 1) continue;
        const p = (iy * width + ix) * 4;
        assert.equal(mask[p + 3] | mask[p + 7] | mask[p + width * 4 + 3] | mask[p + width * 4 + 7], 0);
      }
    }
  }
});
