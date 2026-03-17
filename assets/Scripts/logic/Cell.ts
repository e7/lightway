// 基本方向
type BaseDirection = 8 | 4 | 2 | 6;
// 全方向
type Direction = 9 | 7 | 1 | 3 | BaseDirection;

// 定义三原色位标记（用二进制表示，方便叠加）
enum ColorBit {
  Red = 1 << 0,    // 001 红
  Green = 1 << 1,  // 010 绿
  Blue = 1 << 2,   // 100 蓝
}

// 最终只有这 8 种合法颜色！
export class Color {
  // 8 种固定颜色
  static readonly Black = new Color(0);               // 000 黑
  static readonly Red = new Color(ColorBit.Red);      // 001 红
  static readonly Green = new Color(ColorBit.Green);  // 010 绿
  static readonly Blue = new Color(ColorBit.Blue);    // 100 蓝
  static readonly Yellow = new Color(ColorBit.Red | ColorBit.Green);    // 011 黄
  static readonly Magenta = new Color(ColorBit.Red | ColorBit.Blue);    // 101 品红
  static readonly Cyan = new Color(ColorBit.Green | ColorBit.Blue);     // 110 青
  static readonly White = new Color(ColorBit.Red | ColorBit.Green | ColorBit.Blue); // 111 白

  private constructor(private readonly value: number) {}

  /**
   * 颜色叠加（核心：按位或，自动合并成正确混合色）
   */
  add(other: Color): Color {
    const merged = this.value | other.value;
    return Color.fromValue(merged);
  }

  /**
   * 内部：把二进制值转回对应颜色对象
   */
  private static fromValue(value: number): Color {
    switch (value) {
      case 0: return Color.Black;
      case 1: return Color.Red;
      case 2: return Color.Green;
      case 3: return Color.Yellow;
      case 4: return Color.Blue;
      case 5: return Color.Magenta;
      case 6: return Color.Cyan;
      case 7: return Color.White;
      default: return Color.Black;
    }
  }
}

// 光源
interface LightSource {
    direction: BaseDirection;

}

class Cell {

}