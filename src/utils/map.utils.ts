export function isNeighbours(pos1: IPosition, pos2: IPosition) {
  if (!pos1 || !pos2) return false;
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y) === 1;
}

export function getNeighbourPositions({ x, y }: IPosition) {
  return [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ].filter(({ x, y }) => !(x < 0 || x > 29 || y < 0 || y > 14));
}

export function getDistance(pos1: IPosition, pos2: IPosition) {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}

interface IPosition {
  x: number;
  y: number;
}
