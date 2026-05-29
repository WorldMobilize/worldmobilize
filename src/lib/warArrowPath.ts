/** Quadratic curve from attacker to defender, bulging outward from globe center. */
export function warArrowCurvePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  viewSize: number,
  bulge = 28,
): string {
  const cx = viewSize / 2;
  const cy = viewSize / 2;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = mx - cx;
  const dy = my - cy;
  const len = Math.hypot(dx, dy) || 1;
  const cpx = mx + (dx / len) * bulge;
  const cpy = my + (dy / len) * bulge;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} Q ${cpx.toFixed(2)} ${cpy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}
