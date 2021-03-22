import Map from './Map';
import Opponent from './Opponent';
import Player from './Player';

class Game {
  initData: IInitData;
  turnData: ITurnData;
  turn: number;
  turnTimestamp: number;
  player: Player;
  opponent: Opponent;
  map: Map;

  constructor() {
    this.readInitInputs();
    const { width, height } = this.initData;

    this.turn = 0;
    this.map = new Map(width, height);

    this.player = new Player();
    this.player.map = this.map;

    this.opponent = new Opponent();
    this.opponent.map = this.map;

    this.start();
  }

  start() {
    while (true) {
      this.turnTimestamp = Number(new Date());
      this.readTurnInputs();

      // updates
      this.map.turnUpdate(this.turnData);
      this.player.turnUpdate(this.turnData);
      this.opponent.turnUpdate(this.turnData);

      // analysis
      this.player.turnAnalysis();

      // output
      this.writeTurnOutput();

      console.error(`turn ${this.turn}, ${Date.now() - this.turnTimestamp}ms`);
      this.turn++;
    }
  }

  readInitInputs() {
    // @ts-ignore
    const [width, height] = readline().split(' ').map(Number);
    this.initData = {
      width,
      height,
    };
  }

  readTurnInputs() {
    const map = [];
    const entities = [];
    const { width, height } = this.initData;

    // @ts-ignore
    var inputs = readline().split(' ');
    const myScore = parseInt(inputs[0]); // Amount of ore delivered
    const opponentScore = parseInt(inputs[1]);

    for (let i = 0; i < height; i++) {
      const row = [];
      // @ts-ignore
      var inputs = readline().split(' ');
      for (let j = 0; j < width; j++) {
        const ore = inputs[2 * j]; // amount of ore or "?" if unknown
        const hole = parseInt(inputs[2 * j + 1]); // 1 if cell has a hole
        row.push({ ore, hole });
      }
      map.push(row);
    }

    // @ts-ignore
    var inputs = readline().split(' ');
    const entityCount = parseInt(inputs[0]); // number of entities visible to you
    const radarCooldown = parseInt(inputs[1]); // turns left until a new radar can be requested
    const trapCooldown = parseInt(inputs[2]); // turns left until a new trap can be requested

    for (let i = 0; i < entityCount; i++) {
      // @ts-ignores
      var inputs = readline().split(' ');
      const entityId = parseInt(inputs[0]); // unique id of the entity
      const entityType = parseInt(inputs[1]); // 0 for your robot, 1 for other robot, 2 for radar, 3 for trap
      const x = parseInt(inputs[2]);
      const y = parseInt(inputs[3]); // position of the entity
      const item = parseInt(inputs[4]); // if this entity is a robot, the item it is carrying (-1 for NONE, 2 for RADAR, 3 for TRAP, 4 for ORE)
      entities.push({
        id: entityId,
        type: entityType,
        x,
        y,
        item,
      });
    }

    this.turnData = {
      myScore,
      opponentScore,
      map,
      entities,
      radarCooldown,
      trapCooldown,
    };
  }

  writeTurnOutput() {
    const { robots } = this.player;
    this.writeDebugData();
    robots.forEach(({ target, command }, index) => {
      if (target && command) {
        console.log(
          `${command} ${target.x} ${target.y} ${command} ${target.x} ${target.y}`
        );
      } else if (command) {
        console.log(`${command} ${command}`);
      } else {
        console.log('WAIT WAIT');
      }
    });
  }

  writeDebugData() {
    const { vienCells, map } = this.map;
    const { radars, traps } = this.player;

    console.error({
      v: vienCells.length,
      r: radars.length,
      t: traps.length,
      d: vienCells.filter(({ x, y }) => map[y][x].trapped).length,
    });
  }
}

export default Game;

export interface IInitData {
  width: number;
  height: number;
}

export interface ITurnData {
  myScore: number;
  opponentScore: number;
  map: { ore: string; hole: number }[][];
  entities: {
    id: number;
    type: number;
    x: number;
    y: number;
    item: number;
  }[];
  radarCooldown: number;
  trapCooldown: number;
}
