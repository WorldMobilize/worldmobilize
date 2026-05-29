/**
 * Local world map — Natural Earth 110m countries (TopoJSON).
 * Source: world-atlas / Natural Earth (public domain).
 * Bundled at build time — no runtime network fetch.
 */

import { feature } from "topojson-client";
import * as topojsonClient from "topojson-client";
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from "geojson";
import type { Topology } from "topojson-specification";
import worldTopology from "@/data/world-110m.json";
import { geoCentroid } from "d3-geo";

export type CountryProperties = {
  name: string;
  numericId: string;
};

export type CountryFeature = Feature<Geometry, CountryProperties>;

const topology = worldTopology as unknown as Topology;

const rawCollection = feature(topology, topology.objects.countries as never) as FeatureCollection;

export const WORLD_COUNTRIES: CountryFeature[] = rawCollection.features.map((f) => ({
  ...f,
  properties: {
    name: f.properties?.name ?? "Unknown",
    numericId: String(f.id ?? f.properties?.name ?? "0"),
  },
}));

export const COUNTRY_BY_ID = new Map(WORLD_COUNTRIES.map((c) => [c.properties.numericId, c]));

export function countryId(f: CountryFeature) {
  return f.properties.numericId;
}

export function countryName(f: CountryFeature) {
  return f.properties.name;
}

export const WORLD_COUNTRY_COUNT = WORLD_COUNTRIES.length;

/**
 * Country adjacency by shared borders (TopoJSON neighbors).
 * This is the basis for war targeting (neighbors only).
 */
const countryGeoms = (topology.objects.countries as { geometries: unknown[] }).geometries;
const neighborIdx = ((topojsonClient as unknown as { neighbors: (g: unknown) => number[][] }).neighbors(countryGeoms) ??
  []) as number[][];
const featureByIndex = rawCollection.features as Array<Feature<Geometry, any>>;

export const WORLD_NEIGHBORS_BY_ID = new Map<string, string[]>(
  neighborIdx.map((ids, i) => {
    const aId = String(featureByIndex[i]?.id ?? featureByIndex[i]?.properties?.name ?? "0");
    const out = ids.map((j) => String(featureByIndex[j]?.id ?? featureByIndex[j]?.properties?.name ?? "0"));
    return [aId, out];
  }),
);

type LonLat = [number, number];

const MAINLAND_ANCHORS_BY_COUNTRY: Record<string, LonLat> = {
  France: [2.2, 46.3],
  "United States of America": [-98.0, 39.0],
  Canada: [-98.0, 57.0],
  Portugal: [-8.0, 39.5],
  Spain: [-3.5, 40.4],
  "United Kingdom": [-2.5, 54.5],
  Netherlands: [5.3, 52.1],
  Denmark: [10.0, 56.0],
  Mexico: [-102.0, 23.8],
  Italy: [12.6, 42.8],
  Germany: [10.4, 51.2],
  Switzerland: [8.2, 46.8],
  Austria: [14.3, 47.6],
  Poland: [19.1, 52.1],
  Argentina: [-64.0, -35.0],
  Egypt: [30.8, 26.8],
  "South Africa": [24.0, -29.0],
  India: [78.0, 22.0],
  Australia: [134.0, -25.0],
  Brazil: [-52.0, -14.0],
  Japan: [138.0, 36.0],
  "South Korea": [127.8, 36.3],
  China: [105.0, 35.0],
};

function wrapLon(lon: number) {
  let x = lon;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

function approxDegDistance(a: LonLat, b: LonLat) {
  const dLat = a[1] - b[1];
  const cosLat = Math.cos(((a[1] + b[1]) * 0.5 * Math.PI) / 180);
  const dLon = wrapLon(a[0] - b[0]) * cosLat;
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

function centroidLonLat(geom: Polygon | MultiPolygon): LonLat {
  // geoCentroid returns [lon, lat] in degrees
  return geoCentroid({ type: "Feature", properties: {}, geometry: geom }) as LonLat;
}

function polygonsFromGeometry(geom: Geometry): Array<Polygon | MultiPolygon> {
  if (!geom) return [];
  if (geom.type === "Polygon") return [geom];
  if (geom.type === "MultiPolygon") {
    return geom.coordinates.map((coords) => ({ type: "Polygon", coordinates: coords }) as Polygon);
  }
  // Ignore points/lines for this prototype
  return [];
}

export function gameplayGeometryForCountry(feature: CountryFeature): Geometry | null {
  const geom = feature.geometry;
  if (!geom) return null;

  const anchor = MAINLAND_ANCHORS_BY_COUNTRY[feature.properties.name];
  if (!anchor) return geom;

  const polys = polygonsFromGeometry(geom);
  if (polys.length <= 1) return geom;

  let best: { g: Polygon | MultiPolygon; d: number } | null = null;
  for (const p of polys) {
    const c = centroidLonLat(p);
    const d = approxDegDistance(c, anchor);
    if (!best || d < best.d) best = { g: p, d };
  }
  return best?.g ?? geom;
}

