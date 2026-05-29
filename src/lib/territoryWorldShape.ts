/**
 * Deterministic low-res pixel Earth (64×32). '.' = ocean, '#' = land.
 * Row 0 ≈ north pole; painted at module load — no randomness.
 */

export const MAP_COLS = 64;
export const MAP_ROWS = 32;

function emptyGrid(): string[][] {
  return Array.from({ length: MAP_ROWS }, () => Array.from({ length: MAP_COLS }, () => "."));
}

function fillRect(grid: string[][], r0: number, r1: number, c0: number, c1: number) {
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) grid[r]![c] = "#";
    }
  }
}

function fillEllipse(grid: string[][], cx: number, cy: number, rx: number, ry: number) {
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const nx = (c - cx) / rx;
      const ny = (r - cy) / ry;
      if (nx * nx + ny * ny <= 1) grid[r]![c] = "#";
    }
  }
}

function carveRect(grid: string[][], r0: number, r1: number, c0: number, c1: number) {
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) grid[r]![c] = ".";
    }
  }
}

function buildEarthBitmap(): string[] {
  const g = emptyGrid();

  // Arctic cap
  fillRect(g, 1, 2, 22, 28);
  fillRect(g, 1, 2, 38, 44);

  // North America
  fillEllipse(g, 15, 7, 6, 4.5);
  fillRect(g, 5, 12, 11, 19);
  carveRect(g, 8, 10, 17, 19); // gulf notch

  // South America
  fillEllipse(g, 16, 19, 4, 7);
  fillRect(g, 14, 24, 12, 19);

  // Europe
  fillRect(g, 5, 11, 26, 36);
  carveRect(g, 7, 9, 30, 33); // baltic bite
  // UK bump
  fillRect(g, 7, 8, 24, 25);
  // Scandinavia north
  fillRect(g, 4, 6, 28, 33);
  // Italy boot
  fillRect(g, 10, 13, 31, 32);
  fillRect(g, 12, 13, 32, 33);

  // Africa
  fillEllipse(g, 33, 17, 5, 8);
  fillRect(g, 12, 21, 29, 37);
  carveRect(g, 11, 13, 32, 35); // mediterranean

  // Middle East bridge
  fillRect(g, 10, 14, 37, 43);

  // Asia
  fillEllipse(g, 46, 9, 10, 6);
  fillRect(g, 5, 15, 41, 52);
  carveRect(g, 6, 8, 44, 46);

  // Japan islands
  fillRect(g, 9, 11, 55, 56);
  fillRect(g, 10, 12, 57, 58);

  // Korea peninsula
  fillRect(g, 9, 11, 53, 54);

  // India subcontinent
  fillRect(g, 12, 16, 42, 45);

  // Southeast Asia archipelago hint
  fillRect(g, 14, 16, 48, 51);

  // Australia
  fillEllipse(g, 52, 22, 5, 3);
  fillRect(g, 20, 24, 48, 56);

  // New Zealand hint
  fillRect(g, 23, 24, 58, 59);

  // Atlantic ocean gap (Americas ↔ Eurasia)
  carveRect(g, 4, 20, 21, 25);

  // Pacific separation (clean edges)
  carveRect(g, 0, MAP_ROWS - 1, 0, 8);
  carveRect(g, 0, MAP_ROWS - 1, 59, 63);

  // Isthmus: connect NA–SA
  fillRect(g, 13, 14, 14, 17);

  return g.map((row) => row.join(""));
}

export const EARTH_BITMAP: string[] = buildEarthBitmap();

export function lonForCol(col: number) {
  return Math.round((-180 + (col / (MAP_COLS - 1)) * 360) * 10) / 10;
}

export function latForRow(row: number) {
  return Math.round((72 - (row / (MAP_ROWS - 1)) * 144) * 10) / 10;
}

export function regionForCell(col: number, row: number): string {
  const lon = lonForCol(col);
  const lat = latForRow(row);

  if (row <= 2) return "Arctic Rim";

  if ((col >= 48 && row >= 19) || (lon >= 112 && lat < -8)) return "Oceania";

  if (col >= 54 && row >= 8 && row <= 13) return "Asia";
  if (col >= 52 && row >= 8 && row <= 11) return "Asia";

  if (col >= 10 && col <= 21 && row >= 15) return "South America";
  if (col >= 9 && col <= 21 && row >= 4 && row <= 14) return "North America";

  if (col >= 27 && col <= 40 && row >= 12 && row <= 23) return "Africa";

  if (col >= 36 && col <= 46 && row >= 9 && row <= 15 && lat > -5) return "Middle East";

  if (col >= 25 && col <= 38 && row >= 5 && row <= 13) return "Europe";

  if (col >= 39 && row >= 4 && row <= 18) return "Asia";

  if (lon < -30 && lat > 0) return "North America";
  if (lon < -35 && lat <= 0) return "South America";
  if (lon >= -25 && lon < 55 && lat >= 35) return "Europe";
  if (lon >= -20 && lon < 55 && lat < 35 && lat > -35) return "Africa";
  if (lon >= 55 && lat > 10) return "Asia";
  if (lon >= 95 && lat < 10) return "Oceania";

  return "Unknown";
}

export const LANDMARKS: Array<{ lon: number; lat: number; name: string; region: string }> = [
  { lon: -74, lat: 40, name: "East Coast US", region: "North America" },
  { lon: -118, lat: 37, name: "West Coast US", region: "North America" },
  { lon: -56, lat: -12, name: "Brazil", region: "South America" },
  { lon: -2, lat: 54, name: "UK", region: "Europe" },
  { lon: 12, lat: 42, name: "Italy", region: "Europe" },
  { lon: 10, lat: 50, name: "France-Germany", region: "Europe" },
  { lon: 15, lat: 62, name: "Scandinavia", region: "Europe" },
  { lon: 10, lat: 28, name: "North Africa", region: "Africa" },
  { lon: 45, lat: 26, name: "Middle East", region: "Middle East" },
  { lon: 78, lat: 22, name: "India", region: "Asia" },
  { lon: 105, lat: 35, name: "China", region: "Asia" },
  { lon: 128, lat: 36, name: "Korea", region: "Asia" },
  { lon: 138, lat: 36, name: "Japan", region: "Asia" },
  { lon: 134, lat: -24, name: "Australia", region: "Oceania" },
];

export function nameForLandCell(lon: number, lat: number, region: string, fallbackIdx: number) {
  let best: { name: string; d: number } | null = null;
  for (const lm of LANDMARKS) {
    const dlat = lat - lm.lat;
    const dlon = (lon - lm.lon) * Math.cos((lat * Math.PI) / 180);
    const d = Math.sqrt(dlat * dlat + dlon * dlon);
    if (d <= 11 && (!best || d < best.d)) best = { name: lm.name, d };
  }
  if (best) return best.name;

  const pools: Record<string, string[]> = {
    "North America": ["Yukon", "Prairie", "Lakes", "Sunbelt", "Maritime"],
    "South America": ["Andes", "Amazon", "Pampas", "Patagonia", "Guiana"],
    Europe: ["Baltic", "Alpine", "Iberia", "Balkans", "Lowlands"],
    Africa: ["Maghreb", "Sahel", "Savanna", "Congo", "Cape"],
    "Middle East": ["Levant", "Mesopotamia", "Gulf", "Anatolia", "Sinai"],
    Asia: ["Siberia", "Steppe", "Plateau", "Delta", "Rimland"],
    Oceania: ["Outback", "Coral", "Bush", "Polynesia", "Tasman"],
    "Arctic Rim": ["Glacier", "Tundra", "Permafrost", "Fjord", "Boreal"],
  };
  const pool = pools[region] ?? ["Sector"];
  return `${pool[fallbackIdx % pool.length]} ${fallbackIdx + 1}`;
}
