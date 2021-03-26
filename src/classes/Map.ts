import { ITurnData } from './Game';
import { IRobot } from './Player';
import { IEnemyRobot } from './Opponent';
import { getNeighbourPositions } from '../utils/map.utils';

class Map {
  turn: number;
  width: number;
  height: number;
  map: IMapCell[][];
  flatMap: IMapCell[];
  radarGrid: IPosition[];
  exploreGrid: IPosition[];

  visibleOreCount: number;
  safeOreCount: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.map = [];
    this.flatMap = [];
    this.initialize();
    this.initializeRadarGrid();
    this.initializeExploreGrid();
  }

  initialize() {
    for (let i = 0; i < this.height; i++) {
      const row: IMapCell[] = [];
      for (let j = 0; j < this.width; j++) {
        row.push({
          ore: 0,
          hole: 0,
          x: j,
          y: i,
          visible: false,
          unsafe: false,
          trap: false,
          radar: false,
          targeted: false,
          myBots: [],
          enemyBots: [],
          next: [],
        });
      }
      this.map.push(row);
      this.flatMap.push(...row);
    }

    // add neighbours
    this.flatMap.forEach((cell) => {
      const positions = getNeighbourPositions(cell);
      cell.next = positions.map(({ x, y }) => this.map[y][x]);
    });
  }

  initializeRadarGrid() {
    this.radarGrid = [
      { x: 5, y: 5 },
      { x: 10, y: 9 },
      { x: 14, y: 4 },
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

  initializeExploreGrid() {
    this.exploreGrid = [];
    for (let y = 3; y <= 11; y += 2) {
      for (let x = 5; x <= 23; x += 2) {
        this.exploreGrid.push({ x, y });
      }
    }
  }

  turnUpdate(turnData: ITurnData) {
    this.turn = turnData.turn;

    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        const { ore, hole } = turnData.map[i][j];

        if (Boolean(hole) === !this.map[i][j].hole) {
          this.map[i][j].hole = this.turn;
        }

        this.map[i][j].ore = ore === '?' ? 0 : +ore;
        this.map[i][j].radar = false;
        this.map[i][j].trap = false;
        this.map[i][j].visible = ore !== '?';
        this.map[i][j].targeted = false;

        this.map[i][j].myBots = [];
        this.map[i][j].enemyBots = [];
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

    this.updateCounters();
  }

  updateCounters() {
    this.visibleOreCount = this.flatMap
      .filter(({ ore }) => ore > 0)
      .reduce((sum, cell) => (sum += cell.ore), 0);

    this.safeOreCount = this.flatMap
      .filter(({ ore, unsafe }) => ore > 0 && !unsafe)
      .reduce((sum, cell) => (sum += cell.ore), 0);
  }

  turnAnalyze() {
    this.updateRadarGrid();
  }

  getNextRadarPlace(): IPosition {
    return this.radarGrid.filter(({ x, y }) => {
      const { radar, trap, unsafe } = this.map[y][x];
      return !(radar || trap || unsafe);
    })[0];
  }

  handleTrapPlacement({ x, y }: IPosition) {
    const around = [this.map[y][x], ...this.map[y][x].next];
    const aroundHoles = around.filter((_) => _.hole);
    const aroundHolesNew = aroundHoles.filter((_) => _.hole === this.turn);
    const updateUnsafe = aroundHolesNew.length ? aroundHolesNew : aroundHoles;
    updateUnsafe.forEach((cell) => {
      cell.unsafe = !cell.radar && !cell.trap;
    });
  }

  updateRadarGrid() {
    this.radarGrid = this.radarGrid.map(({ x, y }) => {
      const { radar, unsafe, trap } = this.map[y][x];
      const isNeedAdjustement = !radar && (unsafe || trap);

      if (isNeedAdjustement) {
        const adj = this.flatMap
          .filter((_) => Math.abs(_.x - x) === 1 && Math.abs(_.y - y) === 1)
          .filter((_) => !_.radar && !_.unsafe && !_.trap && _.x !== 0)[0];
        if (adj) {
          console.error(`ADJUST RADAR ${x} ${y} -> ${adj.x} ${adj.y}`);
          return { x: adj.x, y: adj.y };
        }
      }
      return { x, y };
    });
  }
}

export default Map;

export interface IMapCell {
  ore: number;
  hole: number;
  x: number;
  y: number;
  unsafe: boolean;
  visible: boolean;
  trap: boolean;
  radar: boolean;
  targeted: boolean;
  myBots: IRobot[];
  enemyBots: IEnemyRobot[];
  next: IMapCell[];
}

export interface IPosition {
  x: number;
  y: number;
}
