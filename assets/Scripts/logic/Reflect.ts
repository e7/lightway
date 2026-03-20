import { Direction } from './GridCell';

// reflect 只需要一个输入光线弧度和法线弧度，返回反射后的精确光线弧度
export function reflectAngle(rayAngle: Direction, normalAngle: Direction): Direction {
  const reflected = 2 * normalAngle - rayAngle + Math.PI;
  return ((reflected % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) as Direction;
}
