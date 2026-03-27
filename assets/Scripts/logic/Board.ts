import * as gc from './GridCell';
import { reflectAngle } from './Reflect';
// 关卡
export class Level {
  staticItems: { x: number; y: number; item: gc.Item }[];
  items: gc.Item[];
}

export class Board {
  grid: gc.GridCell[][];
  size: number;
  level: Nullable<Level>;

  constructor(lenOfSide: number) {
    this.size = lenOfSide;
    this.grid = [];

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

  // 清空光路及灯光状态防止残留
  clearRayPath() {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const cell = this.grid[y][x];
        cell.resetRayState();

        // 每帧重置小灯状态，如果这帧光线真的经过它，会在 render() 里被重新点亮
        if (cell.item !== null && cell.item.type === gc.IdLittleLight) {
          (cell.item as gc.LittleLight).on = false;
        }
      }
    }
  }

  // 光路渲染
  render() {
    this.level.staticItems.forEach((element) => {
      if (element.item.type != gc.IdRaySource) {
        return;
      }

      const raySource = element.item as gc.RaySource;
      const step = gc.getGridStep(raySource.direction);

      // 1. 设置光源格子的出射半截光线颜色
      this.grid[element.y][element.x].halfColors[raySource.direction] = raySource.color;
      // 同时也存入 rays 以兼容旧逻辑
      this.grid[element.y][element.x].rays.push({
        direction: raySource.direction,
        color: raySource.color
      });

      // 2. 开始追踪
      this.traceRay(
        element.x + step[0],
        element.y + step[1],
        raySource.direction,
        raySource.color,
        0
      );
    });

    // 3. 路径颜色统一化：将混色结果沿着光路双向同步
    // 确保对射产生的混色（如 Cyan）能回传到光源格子
    this.unifyPathColors();

    // 4. 更新小灯状态（利用统一后的完整混色数据）
    this.updateLampStates();
  }

  /**
   * 更新所有小灯的点亮状态。
   * 小灯的点亮条件是：经过该格子的所有光线颜色之和等于小灯自身的颜色。
   */
  private updateLampStates() {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const cell = this.grid[y][x];
        if (cell.item && cell.item.type === gc.IdLittleLight) {
          const lamp = cell.item as gc.LittleLight;
          // 合并该格子所有 16 个方向的半截光色
          const totalMixedColor = cell.halfColors.reduce(
            (acc, curr) => gc.Color.add(acc, curr),
            gc.Color.Black
          );
          lamp.on = totalMixedColor.equals(lamp.color);
        }
      }
    }
  }

  /**
   * 路径颜色统一化通道：
   * 遍历所有格子，如果两个相邻格子之间存在连通的光线段，则同步它们的颜色（取并集）。
   * 迭代直到颜色不再变化。
   */
  private unifyPathColors() {
    let changed = true;
    for (let pass = 0; pass < this.size && changed; pass++) {
      changed = false;
      for (let y = 0; y < this.size; y++) {
        for (let x = 0; x < this.size; x++) {
          const cell = this.grid[y][x];
          for (let d = 0; d < 16; d++) {
            const color = cell.halfColors[d];
            if (color.equals(gc.Color.Black)) continue;

            const step = gc.getGridStep(d as gc.Direction);
            const nx = x + step[0];
            const ny = y + step[1];

            if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
              const nextCell = this.grid[ny][nx];
              const inDir = (d + 8) % 16;
              const nextColor = nextCell.halfColors[inDir];

              if (!color.equals(nextColor)) {
                const mixed = gc.Color.add(color, nextColor);
                cell.halfColors[d] = mixed;
                nextCell.halfColors[inDir] = mixed;
                changed = true;
              }
            }
          }
        }
      }
    }

    // 将统一后的 halfColors 同步回 rays
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const cell = this.grid[y][x];
        cell.rays.forEach(ray => {
          ray.color = cell.halfColors[ray.direction];
        });
      }
    }
  }

  // 递归追踪光线
  private traceRay(x: number, y: number, rayDire: gc.Direction, rayColor: gc.Color, depth: number) {
    if (depth > 100) return;

    while (x >= 0 && x < this.size && y >= 0 && y < this.size) {
      const cell: gc.GridCell = this.grid[y][x];

      // a. 设置进入格子的入射半截光线颜色
      const inDir = (rayDire + 8) % 16 as gc.Direction;
      cell.halfColors[inDir] = gc.Color.add(cell.halfColors[inDir], rayColor);

      // b. 混色逻辑（兼容旧逻辑，利用 rays 数组判断对射）
      cell.rays.forEach((ray: gc.Ray) => {
        if (gc.oppositeDirection(ray.direction, rayDire)) {
          rayColor = gc.Color.add(rayColor, ray.color);
        }
      });

      // c. 防止无限堆叠
      const existingRay = cell.rays.find(r => r.direction === rayDire);
      if (existingRay && existingRay.color.equals(rayColor)) {
        break;
      }

      if (!existingRay) {
        cell.rays.push({ direction: rayDire, color: rayColor });
      } else {
        existingRay.color = rayColor;
      }

      // d. 渲染道具并决定光线去向
      let shouldStopRay = false;
      if (cell.item !== null) {
        switch (cell.item.type) {
          case gc.IdRaySource:
            shouldStopRay = true;
            break;

          case gc.IdLittleLight:
            // 小灯状态在 render() 最后的 updateLampStates 中统一更新，此处不处理
            break;

          case gc.IdReflector90: {
            const ref90 = cell.item as gc.Reflector90;
            const allowedRays = [(ref90.direction + 6) % 16, (ref90.direction + 8) % 16, (ref90.direction + 10) % 16];

            if (allowedRays.indexOf(rayDire) !== -1) {
              const newDir = reflectAngle(rayDire, ref90.direction);
              cell.halfColors[newDir] = gc.Color.add(cell.halfColors[newDir], rayColor);
              rayDire = newDir;
            } else {
              shouldStopRay = true;
            }
            break;
          }

          case gc.IdReflector45: {
            const ref45 = cell.item as gc.Reflector45;
            const newDir = reflectAngle(rayDire, ref45.direction);
            cell.halfColors[newDir] = gc.Color.add(cell.halfColors[newDir], rayColor);
            rayDire = newDir;
            break;
          }

          case gc.IdGlassReflector: {
            const glass = cell.item as gc.GlassReflector;
            const allowedRays = [(glass.direction + 6) % 16, (glass.direction + 8) % 16, (glass.direction + 10) % 16];

            if (allowedRays.indexOf(rayDire) !== -1) {
              const refDir = reflectAngle(rayDire, glass.direction);
              cell.halfColors[refDir] = gc.Color.add(cell.halfColors[refDir], rayColor);
              const refStep = gc.getGridStep(refDir);
              this.traceRay(x + refStep[0], y + refStep[1], refDir, rayColor, depth + 1);
            }
            break;
          }
        }
      }

      if (shouldStopRay) {
        break;
      }

      // e. 设置离开格子的出射半截光线颜色
      cell.halfColors[rayDire] = gc.Color.add(cell.halfColors[rayDire], rayColor);

      const step = gc.getGridStep(rayDire);
      x += step[0];
      y += step[1];
    }
  }
}
