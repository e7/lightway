import * as gc from './GridCell';
import { reflectAngle } from './Reflect';
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

      let rayDire: gc.Direction = raySource.direction; // 光向弧度（通过反射可能变化）
      let rayColor: gc.Color = raySource.color; // 光色（可能变化）
      
      let step = gc.getGridStep(rayDire); // 从当前弧度获得网格步长
      let [x, y]: [number, number] = [element.x + step[0], element.y + step[1]];
      
      // 注意：修正了之前的越界判断 (由于原先代码仅判 x*y >= 0 会导致 x=10, y=1 这样 y 通过但实际无效的情况)
      while (x >= 0 && x < this.size && y >= 0 && y < this.size) {
        const cell: gc.GridCell = this.grid[y][x];

        // 渲染光线
        cell.rays.forEach((ray: gc.Ray) => {
          if (gc.oppositeDirection(ray.direction, rayDire)) {
            // 修改光色
            const mixed = gc.Color.add(rayColor, ray.color);
            rayColor = ray.color = mixed;
          }
        });
        cell.rays.push({ direction: rayDire, color: rayColor });

        // 渲染道具
        if (cell.item !== null) {
          switch (cell.item.type) {
            case gc.IdLittleLight:
              const littleLight = cell.item as gc.LittleLight;
              const mixedColor = cell.rays.reduce(
                (mixed: gc.Color, ray: gc.Ray) => gc.Color.add(mixed, ray.color),
                gc.Color.Black
              );
              littleLight.on = mixedColor.equals(littleLight.color);
              break;

            case gc.IdReflector90:
            case gc.IdReflector45:
              const reflector = cell.item as (gc.Reflector90 | gc.Reflector45);
              // 根据法线弧度和入射弧度计算精准的反射弧度
              rayDire = reflectAngle(rayDire, reflector.direction);
              break;
          }
        }

        // next cell
        step = gc.getGridStep(rayDire); // 反射后，逻辑角度可能变了，重新获取物理步长
        x += step[0];
        y += step[1];
      } // end of while
    });
  }
}
