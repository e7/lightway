import {
  Direction,
  GridCell,
  Item,
  IdRaySource,
  IdRaySeg,
  IdLittleLight,
  IdReflector45,
  IdReflector90,
} from './GridCell';

// 关卡
class Level {
  staticItems: { x: number; y: number; item: Item }[];
  items: Item[];
}

class Board {
  grid: GridCell[][];
  size: number;
  level: Nullable<Level>;

  constructor(lenOfSide: number) {
    this.size = lenOfSide;

    for (let y = 0; y < lenOfSide; y++) {
      this.grid[y] = [];
      for (let x = 0; x < lenOfSide; x++) {
        this.grid[y][x] = new GridCell();
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

  // 光路渲染
  render() {
    this.level.staticItems.forEach((element) => {
      if (element.item.type != IdRaySource) {
        return;
      }

      let [deltaX, deltaY]: [number, number] = [0, 0];
      const raySource: Item = element.item;
      switch (raySource.direction) {
        case Direction.Up:
          deltaY = -1;
          break;
        case Direction.Down:
          deltaY = 1;
          break;
        case Direction.Left:
          deltaX = -1;
          break;
        case Direction.Right:
          deltaX = 1;
          break;
      }

      let [x, y]: [number, number] = [element.x + deltaX, element.y + deltaY];
      while (x * y >= 0 && x * y < this.size * this.size) {
        const cell: GridCell = this.grid[y][x];

        if (cell.item === null) {
          cell.item = { type: IdRaySeg, direction: raySource.direction, color: raySource.color };
        } else {
          switch (cell.item.type) {
            case IdReflector90:
              break;
            case IdLittleLight:
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
