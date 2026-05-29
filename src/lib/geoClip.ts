import type { Geometry, MultiPolygon, Polygon } from "geojson";
import polygonClipping from "polygon-clipping";

// polygon-clipping format: MultiPolygon = number[][][][]
type PCMultiPolygon = any;

function toPC(geom: Polygon | MultiPolygon): PCMultiPolygon {
  if (geom.type === "Polygon") return [geom.coordinates as number[][][]];
  return geom.coordinates as number[][][][];
}

function fromPC(pc: PCMultiPolygon): Geometry | null {
  if (!pc || pc.length === 0) return null;
  if (pc.length === 1) return { type: "Polygon", coordinates: pc[0] as any };
  return { type: "MultiPolygon", coordinates: pc as any };
}

export function clipGeometryToRect(geom: Geometry, rect: { west: number; south: number; east: number; north: number }) {
  if (geom.type !== "Polygon" && geom.type !== "MultiPolygon") return null;

  const box: PCMultiPolygon = [
    [
      [
        [rect.west, rect.south],
        [rect.east, rect.south],
        [rect.east, rect.north],
        [rect.west, rect.north],
        [rect.west, rect.south],
      ],
    ],
  ];

  // polygon-clipping has strict tuple types; keep this prototype permissive.
  const res = polygonClipping.intersection(toPC(geom) as any, box as any) as PCMultiPolygon;
  return fromPC(res);
}

export function unionGeometries(geoms: Array<Geometry | null>) {
  const polys = geoms.filter((g): g is Polygon | MultiPolygon => !!g && (g.type === "Polygon" || g.type === "MultiPolygon"));
  if (polys.length === 0) return null;
  // Fold pairwise to avoid TS spread tuple issues.
  let acc: PCMultiPolygon = toPC(polys[0]!);
  for (let i = 1; i < polys.length; i++) {
    acc = polygonClipping.union(acc as any, toPC(polys[i]!) as any) as PCMultiPolygon;
  }
  return fromPC(acc);
}

