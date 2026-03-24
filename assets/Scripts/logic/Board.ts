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

  // 清空光路防止残留
  clearRayPath() {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        this.grid[y][x].rays.length = 0;
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

      this.traceRay(
        element.x + step[0],
        element.y + step[1],
        raySource.direction,
        raySource.color,
        0
      );
    });
  }

  // 递归追踪光线，方便后续扩展玻璃产生分叉光路
  private traceRay(x: number, y: number, rayDire: gc.Direction, rayColor: gc.Color, depth: number) {
    // 防止死循环（如果有互相反射导致的闭环）
    if (depth > 100) return;

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

      // 防止同方向同色光无限堆叠（防环路逻辑补充）
      const existingRay = cell.rays.find(r => r.direction === rayDire);
      if (existingRay && existingRay.color.equals(rayColor)) {
        break;
      }

      cell.rays.push({ direction: rayDire, color: rayColor });

      // 渲染道具
      let shouldStopRay = false;
      if (cell.item !== null) {
        switch (cell.item.type) {
          case gc.IdRaySource:
            // 光源实体具有物理限制，相当于一堵墙，打到它时光线立即终止被阻挡
            shouldStopRay = true;
            break;

          case gc.IdLittleLight:
            const littleLight = cell.item as gc.LittleLight;
            const mixedColor = cell.rays.reduce(
              (mixed: gc.Color, ray: gc.Ray) => gc.Color.add(mixed, ray.color),
              gc.Color.Black
            );
            littleLight.on = mixedColor.equals(littleLight.color);
            break;

          case gc.IdReflector90: {
            const ref90 = cell.item as gc.Reflector90;
            // 只有从正面及两个45度夹角射入的光线（即从 direction-2, direction, direction+2 射来）能被反射
            // 转换为光线的行进方向 (rayDire = 来源方向 + 8)
            const allowedRays = [
              (ref90.direction + 6) % 16,
              (ref90.direction + 8) % 16,
              (ref90.direction + 10) % 16
            ];

            if (allowedRays.indexOf(rayDire) !== -1) {
              // 属于可反射方向，表面法线即等于它自身的朝向
              rayDire = reflectAngle(rayDire, ref90.direction);
            } else {
              // 其它方向进来的都是阻挡
              shouldStopRay = true;
            }
            break;
          }

          case gc.IdReflector45: {
            const ref45 = cell.item as gc.Reflector45;
            // 恢复 Reflector45 的基础法线，等待后续明确规则
            rayDire = reflectAngle(rayDire, ref45.direction);
            break;
          }

          case gc.IdGlassReflector: {
            const glass = cell.item as gc.GlassReflector;
            const allowedRays = [
              (glass.direction + 6) % 16,
              (glass.direction + 8) % 16,
              (glass.direction + 10) % 16
            ];

            // 只有当光线从正面射入时，才会产生反射的分支光路
            if (allowedRays.indexOf(rayDire) !== -1) {
              const refDir = reflectAngle(rayDire, glass.direction);
              const refStep = gc.getGridStep(refDir);
              this.traceRay(x + refStep[0], y + refStep[1], refDir, rayColor, depth + 1);
            }

            // 原光线方向保持不变，继续在while中前进（因为玻璃永远不会阻挡光线透射）
            break;
          }
        }
      }

      if (shouldStopRay) {
        break; // 中断光线传播
      }

      // next cell
      const step = gc.getGridStep(rayDire);
      x += step[0];
      y += step[1];
    } // end of while
  }
}
