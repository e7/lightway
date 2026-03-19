import * as gc from './GridCell';

// 关卡
class Level {
  staticItems: { x: number; y: number; item: gc.Item }[];
  items: gc.Item[];
}

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
  clearRayPath() {}

  // 光路渲染
  render() {
    this.level.staticItems.forEach((element) => {
      if (element.item.type != gc.IdRaySource) {
        return;
      }

      const raySource: gc.Item = element.item;
      const { x: deltaX, y: deltaY } = raySource.direction;

      let rayDire: gc.Direction = raySource.direction; // 光向（可能变化）
      let rayColor: gc.Color = raySource.color; // 光色（可能变化）
      let [x, y]: [number, number] = [element.x + deltaX, element.y + deltaY];
      while (x * y >= 0 && x * y < this.size * this.size) {
        const cell: gc.GridCell = this.grid[y][x];

        // 渲染光线
        cell.rays.forEach((ray) => {
          if (gc.oppositeDirection(ray.direction, rayDire)) {
            // 修改光色
          }
        });
        cell.rays.push({ direction: rayDire, color: rayColor });

        // 渲染道具
        if (cell.item !== null) {
          switch (cell.item.type) {
            case gc.IdLittleLight:
              const littleLight = cell.item;
              break;

            case gc.IdReflector90:
              const reflector = cell.item;
              break;
          }
        }

        // next cell
        x += deltaX;
        y += deltaY;
      }
    });
  }
}
