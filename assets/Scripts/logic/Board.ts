import * as gc from './GridCell';

// 关卡
class Level {
  staticItems: { x: number; y: number; item: gc.Item }[];
  items: gc.Item[];
}

const DirectionToDelta = {
  [gc.IdUp]: [0, 1], [gc.IdUpLeft]: [-1, 1], [gc.IdLeft]: [-1, 0], [gc.IdDownLeft]: [-1, -1],
  [gc.IdDown]: [0, -1], [gc.IdDownRight]: [1, -1], [gc.IdRight]: [1, 0], [gc.IdUpRight]: [1, 1],
} as const;

class Board {
  grid: gc.GridCell[][];
  size: number;
  level: Nullable<Level>;

  constructor(lenOfSide: number) {
    this.size = lenOfSide;

    for (let y = 0; y < lenOfSide; y++) {
      this.grid[y] = [];
      for (let x = 0; x < lenOfSide; x++) {
        this.grid[y][x] = new gc.GridCell();
      }
    }
  }

  // 加载关卡
  load(level: Level) {
    this.level = level;
    level.staticItems.forEach((element) => {
      this.grid[element.y][element.x].item = element.item;
    });
  }

  // 清空光路防止残留
  clearRayPath() {

  }

  // 光路渲染
  render() {
    this.level.staticItems.forEach((element) => {
      if (element.item.type != gc.IdRaySource) {
        return;
      }

      const raySource: gc.Item = element.item;
      const [deltaX, deltaY] = DirectionToDelta[raySource.direction];

      const srcAngle: gc.Angle = gc.DirectionToAngle[raySource.direction]; // 光源角度
      let [x, y]: [number, number] = [element.x + deltaX, element.y + deltaY];
      while (x * y >= 0 && x * y < this.size * this.size) {
        const cell: gc.GridCell = this.grid[y][x];

        if (cell.item === null) {
          cell.item = {type: gc.IdRaySegs, colors: gc.createRaySeg({[srcAngle]: raySource.color})};
        } else {
          switch (cell.item.type) {
            case gc.IdRaySegs:
              cell.item.colors[srcAngle] = raySource.color;
              break;
          }
        }

        // next
        x += deltaX;
        y += deltaY;
      }
    });
  }
}
