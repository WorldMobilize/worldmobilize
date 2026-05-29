import type { Geometry } from "geojson";
import { WORLD_COUNTRIES, countryName, gameplayGeometryForCountry } from "./worldMapData";
import { clipGeometryToRect, unionGeometries } from "./geoClip";
import type { Territory } from "./territoryGameplayTypes";

type Rect = { west: number; south: number; east: number; north: number };

/**
 * MVP VERIFIED TERRITORIES
 * Rule: if we can't place it accurately, we remove it.
 * Every seed below has a manually verified lat/lon anchor.
 */
type TerritorySeed = {
  id: string;
  name: string;
  countryName: string;
  continent: string;
  rects: Rect[];
  /** Geographic anchor — always { lat, lon } in degrees (WGS84). */
  anchor: { lat: number; lon: number };
};

const TERRITORY_SEEDS: TerritorySeed[] = [
  // Europe
  { id: "uk-london", name: "London / South England", countryName: "United Kingdom", continent: "Europe", rects: [{ west: -6.5, south: 50.1, east: 2.2, north: 53.6 }], anchor: { lat: 51.5, lon: -0.1 } },
  { id: "uk-scotland", name: "Scotland", countryName: "United Kingdom", continent: "Europe", rects: [{ west: -7.8, south: 55.0, east: -0.7, north: 59.2 }], anchor: { lat: 56.5, lon: -4.2 } },

  { id: "it-north", name: "Northern Italy", countryName: "Italy", continent: "Europe", rects: [{ west: 6.3, south: 44.0, east: 13.9, north: 47.9 }], anchor: { lat: 45.5, lon: 9.2 } },
  { id: "it-rome", name: "Rome / Lazio", countryName: "Italy", continent: "Europe", rects: [{ west: 11.2, south: 40.6, east: 14.2, north: 43.4 }], anchor: { lat: 41.9, lon: 12.5 } },
  { id: "it-sicily", name: "Sicily", countryName: "Italy", continent: "Europe", rects: [{ west: 12.0, south: 35.3, east: 15.8, north: 38.6 }], anchor: { lat: 37.6, lon: 14.0 } },
  { id: "it-sardinia", name: "Sardinia", countryName: "Italy", continent: "Europe", rects: [{ west: 8.0, south: 38.7, east: 10.8, north: 41.7 }], anchor: { lat: 40.1, lon: 9.0 } },

  { id: "fr-paris", name: "Paris Basin", countryName: "France", continent: "Europe", rects: [{ west: 0.5, south: 47.4, east: 3.8, north: 49.6 }], anchor: { lat: 48.8, lon: 2.3 } },
  { id: "fr-south", name: "Southern France", countryName: "France", continent: "Europe", rects: [{ west: -1.5, south: 42.1, east: 7.8, north: 46.8 }], anchor: { lat: 43.6, lon: 1.44 } },

  { id: "de-core", name: "Germany Core", countryName: "Germany", continent: "Europe", rects: [{ west: 6.0, south: 48.0, east: 10.8, north: 52.8 }], anchor: { lat: 50.1, lon: 8.6 } },
  { id: "de-berlin", name: "Berlin / East Germany", countryName: "Germany", continent: "Europe", rects: [{ west: 11.0, south: 50.5, east: 15.6, north: 54.9 }], anchor: { lat: 52.5, lon: 13.4 } },

  { id: "es-east", name: "Spain East", countryName: "Spain", continent: "Europe", rects: [{ west: -1.8, south: 37.5, east: 3.4, north: 42.8 }], anchor: { lat: 39.5, lon: -0.4 } },
  { id: "es-madrid", name: "Madrid / Central Spain", countryName: "Spain", continent: "Europe", rects: [{ west: -6.2, south: 38.0, east: -0.8, north: 42.2 }], anchor: { lat: 40.4, lon: -3.7 } },

  // North America
  { id: "us-west", name: "US West Coast", countryName: "United States of America", continent: "North America", rects: [{ west: -125.0, south: 32.0, east: -114.0, north: 49.5 }], anchor: { lat: 37.7, lon: -122.4 } },
  { id: "us-east", name: "US East Coast", countryName: "United States of America", continent: "North America", rects: [{ west: -80.5, south: 25.0, east: -66.5, north: 45.5 }], anchor: { lat: 40.7, lon: -74.0 } },
  { id: "us-texas", name: "Texas", countryName: "United States of America", continent: "North America", rects: [{ west: -106.7, south: 25.8, east: -93.3, north: 36.7 }], anchor: { lat: 30.3, lon: -97.7 } },
  { id: "us-greatlakes", name: "Great Lakes", countryName: "United States of America", continent: "North America", rects: [{ west: -93.0, south: 40.0, east: -74.0, north: 49.6 }], anchor: { lat: 43.7, lon: -79.4 } },

  { id: "ca-west", name: "Canada West", countryName: "Canada", continent: "North America", rects: [{ west: -140.0, south: 49.0, east: -104.0, north: 60.0 }], anchor: { lat: 49.3, lon: -123.1 } },
  { id: "ca-east", name: "Canada East", countryName: "Canada", continent: "North America", rects: [{ west: -90.0, south: 43.0, east: -52.0, north: 56.5 }], anchor: { lat: 45.5, lon: -73.6 } },

  { id: "mx-central", name: "Mexico Central", countryName: "Mexico", continent: "North America", rects: [{ west: -105.8, south: 16.5, east: -94.0, north: 24.8 }], anchor: { lat: 19.4, lon: -99.1 } },

  // South America
  { id: "br-coast", name: "Brazil Coast", countryName: "Brazil", continent: "South America", rects: [{ west: -52.0, south: -30.5, east: -34.0, north: -12.0 }], anchor: { lat: -23.5, lon: -46.6 } },
  { id: "ar-pampas", name: "Argentina Pampas", countryName: "Argentina", continent: "South America", rects: [{ west: -66.0, south: -40.8, east: -55.0, north: -31.0 }], anchor: { lat: -34.6, lon: -58.4 } },
  { id: "cl-coast", name: "Chile Coast", countryName: "Chile", continent: "South America", rects: [{ west: -76.0, south: -41.5, east: -70.0, north: -28.0 }], anchor: { lat: -33.4, lon: -70.7 } },

  // Asia
  { id: "jp-kanto", name: "Tokyo / Kanto", countryName: "Japan", continent: "Asia", rects: [{ west: 138.0, south: 34.8, east: 141.2, north: 37.2 }], anchor: { lat: 35.7, lon: 139.7 } },
  { id: "jp-west", name: "Japan West", countryName: "Japan", continent: "Asia", rects: [{ west: 131.0, south: 33.0, east: 136.5, north: 35.4 }], anchor: { lat: 34.7, lon: 135.5 } },
  { id: "kr-core", name: "Korea", countryName: "South Korea", continent: "Asia", rects: [{ west: 126.0, south: 34.5, east: 129.8, north: 38.6 }], anchor: { lat: 37.6, lon: 127.0 } },
  { id: "cn-north", name: "North China", countryName: "China", continent: "Asia", rects: [{ west: 108.0, south: 35.0, east: 124.0, north: 43.5 }], anchor: { lat: 39.9, lon: 116.4 } },
  { id: "cn-south", name: "South China", countryName: "China", continent: "Asia", rects: [{ west: 104.0, south: 21.0, east: 122.5, north: 31.5 }], anchor: { lat: 23.1, lon: 113.3 } },
  { id: "in-north", name: "India North", countryName: "India", continent: "Asia", rects: [{ west: 72.0, south: 24.0, east: 88.5, north: 33.8 }], anchor: { lat: 28.6, lon: 77.2 } },
  { id: "in-south", name: "India South", countryName: "India", continent: "Asia", rects: [{ west: 74.0, south: 8.0, east: 84.5, north: 19.2 }], anchor: { lat: 12.9, lon: 77.6 } },
  { id: "sea-core", name: "Southeast Asia", countryName: "Thailand", continent: "Asia", rects: [{ west: 97.0, south: 5.8, east: 105.8, north: 20.6 }], anchor: { lat: 13.8, lon: 100.5 } },

  // Africa
  { id: "af-north", name: "North Africa", countryName: "Algeria", continent: "Africa", rects: [{ west: -8.8, south: 19.0, east: 12.0, north: 37.5 }], anchor: { lat: 28.0, lon: 2.6 } },
  { id: "af-west", name: "West Africa", countryName: "Nigeria", continent: "Africa", rects: [{ west: 2.5, south: 4.0, east: 14.8, north: 14.8 }], anchor: { lat: 9.1, lon: 7.5 } },
  { id: "af-east", name: "East Africa", countryName: "Kenya", continent: "Africa", rects: [{ west: 33.8, south: -4.8, east: 42.2, north: 5.5 }], anchor: { lat: -1.29, lon: 36.82 } },
  { id: "af-south", name: "South Africa", countryName: "South Africa", continent: "Africa", rects: [{ west: 16.0, south: -35.0, east: 33.0, north: -22.0 }], anchor: { lat: -26.2, lon: 28.0 } },

  // Oceania
  { id: "au-east", name: "Eastern Australia", countryName: "Australia", continent: "Oceania", rects: [{ west: 145.0, south: -38.5, east: 154.0, north: -25.0 }], anchor: { lat: -33.8, lon: 151.2 } },
  { id: "au-west", name: "Western Australia", countryName: "Australia", continent: "Oceania", rects: [{ west: 112.0, south: -35.0, east: 129.0, north: -12.0 }], anchor: { lat: -31.9, lon: 115.9 } },
  { id: "nz-core", name: "New Zealand", countryName: "New Zealand", continent: "Oceania", rects: [{ west: 166.0, south: -47.5, east: 179.0, north: -34.0 }], anchor: { lat: -41.3, lon: 174.8 } },
];

function countryFeatureByName(name: string) {
  return WORLD_COUNTRIES.find((f) => countryName(f) === name) ?? null;
}

export function createInitialTerritories(): Territory[] {
  const territories: Territory[] = [];

  for (const seed of TERRITORY_SEEDS) {
    const cf = countryFeatureByName(seed.countryName);
    if (!cf) continue;
    const baseGeom = gameplayGeometryForCountry(cf);
    if (!baseGeom) continue;

    let geom: Geometry | null = null;
    const parts = seed.rects.map((r) => clipGeometryToRect(baseGeom, r));
    geom = unionGeometries(parts);
    if (!geom) continue;

    territories.push({
      id: seed.id,
      name: seed.name,
      countryName: seed.countryName,
      continent: seed.continent,
      geometry: geom,
      ownerFactionId: null,
      status: "neutral",
      morale: 70,
      defense: 55,
      supporterPresence: 20,
      neighbors: [],
      anchorLat: Number(seed.anchor.lat.toFixed(3)),
      anchorLon: Number(seed.anchor.lon.toFixed(3)),
      requiredSupportersToExpand:
        seed.continent === "Europe" ? 500 : seed.continent === "North America" ? 800 : seed.continent === "Asia" ? 700 : 650,
    });
  }

  const byId = new Map(territories.map((t) => [t.id, t]));
  const wrapLon = (lon: number) => {
    let x = lon;
    while (x > 180) x -= 360;
    while (x < -180) x += 360;
    return x;
  };
  const dist = (a: Territory, b: Territory) => {
    const dLat = a.anchorLat - b.anchorLat;
    const cosLat = Math.cos(((a.anchorLat + b.anchorLat) * 0.5 * Math.PI) / 180);
    const dLon = wrapLon(a.anchorLon - b.anchorLon) * cosLat;
    return Math.sqrt(dLat * dLat + dLon * dLon);
  };

  for (const a of territories) {
    const near = territories
      .filter((b) => b.id !== a.id)
      .map((b) => ({ id: b.id, d: dist(a, b) }))
      .sort((x, y) => x.d - y.d)
      .slice(0, 4)
      .map((x) => x.id);
    a.neighbors = [...new Set(near)].sort();
  }

  const link = (a: string, b: string) => {
    const A = byId.get(a);
    const B = byId.get(b);
    if (!A || !B) return;
    A.neighbors = [...new Set([...A.neighbors, b])].sort();
    B.neighbors = [...new Set([...B.neighbors, a])].sort();
  };
  // Curated cross-region neighbors can be added later once the MVP anchor set stabilizes.
  // Keep neighbor graph purely proximity-based for now.

  return territories;
}
