import { ITurnData } from './Game';

class Map {
  width: number;
  height: number;
  map: IMapCell[][];
  flatMap: IMapCell[];
  radarGrid: IRadarCell[];
  justDrilled: IMapCell[];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.map = [];
    this.flatMap = [];
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
          vien: false,
          trap: false,
          radar: false,
          safe: true,
        });
      }
      this.map.push(row);
      this.flatMap.push(...row);
    }
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

  turnUpdate(turnData: ITurnData) {
    this.justDrilled = [];

    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        const { ore, hole } = turnData.map[i][j];

        if (Boolean(hole) && !this.map[i][j].hole) {
          this.justDrilled.push(this.map[i][j]);
        }

        this.map[i][j].hole = Boolean(hole);
        this.map[i][j].ore = ore === '?' ? '?' : +ore;
        this.map[i][j].vien = ore !== '?' && ore !== '0';
        this.map[i][j].radar = false;
        this.map[i][j].trap = false;
      }
    }

    turnData.entities
      .filter(({ type }) => type === 2) // updata radars
      .forEach(({ x, y }) => {
        this.map[y][x].radar = true;
      });

    turnData.entities
      .filter(({ type }) => type === 3) // updata traps
      .forEach(({ x, y }) => {
        this.map[y][x].trap = true;
      });
  }

  turnAnalyze() {
    this.updateRadarGrid();
  }

  getNextRadarPlace(): IRadarCell {
    return this.radarGrid.filter(({ x, y }) => {
      const { radar, trap, safe } = this.map[y][x];
      return !(radar || trap || !safe);
    })[0];
  }

  getSafeVienCells(): IMapCell[] {
    return this.flatMap
      .filter(({ vien, safe, trap }) => vien && safe && !trap)
      .sort((a, b) => a.x - b.x);
  }

  handleTrapPlacement(pos: { x: number; y: number }) {
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
        this.map[y][x].safe = false;
      }
    });
  }

  updateRadarGrid() {
    this.radarGrid = this.radarGrid.map(({ x, y }) => {
      const { radar, safe, trap } = this.map[y][x];
      const isNeedAdjustement = !radar && (!safe || trap);
      if (isNeedAdjustement) {
        const adjusted = this.flatMap
          .filter((_) => Math.abs(_.x - x) === 1 && Math.abs(_.y - y) === 1)
          .filter((_) => !_.radar && _.safe && !_.trap && _.x !== 0)[0];
        if (adjusted) {
          console.error(
            `adjust radar ${x} ${y} -> ${adjusted.x} ${adjusted.y}`
          );
          return {
            x: adjusted.x,
            y: adjusted.y,
          };
        }
      }
      return { x, y };
    });
  }
}

export default Map;

export interface IMapCell {
  ore: number | '?';
  hole: boolean;
  x: number;
  y: number;
  vien: boolean;
  trap: boolean;
  radar: boolean;
  safe: boolean;
}

interface IRadarCell {
  x: number;
  y: number;
}
