export const ISLAND_BOUNDARY={enter:116,leave:164};
// A scroll boundary has a dead band, so subpixel movement cannot toggle the glass.
export function nextIslandState(current,heroBottom){
  return current?heroBottom<ISLAND_BOUNDARY.leave:heroBottom<=ISLAND_BOUNDARY.enter;
}
