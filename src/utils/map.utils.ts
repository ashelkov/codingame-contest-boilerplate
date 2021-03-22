export function isNeighbours(
  pos1: { x: number; y: number },
  pos2: { x: number; y: number }
) {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y) <= 1;
}
