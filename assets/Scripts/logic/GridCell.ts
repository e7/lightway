// export const IdUp = 'Up' as const;
// export const IdDown = 'Down' as const;
// export const IdLeft = 'Left' as const;
// export const IdRight = 'Right' as const;
// export const IdUpLeft = 'UpLeft' as const;
// export const IdUpRight = 'UpRight' as const;
// export const IdDownLeft = 'DownLeft' as const;
// export const IdDownRight = 'DownRight' as const;
// export type Direction =
//   | { name: typeof IdUp; vec: { x: 0; y: 1 } }
//   | { name: typeof IdDown; vec: { x: 0; y: -1 } }
//   | { name: typeof IdLeft; vec: { x: -1; y: 0 } }
//   | { name: typeof IdRight; vec: { x: 1; y: 0 } }
//   | { name: typeof IdUpLeft; vec: { x: -1; y: 1 } }
//   | { name: typeof IdUpRight; vec: { x: 1; y: 1 } }
//   | { name: typeof IdDownLeft; vec: { x: -1; y: -1 } }
//   | { name: typeof IdDownRight; vec: { x: 1; y: -1 } };
export const Up = { x: 0, y: 1 } as const;
export const Down = { x: 0, y: -1 } as const;
export type Direction =
  // | { x: 0; y: 1 } // up
  | typeof Up
  // | { x: 0; y: -1 } // down
  | typeof Down
  | { x: -1; y: 0 } // left
  | { x: 1; y: 0 } // right
  | { x: -1; y: 1 } // up-left
  | { x: 1; y: 1 } // up-right
  | { x: -1; y: -1 } // down-left
  | { x: 1; y: -1 }; // down-right

// 是否反向
export function oppositeDirection(dir1: Direction, dir2: Direction): boolean {
  return dir1.x === -dir2.x && dir1.y === -dir2.y;
}

// 计算反射向量
function reflectVec(v: Vec, normal: Vec): Vec {
  // normal 必须是单位向量
  const dot = v.x * normal.x + v.y * normal.y;

  return {
    x: v.x - 2 * dot * normal.x,
    y: v.y - 2 * dot * normal.y,
  };
}

// 定义三原色位标记（用二进制表示，方便叠加）
enum ColorBit {
  Red = 1 << 0, // 001 红
  Green = 1 << 1, // 010 绿
  Blue = 1 << 2, // 100 蓝
}

// 最终只有这 8 种合法颜色！
export class Color {
  // 8 种固定颜色
  static readonly Black = new Color(0); // 000 黑
  static readonly Red = new Color(ColorBit.Red); // 001 红
  static readonly Green = new Color(ColorBit.Green); // 010 绿
  static readonly Blue = new Color(ColorBit.Blue); // 100 蓝
  static readonly Yellow = new Color(ColorBit.Red | ColorBit.Green); // 011 黄
  static readonly Magenta = new Color(ColorBit.Red | ColorBit.Blue); // 101 品红
  static readonly Cyan = new Color(ColorBit.Green | ColorBit.Blue); // 110 青
  static readonly White = new Color(ColorBit.Red | ColorBit.Green | ColorBit.Blue); // 111 白

  private constructor(private readonly value: number) {}

  /**
   * 颜色叠加（核心：按位或，自动合并成正确混合色）
   */
  add(other: Color): Color {
    const merged = this.value | other.value;
    return Color.fromValue(merged);
  }

  equals(other: Color | null | undefined): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  /**
   * 内部：把二进制值转回对应颜色对象
   */
  private static fromValue(value: number): Color {
    switch (value) {
      case 0:
        return Color.Black;
      case 1:
        return Color.Red;
      case 2:
        return Color.Green;
      case 3:
        return Color.Yellow;
      case 4:
        return Color.Blue;
      case 5:
        return Color.Magenta;
      case 6:
        return Color.Cyan;
      case 7:
        return Color.White;
      default:
        return Color.Black;
    }
  }
}

// 道具类型
export const IdRaySource = 'RaySource' as const;
type _RaySource = typeof IdRaySource;
export const IdLittleLight = 'LittleLight' as const;
type _LittleLight = typeof IdLittleLight;
export const IdRaySegs = 'RaySeg' as const;
type _RaySegs = typeof IdRaySegs;
export const IdReflector45 = 'Reflector45' as const;
type _Reflector45 = typeof IdReflector45;
export const IdReflector90 = 'Reflector90' as const;
type _Reflector90 = typeof IdReflector90;

interface RaySource {
  readonly type: _RaySource;
  readonly direction: Direction;
  readonly color: Color; // 发射的颜色
  showColor: Color; // 最终渲染出来的颜色
}

interface LittleLight {
  readonly type: _LittleLight;
  color: Color; // 小灯颜色
}

const Angles = [0, 45, 90, 135, 180, 225, 270, 315] as const;
export type Angle = (typeof Angles)[number];
export const DirectionToAngle = {
  IdRight: 0,
  IdUpRight: 45,
  IdUp: 90,
  IdUpLeft: 135,
  IdLeft: 180,
  IdDownLeft: 225,
  IdDown: 270,
  IdDownRight: 315,
} as const;

export function createRaySeg(init?: Partial<Record<Angle, Color>>): Record<Angle, Nullable<Color>> {
  const result = {} as Record<Angle, Nullable<Color>>;

  for (const a of Angles) {
    result[a] = init?.[a] ?? null;
  }

  return result;
}

interface Reflector45 {
  type: _Reflector45;
  direction: Direction;
}

interface Reflector90 {
  type: _Reflector90;
  direction: Direction;
}

// 道具
export type Item = RaySource | LittleLight | Reflector45 | Reflector90;

export class GridCell {
  item: Nullable<Item>;
  rays: { direction: Direction; color: Color }[]; // 各个角度的入射光线
}
