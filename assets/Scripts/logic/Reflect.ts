import { Direction } from './GridCell';

// reflect 只需要一个输入光线方向和法线方向，返回反射后的精确光线方向
export function reflectAngle(rayAngle: Direction, normalAngle: Direction): Direction {
  const reflected = 2 * normalAngle - rayAngle + 8;
  return ((reflected % 16 + 16) % 16) as Direction;
}
