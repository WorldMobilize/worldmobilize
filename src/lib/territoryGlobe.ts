/** Stable globe projection helpers (identical on server + client when rot=0). */

export function projectLonLat(lonDeg: number, latDeg: number, rotRad: number) {
  const lonRad = (lonDeg * Math.PI) / 180 + rotRad;
  const latRad = (latDeg * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  const sinLat = Math.sin(latRad);
  const sinLon = Math.sin(lonRad);
  const cosLon = Math.cos(lonRad);
  const px = cosLat * sinLon;
  const py = sinLat;
  const pz = cosLat * cosLon;
  const alpha = Math.max(0, Math.min(1, (pz + 0.12) / 1.12));
  const scale = 0.62 + 0.58 * alpha;
  return { px, py, pz, alpha, scale };
}

export function pctStyle(px: number, py: number) {
  const left = Number((50 + px * 45).toFixed(4));
  const top = Number((50 - py * 45).toFixed(4));
  return { left: `${left}%`, top: `${top}%` };
}

export function pxSize(base: number, scale: number) {
  return Number((base * scale).toFixed(2));
}
