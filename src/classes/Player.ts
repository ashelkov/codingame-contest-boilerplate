import { ITurnData } from './Game';
import Map, { IMapCell } from './Map';

class Player {
  score: number;
  trapCooldown: number;
  radarCooldown: number;
  robots: IRobot[];
  radars: IEntity[];
  traps: IEntity[];
  map: Map;

  constructor() {
    this.robots = [];
    this.radars = [];
    this.traps = [];
  }

  turnUpdate(turnData: ITurnData) {
    const { myScore, entities, radarCooldown, trapCooldown } = turnData;
    this.score = myScore;
    this.radarCooldown = radarCooldown;
    this.trapCooldown = trapCooldown;
    this.radars = [];
    this.traps = [];

    entities
      .filter(({ type }) => type === 0) // update robots
      .forEach(({ id, x, y, item }) => {
        const robot = this.robots.find((_) => _.id === id);
        if (robot) {
          robot.item = item;
          robot.isDead = x === -1 && y === -1;
          robot.path.push({ x, y });
          robot.notMoved = robot.x === x && robot.y === y;
          robot.x = x;
          robot.y = y;
        } else {
          this.robots.push({
            id,
            x,
            y,
            item,
            isDead: false,
            notMoved: false,
            path: [],
          });
        }
      });

    entities
      .filter(({ type }) => type === 2) // update radars
      .forEach(({ id, x, y }) => {
        this.radars.push({ id, x, y });
      });

    entities
      .filter(({ type }) => type === 3) // update traps
      .forEach(({ id, x, y }) => {
        this.traps.push({ id, x, y });
      });
  }

  turnAnalyze() {
    this.updateRobotsTargets();
  }

  updateRobotsTargets() {
    this.robots.forEach((robot) => {
      this.actualizeTarget(robot);
    });

    this.robots.forEach((robot) => {
      if (!robot.target && !robot.isDead) {
        this.assignNewTarget(robot);
      }
    });
  }

  actualizeTarget(robot: IRobot) {
    const { x, isDead, item, mission, target } = robot;
    const isHome = x === 0;
    // mission completed
    const isRadarPlaced = mission === Mission.PLACE_RADAR && item !== 2;
    const isTrapPlaced = mission === Mission.PLACE_TRAP && item !== 3;
    const isCrystalMined = mission === Mission.MINE_ORE && item === 4;
    // interrupt mission
    const isVienDepleted = mission === Mission.MINE_ORE && target.ore === 0;
    const isRadarAlready = mission === Mission.PLACE_RADAR && target.radar;
    const isBecameUnsafe = target && target.safe === false;

    if (isDead) {
      robot.command = 'WAIT';
    }
    if (
      isHome ||
      isRadarPlaced ||
      isTrapPlaced ||
      isCrystalMined ||
      isVienDepleted ||
      isRadarAlready ||
      isBecameUnsafe
    ) {
      this.clearRobotTarget(robot);
    }
  }

  assignNewTarget(robot: IRobot) {
    const { map } = this.map;
    const { x, y, item } = robot;

    const isHome = x === 0;
    const isCarryRadar = item === 2;
    const isCarryTrap = item === 3;
    const isCarryCrystal = item === 4;
    const isEmpty = item === -1;

    const radarPlace = this.map.getNextRadarPlace();
    const nextVien: IMapCell = this.getUnassignedVien();

    if (isHome && isEmpty) {
      if (!this.radarCooldown) {
        this.radarCooldown = 5;
        robot.mission = Mission.REQUEST_ITEM;
        robot.target = map[y][x];
        robot.command = 'REQUEST RADAR';
        return;
      }

      if (!this.trapCooldown) {
        this.trapCooldown = 5;
        robot.mission = Mission.REQUEST_ITEM;
        robot.target = map[y][x];
        robot.command = 'REQUEST TRAP';
        return;
      }
    }

    if (isCarryRadar) {
      const target = radarPlace || nextVien;
      if (target) {
        const { x, y } = target;
        robot.mission = Mission.PLACE_RADAR;
        robot.target = map[y][x];
        robot.command = `DIG ${x} ${y}`;
        return;
      }
    }

    if (isCarryTrap) {
      if (nextVien) {
        const { x, y } = nextVien;
        robot.mission = Mission.PLACE_TRAP;
        robot.target = map[y][x];
        robot.command = `DIG ${x} ${y}`;
        return;
      }
    }

    if (isCarryCrystal) {
      robot.mission = Mission.COLLECT;
      robot.target = map[robot.y][0];
      robot.command = `MOVE ${0} ${robot.y}`;
      return;
    }

    if (isEmpty) {
      if (nextVien) {
        const { x, y } = nextVien;
        robot.mission = Mission.MINE_ORE;
        robot.target = map[y][x];
        robot.command = `DIG ${x} ${y}`;
        return;
      } else {
        this.assignExploreMission(robot);
        return;
      }
    }
  }

  getUnassignedVien(): IMapCell {
    const safeViens = this.map.getSafeVienCells();
    const unassignedViens = safeViens.filter(({ x, y }) => {
      return !this.robots.some(
        ({ target }) => target && target.x === x && target.y === y
      );
    });
    return unassignedViens[0];
  }

  assignExploreMission(robot: IRobot) {
    // TBD: EXPLORE MISSION
  }

  clearRobotTarget(robot: IRobot) {
    robot.target = null;
    robot.mission = null;
    robot.command = null;
  }
}

export default Player;

interface IEntity {
  id: number;
  x: number;
  y: number;
}

export interface IRobot extends IEntity {
  isDead: boolean;
  item: number;
  path: { x: number; y: number }[];
  notMoved?: boolean;
  mission?: Mission | null;
  target?: IMapCell | null;
  command?: string;
}

enum Mission {
  MINE_ORE,
  COLLECT,
  PLACE_RADAR,
  PLACE_TRAP,
  EXPLORE,
  REQUEST_ITEM,
}
