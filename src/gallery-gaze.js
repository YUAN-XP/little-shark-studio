// Eye coordinates stay in the selected illustration's original 1536 × 1024 space.
export const COMPANION_EYES = [
  { x: 791, y: 363, angle: 26, limitX: 15, limitY: 7,
    outline: 'M752 342 C778 336 810 356 830 383 C816 395 764 374 752 342Z' },
  { x: 954, y: 420, angle: 13, limitX: 13, limitY: 6,
    outline: 'M924 411 C945 398 978 403 999 429 C982 449 934 440 924 411Z' },
];

// Translate a target into the tilted eye's own axes. A shared multiplier keeps
// the gaze direction correct while confining movement to an ellipse.
export function gazeToward(eye, target) {
  const neutral = { x: 0, y: 0, scaleX: 1 };
  if (![eye.x, eye.y, eye.angle, target?.x, target?.y].every(Number.isFinite)) return neutral;
  const angle = eye.angle * Math.PI / 180;
  const dx = target.x - eye.x, dy = target.y - eye.y;
  const localX = dx * Math.cos(angle) + dy * Math.sin(angle);
  const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
  const distance = Math.sqrt(1 + (localX / eye.limitX) ** 2 + (localY / eye.limitY) ** 2);
  const x = localX / distance, y = localY / distance;
  return { x, y, scaleX: 1 - .12 * Math.abs(x / eye.limitX) };
}
