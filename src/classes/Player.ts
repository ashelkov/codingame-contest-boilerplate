import { ITurnData } from './Game';
import { isNeighbours } from '../utils/map.utils';
import Map from './Map';

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

  turnAnalysis() {
    this.updateRobotsTargets();
  }

  updateRobotsTargets() {
    this.robots.forEach((robot) => {
      const { x, y, target, item, isDead } = robot;
      const nextRadarPosition = this.map.getNextRadarPosition();
      const nextVien = this.map.getSafeVienCell();

      // dead robot
      if (isDead) {
        robot.command = 'WAIT';
        robot.target = null;
        return;
      }

      // request radar
      if (x === 0 && item === -1 && nextRadarPosition) {
        if (!this.radarCooldown) {
          robot.command = 'REQUEST RADAR';
          robot.target = null;
          this.radarCooldown = 5;
          return;
        }
      }

      // if robot hold a radar
      if (item === 2 && nextRadarPosition) {
        robot.command = 'DIG';
        robot.target = this.map.getNextRadarPosition();
        return;
      }

      // select nearest vien cell
      if (item === -1 && nextVien) {
        robot.command = 'DIG';
        robot.target = {
          x: nextVien.x,
          y: nextVien.y,
        };
        return;
      }

      // dig at random place
      if (x === 0) {
        robot.command = 'DIG';
        robot.target = {
          x: Math.floor(Math.random() * 30),
          y: Math.floor(Math.random() * 15),
        };
        return;
      }

      // if we got an crystal ore go to HQ
      if (robot.item === 4) {
        robot.command = 'MOVE';
        robot.target = {
          x: 0,
          y: robot.y,
        };
        return;
      }

      // if we dig nothing switch to other random point
      if (isNeighbours({ x, y }, target) && robot.notMoved) {
        robot.command = 'DIG';
        robot.target = {
          x: Math.floor(Math.random() * 30),
          y: Math.floor(Math.random() * 15),
        };
        return;
      }
    });
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
  target?: { x: number; y: number };
  command?: string;
  notMoved?: boolean;
  path: { x: number; y: number }[];
}
