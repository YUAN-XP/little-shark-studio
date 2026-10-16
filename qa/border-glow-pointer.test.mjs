import test from 'node:test';
import assert from 'node:assert/strict';
import { pointerGlowPose } from '../src/border-glow-pointer.js';

test('a wide navigation pill responds to each edge without lighting its center', () => {
  const rect = { left: 100, top: 20, width: 800, height: 64 };
  assert.deepEqual(pointerGlowPose(rect, 500, 52), { edge: 0, angle: 0 });
  for (const [x, y, angle] of [[100, 52, 270], [900, 52, 90], [500, 20, 0], [500, 84, 180]]) {
    assert.deepEqual(pointerGlowPose(rect, x, y), { edge: 100, angle });
  }
});
test('resized and portrait project panels keep normalized edge sensitivity', () => {
  for (const [width, height] of [[80, 460], [480, 460], [342, 90], [342, 350]]) {
    const rect = { left: 31, top: 200, width, height };
    assert.ok(Math.abs(pointerGlowPose(rect, 31 + width * .9, 200 + height / 2).edge - 80) < 1e-9);
    assert.ok(Math.abs(pointerGlowPose(rect, 31 + width / 2, 200 + height * .9).edge - 80) < 1e-9);
    assert.equal(pointerGlowPose(rect, 31 + width * 2, 200).edge, 100);
  }
});
test('hidden frames and invalid pointer coordinates produce no glow', () => {
  assert.deepEqual(pointerGlowPose({ left: 0, top: 0, width: 0, height: 20 }, 0, 0), { edge: 0, angle: 0 });
  assert.deepEqual(pointerGlowPose({ left: 0, top: 0, width: 20, height: 20 }, NaN, 0), { edge: 0, angle: 0 });
});
