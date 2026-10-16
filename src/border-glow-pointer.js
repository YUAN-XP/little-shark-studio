export function pointerGlowPose(rect, x, y) {
  if (!(rect.width > 0) || !(rect.height > 0) || !Number.isFinite(x) || !Number.isFinite(y)) return { edge: 0, angle: 0 };
  const dx = x - rect.left - rect.width / 2;
  const dy = y - rect.top - rect.height / 2;
  return {
    edge: Math.min(100, Math.max(Math.abs(dx) / (rect.width / 2), Math.abs(dy) / (rect.height / 2)) * 100),
    angle: dx === 0 && dy === 0 ? 0 : (Math.atan2(dy, dx) * 180 / Math.PI + 450) % 360,
  };
}
