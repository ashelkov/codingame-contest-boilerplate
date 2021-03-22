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
          robot.item = item;
          robot.isDead = x === -1 && y === -1;
          robot.path.push({ x, y });
          robot.notMoved = robot.x === x && robot.y === y;
          robot.x = x;
          robot.y = y;
          if (robot.notMoved) {
            if (x === 0) {
              robot.carry = true;
            }
            if (x > 0 && robot.carry) {
              robot.carry = false;
              this.map.handleTrapPlacement(robot);
            }
          }
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
  }
}

export default Opponent;

interface IEnemyRobot extends IRobot {
  carry?: boolean;
}
