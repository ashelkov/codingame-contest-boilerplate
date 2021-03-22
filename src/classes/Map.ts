import { ITurnData } from './Game';

class Map {
  map: IMapCell[][];
  radarGrid: IRadarCell[];
  width: number;
  height: number;
  vienCells: IMapCell[];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.map = [];
    this.vienCells = [];
    this.initialize();
    this.initializeRadarGrid();
  }

  initialize() {
    for (let i = 0; i < this.height; i++) {
      const row: IMapCell[] = [];
      for (let j = 0; j < this.width; j++) {
        row.push({
          ore: '?',
          hole: false,
          x: j,
          y: i,
        });
      }
      this.map.push(row);
    }
  }

  turnUpdate(turnData: ITurnData) {
    const vienCells = [];

    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        const { ore, hole } = turnData.map[i][j];
        this.map[i][j].hole = Boolean(hole);
        this.map[i][j].ore = ore === '?' ? '?' : +ore;
        if (ore !== '?' && ore !== '0') {
          vienCells.push(this.map[i][j]);
        }
      }
    }

    this.vienCells = vienCells.sort((a, b) => a.x - b.x);

    // update radar grid
    const radars = turnData.entities.filter(({ type }) => type === 2);
    this.radarGrid.forEach((cell) => {
      cell.radar = !!radars.find(({ x, y }) => cell.x === x && cell.y === y);
    });
  }

  initializeRadarGrid() {
    this.radarGrid = [
      { x: 5, y: 5 },
      { x: 14, y: 4 },
      { x: 10, y: 9 },
      { x: 19, y: 8 },
      { x: 1, y: 10 },
      { x: 6, y: 14 },
      { x: 10, y: 0 },
      { x: 15, y: 13 },
      { x: 1, y: 0 },
      { x: 19, y: 0 },
      { x: 24, y: 4 },
      { x: 23, y: 13 },
      { x: 28, y: 9 },
      { x: 29, y: 0 },
    ];
  }

  getNextRadarPosition() {
    return this.radarGrid.filter((_) => !_.radar)[0];
  }

  handleTrapPlacement(pos: { x: number; y: number }) {
    // todo: check just created holes first
    const { x, y } = pos;
    [
      { x, y },
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ].forEach(({ x, y }) => {
      if (x < 0 || x > 29 || y < 0 || y > 14) return;
      if (this.map[y][x].hole) {
        this.map[y][x].trapped = true;
        console.error('MARK TRAPPED CELL', x, y);
      }
    });
  }

  getSafeVienCell() {
    return this.vienCells.filter(({ x, y }) => !this.map[y][x].trapped)[0];
  }
}

export default Map;

interface IMapCell {
  ore: number | '?';
  hole: boolean;
  x: number;
  y: number;
  trapped?: boolean;
}

interface IRadarCell {
  x: number;
  y: number;
  radar?: boolean;
}
