import { geoDistance, geoOrthographic, type GeoProjection } from "d3-geo";

/** Stable orthographic globe rotation (degrees: λ, φ, γ). Identical on SSR + first client paint. */
export const INITIAL_GLOBE_ROTATION: [number, number, number] = [12, -20, 0];

export const GLOBE_VIEW_SIZE = 640;

export function globeSphereRadius(viewSize = GLOBE_VIEW_SIZE) {
  return viewSize / 2 - 6;
}

export function roundRotation(rot: [number, number, number]): [number, number, number] {
  return [
    Number(rot[0].toFixed(4)),
    Number(rot[1].toFixed(4)),
    Number(rot[2].toFixed(4)),
  ];
}

export function clampPhi(phi: number) {
  return Math.max(-55, Math.min(55, phi));
}

/** Geographic lon/lat at the center of the current view. */
export function viewCenter(rot: [number, number, number]): [number, number] {
  return [-rot[0], -rot[1]];
}

/**
 * Orthographic globe projection. `zoom` multiplies scale (camera zoom) without
 * changing the SVG viewport — paths are recomputed at the new scale.
 */
export function createGlobeProjection(
  rotation: [number, number, number],
  viewSize = GLOBE_VIEW_SIZE,
  zoom = 1,
): GeoProjection {
  const r = globeSphereRadius(viewSize) * zoom;
  return geoOrthographic()
    .scale(r)
    .translate([viewSize / 2, viewSize / 2])
    .clipAngle(90)
    .rotate(rotation);
}

/** True when [lon, lat] is on the near hemisphere for this rotation. */
export function isOnVisibleHemisphere(
  rotation: [number, number, number],
  lon: number,
  lat: number,
): boolean {
  const center = viewCenter(rotation);
  const dist = geoDistance(center, [lon, lat]);
  return dist < Math.PI / 2 - 0.02;
}

/** 0..1 visibility; fades near the horizon. */
export function hemisphereVisibility(
  rotation: [number, number, number],
  lon: number,
  lat: number,
): number {
  if (!isOnVisibleHemisphere(rotation, lon, lat)) return 0;
  const center = viewCenter(rotation);
  const dist = geoDistance(center, [lon, lat]);
  const horizon = Math.PI / 2 - 0.02;
  const fadeStart = horizon - 0.22;
  if (dist <= fadeStart) return 1;
  return Math.max(0, 1 - (dist - fadeStart) / (horizon - fadeStart));
}

/**
 * Project geographic point using shared orthographic projection.
 * d3 expects [longitude, latitude].
 */
export function projectLonLat(
  projection: GeoProjection,
  rotation: [number, number, number],
  lon: number,
  lat: number,
): { x: number; y: number; alpha: number } | null {
  if (!isOnVisibleHemisphere(rotation, lon, lat)) return null;
  const pt = projection([lon, lat]);
  if (!pt) return null;
  const [x, y] = pt;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const alpha = hemisphereVisibility(rotation, lon, lat);
  if (alpha <= 0.01) return null;
  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    alpha: Number(alpha.toFixed(4)),
  };
}

/** Dev anchors for manual sanity checks (Germany stays on Germany, etc.). */
export const DEBUG_ANCHOR_ZONES: Array<{ id: string; lon: number; lat: number }> = [
  { id: "de-core", lon: 8.6, lat: 50.1 },
  { id: "fr-paris", lon: 2.3, lat: 48.8 },
  { id: "it-rome", lon: 12.5, lat: 41.9 },
  { id: "jp-kanto", lon: 139.7, lat: 35.7 },
  { id: "in-south", lon: 77.6, lat: 12.9 },
  { id: "au-east", lon: 151.2, lat: -33.8 },
  { id: "br-coast", lon: -46.6, lat: -23.5 },
];
