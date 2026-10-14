import test from 'node:test';
import assert from 'node:assert/strict';
import { bitmapInFrame } from '../src/newspaper-image-geometry.js';

test('a square cover uses the same center crop in a tall accordion and a wide paper frame', () => {
  const natural = { width: 1000, height: 1000 };
  const source = bitmapInFrame({ left: 50, top: 20, width: 150, height: 460 }, { left: -105, top: 20, width: 460, height: 460 }, natural);
  assert.deepEqual(source, { x: -155, y: 0, width: 460, height: 460 });
  const destination = bitmapInFrame({ left: 75, top: 160, width: 410, height: 250 }, { left: 75, top: 160, width: 410, height: 250 }, natural);
  assert.deepEqual(destination, { x: 0, y: -80, width: 410, height: 410 });
});
test('portrait and landscape originals cover either frame without stretching their bitmap', () => {
  for (const natural of [{ width: 900, height: 1200 }, { width: 1920, height: 1080 }]) {
    for (const frame of [{ left: 10, top: 10, width: 110, height: 460 }, { left: 20, top: 60, width: 430, height: 300 }]) {
      const crop = bitmapInFrame(frame, frame, natural);
      assert.ok(Math.abs(crop.width / crop.height - natural.width / natural.height) < 1e-9);
      assert.ok(crop.width >= frame.width && crop.height >= frame.height);
      assert.ok(crop.x <= 0 && crop.y <= 0);
      assert.ok(crop.x + crop.width >= frame.width && crop.y + crop.height >= frame.height);
    }
  }
});
test('unloaded images and zero-size hidden frames use the fade fallback', () => {
  const frame = { left: 0, top: 0, width: 400, height: 300 };
  assert.equal(bitmapInFrame(frame, frame, { width: 0, height: 0 }), null);
  assert.equal(bitmapInFrame({ ...frame, width: 0 }, frame, { width: 1000, height: 1000 }), null);
});
