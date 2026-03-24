export const Dir0 = 0;
export const DirPI_8 = 1;
export const DirPI_4 = 2;
export const Dir3PI_8 = 3;
export const DirPI_2 = 4;
export const Dir5PI_8 = 5;
export const Dir3PI_4 = 6;
export const Dir7PI_8 = 7;
export const DirPI = 8;
export const Dir9PI_8 = 9;
export const Dir5PI_4 = 10;
export const Dir11PI_8 = 11;
export const Dir3PI_2 = 12;
export const Dir13PI_8 = 13;
export const Dir7PI_4 = 14;
export const Dir15PI_8 = 15;

export type Direction =
  | typeof Dir0
  | typeof DirPI_8
  | typeof DirPI_4
  | typeof Dir3PI_8
  | typeof DirPI_2
  | typeof Dir5PI_8
  | typeof Dir3PI_4
  | typeof Dir7PI_8
  | typeof DirPI
  | typeof Dir9PI_8
  | typeof Dir5PI_4
  | typeof Dir11PI_8
  | typeof Dir3PI_2
  | typeof Dir13PI_8
  | typeof Dir7PI_4
  | typeof Dir15PI_8;

// 把离散方向精确映射到 8 个网格遍历步长 (deltaX, deltaY)
export function getGridStep(dir: Direction): [number, number] {
  // 标准化到 0 ~ 15 之间
  let a = (dir % 16 + 16) % 16;

  // 判断是否在坐标轴上
  if (a === 0) return [1, 0]; // 0度 (右)
  if (a === 4) return [0, 1]; // 90度 (上)
  if (a === 8) return [-1, 0]; // 180度 (左)
  if (a === 12) return [0, -1]; // 270度 (下)

  // 落在四个象限
  if (a > 0 && a < 4) return [1, 1];           // 第一象限
  if (a > 4 && a < 8) return [-1, 1];    // 第二象限
  if (a > 8 && a < 12) return [-1, -1]; // 第三象限
  return [1, -1];                                        // 第四象限
}

// 是否反向 (判断方向是否相差 8)
export function oppositeDirection(dir1: Direction, dir2: Direction): boolean {
  return (dir1 + 8) % 16 === dir2 % 16;
}

export function directionKey(dir: Direction): string {
  return dir.toString();
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

  private constructor(private readonly value: number) { }

  /**
   * 颜色叠加（核心：按位或，自动合并成正确混合色）
   */
  add(other: Color): Color {
    const merged = this.value | other.value;
    return Color.fromValue(merged);
  }

  static add(color1: Color, color2: Color): Color {
    return Color.fromValue(color1.value | color2.value);
  }

  equals(other: Color | null | undefined): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  /**
   * 把二进制值转回对应颜色对象
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
export const IdRaySource = 'RaySource' as const;  // 光源
type _RaySource = typeof IdRaySource;
export const IdLittleLight = 'LittleLight' as const;  // 小灯
type _LittleLight = typeof IdLittleLight;
export const IdReflector45 = 'Reflector45' as const;   // 反射镜，反射角45度
type _Reflector45 = typeof IdReflector45;
export const IdReflector90 = 'Reflector90' as const;   // 反射镜，反射角90度
type _Reflector90 = typeof IdReflector90;
export const IdGlassReflector = 'GlassReflector' as const; // 玻璃镜，同时具有反射（90度）和透射功能
type _GlassReflector = typeof IdGlassReflector;

export interface RaySource {
  readonly type: _RaySource;
  readonly direction: Direction;
  readonly color: Color; // 发射的颜色
}

export interface LittleLight {
  readonly type: _LittleLight;
  color: Color; // 小灯颜色
  on: boolean; // 是否已点亮
}


export const DirectionToAngle = {
  Id0: Dir0,
  IdPI_4: DirPI_4,
  IdPI_2: DirPI_2,
  Id3PI_4: Dir3PI_4,
  IdPI: DirPI,
  Id5PI_4: Dir5PI_4,
  Id3PI_2: Dir3PI_2,
  Id7PI_4: Dir7PI_4,
} as const;
export type Angle = typeof DirectionToAngle[keyof typeof DirectionToAngle];

export interface Reflector45 {
  type: _Reflector45;
  direction: Direction;
}

export interface Reflector90 {
  type: _Reflector90;
  direction: Direction;
}

export interface GlassReflector {
  type: _GlassReflector;
  direction: Direction;
}

// 道具
export type Item = RaySource | LittleLight | Reflector45 | Reflector90 | GlassReflector;

export interface Ray {
  direction: Direction;
  color: Color;
}

export class GridCell {
  item: Nullable<Item>;
  rays: Ray[]; // 各个角度的入射光线

  constructor() {
    this.item = null;
    this.rays = [];
  }
}
