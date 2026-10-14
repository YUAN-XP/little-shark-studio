export const BEACH_ART = { width: 1672, height: 941, fov: 42, distance: 14, overscan: 20 };
export const BEACH_OBJECTS = {
  website: { center: [-3.55, 2.32, 0], yaw: -50 * Math.PI / 180, innerRadius: 1.85, outerRadius: 2.60, halfDepth: .55 },
  'studio-name': { center: [3.55, 3.49, 0], yaw: 50 * Math.PI / 180, width: 3.05, height: 7.65, depth: .22 },
};
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const easeCamera = t => t * t * t * (t * (t * 6 - 15) + 10);

// +Z points toward the initial camera. The ring's right edge is nearer;
// the board's left edge is nearer. Their positions never change during an orbit.
export function getRingFrame(width, height) {
  const diameter = Math.min(740, width * .82, height * .86);
  return { diameter, aperture: diameter * BEACH_OBJECTS.website.innerRadius / BEACH_OBJECTS.website.outerRadius * .96 };
}

export function getBeachPose(key, progress, width, height) {
  const aspect = Math.max(.25, width / Math.max(1, height));
  const tan = Math.tan(BEACH_ART.fov * Math.PI / 360);
  const homeDistance = Math.max(BEACH_ART.distance, 5.6 / (tan * aspect));
  const homeY = homeDistance * 2 * tan * .34;
  if (!key || progress <= 0) return { position: [0, homeY, homeDistance], target: [0, homeY, 0], angle: 0 };
  const item = BEACH_OBJECTS[key];
  const board = key === 'studio-name';
  const desired = board
    ? Math.min(360, width * .85, (height - 42) * 2.35 / 3.85)
    : getRingFrame(width, height).diameter;
  const span = board ? 2.35 : item.outerRadius * 2;
  const distance = span * height / (Math.max(100, desired) * 2 * tan);
  const target = [...item.center];
  if (board) {
    target[0] += Math.sin(item.yaw) * .24;
    target[1] -= .42;
    target[2] += Math.cos(item.yaw) * .24;
  }
  const t = clamp(progress, 0, 1);
  const angle = item.yaw * t;
  const radius = homeDistance + (distance - homeDistance) * t;
  const pivot = target.map(value => value * t);
  pivot[1] += homeY * (1-t);
  return {
    position: [pivot[0] + Math.sin(angle) * radius, pivot[1], pivot[2] + Math.cos(angle) * radius],
    target: pivot,
    angle,
  };
}
