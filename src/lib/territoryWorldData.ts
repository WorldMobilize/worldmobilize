/**
 * Builds the playable world from the pixel Earth bitmap in territoryWorldShape.ts.
 * Deterministic at module load — no randomness.
 */

import type { Territory } from "./territoryTypes";
import {
  EARTH_BITMAP,
  latForRow,
  lonForCol,
  MAP_COLS,
  MAP_ROWS,
  nameForLandCell,
  regionForCell,
} from "./territoryWorldShape";

const NEIGHBOR_KM_DEG = 11.5;

function wrapLon(lon: number) {
  let x = lon;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

function distDeg(a: Territory, b: Territory) {
  const dlat = a.lat - b.lat;
  const cosLat = Math.cos((a.lat * Math.PI) / 180);
  const dlon = (a.lon - b.lon) * cosLat;
  return Math.sqrt(dlat * dlat + dlon * dlon);
}

function isLandAt(col: number, row: number) {
  const line = EARTH_BITMAP[row] ?? "";
  return (line[col] ?? ".") === "#";
}

function shouldThinCell(col: number, row: number) {
  const interior = col >= 12 && col <= 52 && row >= 5 && row <= 23;
  if (!interior) return false;
  return (col + row) % 2 === 1;
}

function countRawLandCells() {
  let n = 0;
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      if (isLandAt(col, row)) n += 1;
    }
  }
  return n;
}

const THIN_LAND = countRawLandCells() > 520;

function buildTerritories(): Territory[] {
  const cells: Territory[] = [];
  let idx = 0;

  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      if (!isLandAt(col, row)) continue;
      if (THIN_LAND && shouldThinCell(col, row)) continue;

      const lon = lonForCol(col);
      const lat = latForRow(row);
      const region = regionForCell(col, row);
      const name = nameForLandCell(lon, lat, region, idx);
      const id = `t-${region.toLowerCase().replace(/\s+/g, "-")}-${col}-${row}`;

      cells.push({
        id,
        name,
        region,
        lat,
        lon,
        ownerBrandId: null,
        strength: 1,
        battle: null,
        neighbors: [],
      });
      idx += 1;
    }
  }

  // Neighbors: nearby land cells within threshold (follows coastlines better than grid-only)
  for (let i = 0; i < cells.length; i++) {
    const a = cells[i]!;
    const nbs: string[] = [];
    for (let j = 0; j < cells.length; j++) {
      if (i === j) continue;
      const b = cells[j]!;
      if (distDeg(a, b) <= NEIGHBOR_KM_DEG) nbs.push(b.id);
    }
    nbs.sort();
    a.neighbors = nbs;
  }

  return cells;
}

export const WORLD_TERRITORIES: Territory[] = buildTerritories();

export const WORLD_TERRITORY_COUNT = WORLD_TERRITORIES.length;
export const WORLD_USES_THINNING = THIN_LAND;

if (WORLD_TERRITORY_COUNT < 220 || WORLD_TERRITORY_COUNT > 520) {
  throw new Error(
    `[BrandArena] Expected ~250–500 territories, got ${WORLD_TERRITORY_COUNT} (thinning=${THIN_LAND})`,
  );
}

if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
  // eslint-disable-next-line no-console
  console.info(`[BrandArena] ${WORLD_TERRITORY_COUNT} land territories (thinning=${THIN_LAND})`);
}

export function territoryByRegion(region: string) {
  return WORLD_TERRITORIES.filter((t) => t.region === region);
}

export function findTerritoryByName(name: string) {
  return WORLD_TERRITORIES.find((t) => t.name === name);
}

export function findTerritoriesByName(name: string) {
  return WORLD_TERRITORIES.filter((t) => t.name === name);
}
