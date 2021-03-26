import { ITurnData } from './Game';
import Map, { IMapCell, IPosition } from './Map';
// utils
import { getDistance, isNeighbours } from '../utils/map.utils';

class Player {
  score: number;
  opponentScore: number;
  trapCooldown: number;
  radarCooldown: number;
  turn: number;

  robots: IRobot[];
  radars: IEntity[];
  traps: IEntity[];
  map: Map;

  unsafeTriggersCount: number;

  constructor() {
    this.robots = [];
    this.radars = [];
    this.traps = [];
    this.unsafeTriggersCount = 0;
  }

  turnUpdate(turnData: ITurnData) {
    const {
      myScore,
      opponentScore,
      entities,
      radarCooldown,
      trapCooldown,
      turn,
    } = turnData;
    this.score = myScore;
    this.opponentScore = opponentScore;
    this.radarCooldown = radarCooldown;
    this.trapCooldown = trapCooldown;
    this.turn = turn;
    this.radars = [];
    this.traps = [];

    entities
      .filter(({ type }) => type === 0) // update robots
      .forEach((entity) => this.robotTurnUpdate(entity));

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

    this.robots.forEach((robot) => {
      const { x, y, isDead } = robot;
      const { map } = this.map;
      if (!isDead) {
        map[y][x].myBots.push(robot);
      }
    });
  }

  robotTurnUpdate({ id, x, y, item }: any) {
    const robot = this.robots.find((_) => _.id === id);
    const isDead = x === -1 && y === -1;

    if (robot && !robot.isDead) {
      robot.item = item;
      robot.path.push({ x, y });
      robot.notMoved = robot.x === x && robot.y === y;
      robot.isDead = isDead;
      robot.x = x;
      robot.y = y;

      if (isDead) {
        robot.order = null;
        robot.target = null;
        robot.command = 'WAIT';
      }
    }

    if (!robot) {
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
  }

  turnAnalyze() {
    if (this.turn === 1) {
      this.initialAssignment();
    }

    // complete or abort current orders
    this.robots.forEach((robot) => {
      if (robot.isDead) return;
      if (this.isOrderCompleted(robot) || this.isOrderNotActual(robot)) {
        robot.order = null;
        robot.target = null;
        robot.command = '';
      }
      this.forceUnsafeTrigger(robot);
    });

    // update targeted cells
    this.robots.forEach(({ target }) => {
      if (target) {
        this.map.map[target.y][target.x].targeted = true;
      }
    });

    // create new orders
    this.robots.forEach((robot) => {
      if (!robot.order && !robot.isDead) {
        this.assignNewOrder(robot);
        if (robot.target) {
          const { x, y } = robot.target;
          this.map.map[y][x].targeted = true;
        }
      }
    });
  }

  initialAssignment() {
    const radar = this.map.radarGrid[0];
    const robot = this.robots
      .map((robot) => ({ distance: getDistance(robot, radar), robot }))
      .sort((a, b) => a.distance - b.distance)[0].robot;
    this.radarCooldown = 5;
    robot.order = Order.REQUEST_RADAR;
    robot.target = null;
    robot.command = 'REQUEST RADAR';
  }

  isOrderCompleted(robot: IRobot) {
    const { map } = this.map;
    const { item, order, target, notMoved } = robot;
    const isCarryCrystal = item === 4;

    // is crystal mined
    if (order === Order.MINE_ORE) {
      return isCarryCrystal;
    }
    // is returned home
    if (order === Order.RETURN_HOME) {
      return robot.x === 0;
    }
    // is radar received
    if (order === Order.REQUEST_RADAR) {
      return item === 2;
    }
    // is trap received
    if (order === Order.REQUEST_TRAP) {
      return item === 3;
    }
    // is radar placed
    if (order === Order.PLACE_RADAR) {
      return item !== 2;
    }
    // is trap placed
    if (order === Order.PLACE_TRAP) {
      return item !== 3;
    }
    // is waited
    if (order === Order.WAIT) {
      return true;
    }
    // is triggered unsafe
    if (order === Order.TRIGGER_UNSAFE) {
      const triggered = isNeighbours(target, robot) && notMoved;
      const { x, y } = target;
      if (triggered) {
        map[y][x].unsafe = false;
        map[y][x].ore += Number(isCarryCrystal);
      }
      return triggered;
    }
  }

  isOrderNotActual(robot: IRobot) {
    const { order, target } = robot;

    // is become unsafe
    if (target && target.unsafe) {
      return true;
    }
    // is vien depleted
    if (order === Order.MINE_ORE) {
      return target.ore === 0 || robot.notMoved;
    }
    // is radar already there
    if (order === Order.PLACE_RADAR) {
      return target.radar;
    }
    // is trap already there
    if (order === Order.PLACE_TRAP) {
      return target.trap;
    }
  }

  forceUnsafeTrigger(robot: IRobot) {
    const { map } = this.map;
    const { x, y, item } = robot;
    const isEmpty = item === -1;

    [map[y][x], ...map[y][x].next]
      .filter((_) => _.unsafe)
      .forEach((cell) => {
        let enemyBotsCount = 0;
        let myBotsCount = 0;
        [cell, ...cell.next].forEach((_) => {
          enemyBotsCount += _.enemyBots.length;
          myBotsCount += _.myBots.length;
        });

        const isVisibleOre = cell.visible && cell.ore > 0;
        const canKillMoreEnemies = enemyBotsCount - myBotsCount > 0;
        const canKillSameEnemies = enemyBotsCount - myBotsCount === 0;
        const myScoreIsHigher = this.score > this.opponentScore;
        const shouldTriggerUnsafe =
          canKillMoreEnemies ||
          (canKillSameEnemies &&
            (myScoreIsHigher || (isEmpty && isVisibleOre)));

        if (shouldTriggerUnsafe) {
          robot.order = Order.TRIGGER_UNSAFE;
          robot.target = cell;
          robot.command = `DIG ${cell.x} ${cell.y}`;
        }
      });

    if (robot.order === Order.TRIGGER_UNSAFE) {
      const { x, y } = robot.target;
      this.unsafeTriggersCount++;
      console.error(`TRIGGER UNSAFE ${this.unsafeTriggersCount}`, { x, y });
    }
  }

  assignNewOrder(robot: IRobot) {
    const { map } = this.map;
    const { item } = robot;

    const isHome = robot.x === 0;
    const isEmpty = item === -1;
    const isCarryRadar = item === 2;
    const isCarryTrap = item === 3;
    const isCarryCrystal = item === 4;

    const nextRadar = this.map.getNextRadarPlace();
    const nextOreCell: IPosition = this.getNextOreCell(robot);

    if (isHome && isEmpty) {
      if (!this.radarCooldown && nextRadar) {
        this.radarCooldown = 5;
        robot.order = Order.REQUEST_RADAR;
        robot.target = map[robot.y][0];
        robot.command = 'REQUEST RADAR';
        return;
      }

      if (!this.trapCooldown) {
        // todo: try to catch on returning
        // this.trapCooldown = 5;
        // robot.mission = Mission.REQUEST_TRAP;
        // robot.target = map[y][0];
        // robot.command = 'REQUEST TRAP';
        // return;
      }
    }

    if (isCarryRadar) {
      const { safeOreCount } = this.map;
      const target = safeOreCount > 25 ? nextOreCell : nextRadar || nextOreCell;
      if (target) {
        const { x, y } = target;
        robot.order = Order.PLACE_RADAR;
        robot.target = map[y][x];
        robot.command = `DIG ${x} ${y}`;
        return;
      }
    }

    if (isCarryTrap) {
      const target = nextOreCell;
      if (target) {
        const { x, y } = target;
        robot.order = Order.PLACE_TRAP;
        robot.target = map[y][x];
        robot.command = `DIG ${x} ${y}`;
        return;
      }
    }

    if (isCarryCrystal) {
      robot.order = Order.RETURN_HOME;
      robot.target = map[robot.y][0];
      robot.command = `MOVE ${0} ${robot.y}`;
      return;
    }

    if (isEmpty) {
      const forceRadarRequest = this.forceRadarRequest(nextRadar);
      const nextExplore = this.getNextExplore(robot);

      if (forceRadarRequest) {
        robot.order = Order.REQUEST_RADAR;
        robot.target = map[robot.y][0];
        robot.command = 'REQUEST RADAR';
        return;
      }

      const target = nextOreCell || nextExplore;
      if (target) {
        const { x, y } = target;
        robot.order = Order.MINE_ORE;
        robot.target = map[y][x];
        robot.command = `DIG ${x} ${y}`;
        return;
      }
    }
  }

  forceRadarRequest(nextRadar: IPosition): boolean {
    const { safeOreCount } = this.map;
    const needRadar = nextRadar && safeOreCount < 10;
    const radarRequested = this.robots.some(
      ({ order, item, x }) =>
        order === Order.REQUEST_RADAR ||
        order === Order.RETURN_HOME ||
        item === 2 ||
        x === 0
    );
    return needRadar && !radarRequested;
  }

  getNextOreCell(robot: IRobot): IPosition {
    const { flatMap } = this.map;
    const safeOre = flatMap.filter((_) => _.ore > 0 && !_.unsafe);
    const unsafeOre = flatMap.filter((_) => _.ore > 0);
    const nextOre = (safeOre.length ? safeOre : unsafeOre)
      .map(({ x, y, ore, hole, targeted }) => {
        const distance = getDistance({ x, y }, robot);
        const moves = Math.ceil((distance - 1) / 4);
        return {
          x: x,
          y: y,
          distance,
          moves,
          ore,
          targeted: +targeted,
          hole,
        };
      })
      .sort(
        (a, b) =>
          a.targeted - b.targeted ||
          a.moves - b.moves ||
          a.hole - b.hole ||
          b.ore - a.ore
      );
    if (nextOre[0] && nextOre[0].x === 14 && nextOre[0].y === 3) {
      console.error('cell', nextOre[0]);
      console.error('robot.id', robot.id);
    }
    return nextOre[0];
  }

  getNextExplore(robot: IRobot): IPosition {
    const { map, exploreGrid } = this.map;
    const nextExplore = exploreGrid
      .filter(({ x, y }) => !map[y][x].hole && !map[y][x].visible)
      .filter(({ x, y }) => {
        return !this.robots.some(
          ({ target }) => target && target.x === x && target.y === y
        );
      })
      .map((cell) => ({ cell, distance: getDistance(robot, cell) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (nextExplore) {
      return nextExplore.cell;
    }
  }
}

export default Player;

interface IEntity {
  id: number;
  x: number;
  y: number;
}

export interface IRobot extends IEntity {
  item: number;
  path: IPosition[];
  isDead: boolean;
  notMoved?: boolean;
  order?: Order | null;
  target?: IMapCell | null;
  command?: string;
}

enum Order {
  NONE,
  MINE_ORE,
  RETURN_HOME,
  REQUEST_RADAR,
  REQUEST_TRAP,
  PLACE_RADAR,
  PLACE_TRAP,
  TRIGGER_UNSAFE,
  WAIT,
}
