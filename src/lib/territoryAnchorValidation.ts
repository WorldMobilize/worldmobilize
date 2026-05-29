import { geoContains, geoCentroid, geoDistance } from "d3-geo";
import type { Geometry } from "geojson";
import { WORLD_COUNTRIES, countryName, gameplayGeometryForCountry } from "./worldMapData";
import type { Territory } from "./territoryGameplayTypes";

export type AnchorIssue = {
  territoryId: string;
  name: string;
  countryName: string;
  anchorLat: number;
  anchorLon: number;
  reason: "outside_country" | "far_from_land" | "missing_country";
  distanceDeg?: number;
};

const countryByName = new Map(WORLD_COUNTRIES.map((f) => [countryName(f), f]));

/** Max degrees from country centroid when anchor is outside polygon (still on land). */
const MAX_CENTROID_DISTANCE_DEG = 14;

/**
 * Validate territory anchors against Natural Earth country polygons.
 * d3 geoContains expects [longitude, latitude].
 */
export function validateTerritoryAnchors(territories: Territory[]): AnchorIssue[] {
  const issues: AnchorIssue[] = [];

  for (const t of territories) {
    const cf = countryByName.get(t.countryName);
    if (!cf) {
      issues.push({
        territoryId: t.id,
        name: t.name,
        countryName: t.countryName,
        anchorLat: t.anchorLat,
        anchorLon: t.anchorLon,
        reason: "missing_country",
      });
      continue;
    }

    const geom = gameplayGeometryForCountry(cf);
    if (!geom) continue;

    const point: [number, number] = [t.anchorLon, t.anchorLat];
    const feature = { type: "Feature" as const, properties: {}, geometry: geom };
    const inside = geoContains(feature, point);

    if (inside) continue;

    const centroid = geoCentroid(feature) as [number, number];
    const distanceDeg = (geoDistance(point, centroid) * 180) / Math.PI;

    if (distanceDeg > MAX_CENTROID_DISTANCE_DEG) {
      issues.push({
        territoryId: t.id,
        name: t.name,
        countryName: t.countryName,
        anchorLat: t.anchorLat,
        anchorLon: t.anchorLon,
        reason: distanceDeg > 25 ? "far_from_land" : "outside_country",
        distanceDeg: Number(distanceDeg.toFixed(1)),
      });
    }
  }

  return issues;
}

export function logTerritoryAnchorIssues(territories: Territory[]) {
  if (process.env.NODE_ENV === "production") return;
  const issues = validateTerritoryAnchors(territories);
  if (issues.length === 0) {
    // eslint-disable-next-line no-console
    console.info("[BrandArena] All territory anchors inside country polygons.");
    return;
  }
  // eslint-disable-next-line no-console
  console.warn(
    `[BrandArena] ${issues.length} territory anchor(s) outside expected land:`,
    issues,
  );
}

/** True when [lon, lat] lies inside the country's gameplay geometry. */
export function isAnchorOnCountryLand(
  countryName: string,
  lon: number,
  lat: number,
  countryGeom?: Geometry | null,
): boolean {
  const geom =
    countryGeom ??
    (() => {
      const cf = countryByName.get(countryName);
      return cf ? gameplayGeometryForCountry(cf) : null;
    })();
  if (!geom) return false;
  return geoContains({ type: "Feature", properties: {}, geometry: geom }, [lon, lat]);
}
