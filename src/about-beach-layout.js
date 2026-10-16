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
  // Leave lateral room for the permanent hand-lettered interaction cues.
  const homeDistance = Math.max(BEACH_ART.distance, (width < 640 ? 9 : width < 1000 ? 7 : 5.6) / (tan * aspect));
  const homeY = homeDistance * 2 * tan * (width < 640 ? .20 : .34);
  const homeLift = width < 640 ? homeDistance*.07 : 0;
  if (!key || progress <= 0) return { position: [0, homeY+homeLift, homeDistance], target: [0, homeY, 0], angle: 0 };
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
    position: [pivot[0] + Math.sin(angle) * radius, pivot[1]+homeLift*(1-t), pivot[2] + Math.cos(angle) * radius],
    target: pivot,
    angle,
  };
}

export function getBeachLabelLayout(bounds, width, height) {
  const narrow = width < 640, padding = narrow ? 13 : 28;
  const labels = {};
  for (const [id, box] of Object.entries(bounds)) {
    const leftSide = id === 'website';
    const available = leftSide ? box.left-padding-12 : width-padding-(box.left+box.width)-12;
    const labelWidth = clamp(available, narrow ? 54 : 92, narrow ? 94 : 230);
    const left = leftSide ? Math.max(padding,box.left-labelWidth-16) : Math.min(width-padding-labelWidth,box.left+box.width+16);
    const fontSize = clamp(labelWidth/(leftSide ? 4.3 : 5.1),narrow ? 18 : 23,leftSide ? 39 : 43);
    const top = clamp(box.top+box.height*(leftSide ? .30 : .45)-fontSize*.7,100,height-125);
    const start = [left+labelWidth*(leftSide ? .82 : .18),top+fontSize*(leftSide ? 1.55 : 2.8)];
    const end = [leftSide ? box.left+box.width*.23 : box.left+box.width*.75,box.top+box.height*.56];
    const bend = [start[0]+(leftSide ? 1 : -1)*clamp(Math.abs(end[0]-start[0])*.65,18,70),start[1]+26];
    const angle = Math.atan2(end[1]-bend[1],end[0]-bend[0]);
    const tip = sign => [end[0]-12*Math.cos(angle+sign*.49),end[1]-12*Math.sin(angle+sign*.49)];
    labels[id] = { left,top,width:labelWidth,fontSize,
      arrow:`M ${start} Q ${bend} ${end} M ${tip(-1)} L ${end} L ${tip(1)}` };
  }
  return labels;
}
