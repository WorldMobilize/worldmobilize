import type { Geometry, Polygon } from "geojson";
import type { Territory } from "./territoryGameplayTypes";

type LonLatDelta = readonly [dLon: number, dLat: number];

type TerritoryShapeOverride = {
  /**
   * Points are (dLon, dLat) in degrees relative to the territory anchor.
   * Keep these small so they look like clean macro patches, not huge country fills.
   */
  ring: readonly LonLatDelta[];
};

const EUROPE_SHAPES: Record<string, TerritoryShapeOverride> = {
  // UK
  "uk-london": {
    ring: [
      [-2.2, -1.0],
      [1.4, -1.3],
      [3.2, 0.0],
      [2.0, 1.6],
      [-0.4, 2.0],
      [-2.4, 0.9],
    ],
  },
  "uk-scotland": {
    ring: [
      [-3.2, -1.5],
      [1.8, -1.8],
      [3.3, 0.5],
      [1.6, 2.8],
      [-1.0, 3.3],
      [-3.1, 1.8],
    ],
  },

  // Italy (stylized macro regions)
  "it-north": {
    ring: [
      [-2.4, -0.8],
      [2.6, -0.9],
      [3.4, 0.3],
      [2.2, 1.7],
      [-0.4, 1.9],
      [-2.2, 0.9],
    ],
  },
  "it-rome": {
    ring: [
      [-1.2, -1.1],
      [1.5, -1.2],
      [2.0, 0.2],
      [1.2, 1.4],
      [-0.3, 1.4],
      [-1.4, 0.3],
    ],
  },
  "it-sicily": {
    ring: [
      [-1.8, -0.4],
      [0.4, -0.7],
      [1.8, -0.1],
      [1.5, 0.7],
      [-0.2, 1.0],
      [-1.7, 0.5],
    ],
  },
  "it-sardinia": {
    ring: [
      [-1.0, -0.8],
      [0.5, -0.9],
      [1.1, -0.1],
      [0.8, 0.9],
      [-0.2, 1.2],
      [-1.0, 0.5],
    ],
  },

  // France
  "fr-paris": {
    ring: [
      [-1.4, -0.9],
      [1.6, -1.0],
      [2.2, 0.2],
      [1.3, 1.4],
      [-0.2, 1.6],
      [-1.5, 0.6],
    ],
  },
  "fr-south": {
    ring: [
      [-2.7, -1.2],
      [1.4, -1.7],
      [3.2, -0.5],
      [2.6, 1.2],
      [0.3, 1.9],
      [-2.0, 1.2],
    ],
  },

  // Germany
  "de-core": {
    ring: [
      [-1.8, -1.2],
      [1.7, -1.4],
      [2.4, -0.1],
      [1.7, 1.5],
      [0.1, 1.9],
      [-1.7, 1.0],
    ],
  },
  "de-berlin": {
    ring: [
      [-1.3, -1.0],
      [1.5, -1.2],
      [2.3, 0.0],
      [1.7, 1.6],
      [0.0, 2.0],
      [-1.4, 1.1],
    ],
  },

  // Spain
  "es-east": {
    ring: [
      [-1.7, -1.3],
      [1.4, -1.5],
      [2.5, -0.2],
      [2.0, 1.3],
      [0.2, 1.8],
      [-1.6, 0.8],
    ],
  },
  "es-madrid": {
    ring: [
      [-2.1, -1.2],
      [1.4, -1.3],
      [2.3, -0.1],
      [1.7, 1.4],
      [0.0, 1.8],
      [-2.0, 0.9],
    ],
  },
};

function polygonFromAnchorAndRing(anchorLon: number, anchorLat: number, ring: readonly LonLatDelta[]): Polygon {
  const coords = ring.map(([dLon, dLat]) => [anchorLon + dLon, anchorLat + dLat] as [number, number]);
  if (coords.length < 3) {
    // Degenerate; return a tiny triangle so rendering never crashes.
    const tiny: [number, number][] = [
      [anchorLon - 0.1, anchorLat - 0.1],
      [anchorLon + 0.1, anchorLat - 0.1],
      [anchorLon, anchorLat + 0.12],
      [anchorLon - 0.1, anchorLat - 0.1],
    ];
    return { type: "Polygon", coordinates: [tiny] };
  }
  const closed = coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1];
  const ringClosed = closed ? coords : [...coords, coords[0]];
  return { type: "Polygon", coordinates: [ringClosed] };
}

export function territoryOverlayGeometry(t: Territory): Geometry {
  const eu = EUROPE_SHAPES[t.id];
  if (t.continent === "Europe" && eu) {
    return polygonFromAnchorAndRing(t.anchorLon, t.anchorLat, eu.ring);
  }
  return t.geometry;
}

export const EUROPE_CUSTOM_SHAPE_TERRITORY_IDS = Object.keys(EUROPE_SHAPES);

