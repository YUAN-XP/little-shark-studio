import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPANION_EYES, gazeToward } from './gallery-gaze.js';

const eye = { x: 100, y: 100, angle: 0, limitX: 15, limitY: 7 };
test('Selecting projects to either side changes gaze direction without moving the head', () => {
  const left = gazeToward(eye, { x: -300, y: 300 });
  const right = gazeToward(eye, { x: 500, y: 300 });
  assert.ok(left.x < 0 && right.x > 0);
  assert.ok(left.y > 0 && right.y > 0);
  assert.ok(Math.abs(left.x + right.x) < 1e-8);
});
test('Gaze stays inside both eyes at extreme targets and invalid coordinates stay neutral', () => {
  for (const eye of COMPANION_EYES) {
    for (const target of [{ x: -1e8, y: 1e8 }, { x: 1e8, y: -1e8 }, { x: eye.x, y: eye.y }]) {
      const p = gazeToward(eye, target);
      assert.ok((p.x / eye.limitX) ** 2 + (p.y / eye.limitY) ** 2 <= 1 + 1e-8);
      assert.ok(p.scaleX >= .88 && p.scaleX <= 1);
    }
    assert.deepEqual(gazeToward(eye, { x: NaN, y: 100 }), { x: 0, y: 0, scaleX: 1 });
  }
});
test('The tilted head does not redirect the pupils away from the actual project', () => {
  for (const eye of COMPANION_EYES) {
    const target = { x: 400, y: 1700 };
    const p = gazeToward(eye, target), angle = eye.angle * Math.PI / 180;
    const worldX = p.x * Math.cos(angle) - p.y * Math.sin(angle);
    const worldY = p.x * Math.sin(angle) + p.y * Math.cos(angle);
    const dx = target.x - eye.x, dy = target.y - eye.y;
    assert.ok(Math.abs(worldX * dy - worldY * dx) < 1e-7);
    assert.ok(worldX * dx + worldY * dy > 0);
  }
});
test('A target at the eye itself produces a centered, uncompressed pupil', () => {
  assert.deepEqual(gazeToward(eye, { x: eye.x, y: eye.y }), { x: 0, y: 0, scaleX: 1 });
});
