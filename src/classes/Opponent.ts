import { ITurnData } from './Game';
import Map from './Map';
import { IRobot } from './Player';

class Opponent {
  score: number;
  robots: IEnemyRobot[];
  map: Map;

  constructor() {
    this.robots = [];
  }

  turnUpdate(turnData: ITurnData) {
    const { opponentScore, entities } = turnData;
    this.score = opponentScore;

    entities
      .filter(({ type }) => type === 1) // update robots
      .forEach(({ id, x, y, item }) => {
        const robot = this.robots.find((_) => _.id === id);

        if (robot) {
          if (robot.isDead) return;
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

    this.robots.forEach((robot) => {
      const { x, y, isDead } = robot;
      const { map } = this.map;
      if (!isDead) {
        map[y][x].enemyBots.push(robot);
      }
    });

    this.analyzeEnemyBots();
  }

  analyzeEnemyBots() {
    this.robots.forEach((robot) => {
      const isHome = robot.x === 0;

      if (robot.notMoved) {
        if (robot.carry) {
          this.map.handleTrapPlacement(robot);
          robot.carry = isHome;
        } else {
          robot.carry = isHome;
        }
      }
    });
  }
}

export default Opponent;

export interface IEnemyRobot extends IRobot {
  carry?: boolean;
}
