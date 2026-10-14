// A moving, circular five-item window. No pagination or duplicated project data.
export const wrapIndex = (index, count) => count ? ((index % count) + count) % count : 0;
export const visibleWindow = (items, start, limit = 5) =>
  Array.from({ length: Math.min(limit, items.length) }, (_, index) =>
    items[wrapIndex(start + index, items.length)]);
export const afterShift = (start, active, direction, count, limit = 5) => {
  const size = Math.min(limit, count);
  return {
    start: wrapIndex(start + direction, count),
    active: wrapIndex(active - direction, size),
    incoming: wrapIndex(direction > 0 ? start + size : start - 1, count),
  };
};
