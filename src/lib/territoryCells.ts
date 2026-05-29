type Cell = { x: number; y: number; d: number };

function hash32(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic tiny “pixel cells” around a territory anchor (screen-space).
 * We intentionally keep this local and clipped on the SVG layer (no geo subdivision yet).
 */
export function generateTerritoryCells(territoryId: string, opts: { nx?: number; ny?: number; spacing?: number }) {
  const nx = opts.nx ?? 10;
  const ny = opts.ny ?? 10;
  const spacing = opts.spacing ?? 4.2;
  const seed = hash32(`cells:${territoryId}`);
  const rnd = mulberry32(seed);

  const cells: Cell[] = [];
  const w = (nx - 1) * spacing;
  const h = (ny - 1) * spacing;

  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const jx = (rnd() - 0.5) * spacing * 0.45;
      const jy = (rnd() - 0.5) * spacing * 0.45;
      const x = ix * spacing - w / 2 + jx;
      const y = iy * spacing - h / 2 + jy;
      const d = Math.sqrt(x * x + y * y);
      // Slightly prefer a blob (drop far corners)
      if (d > Math.max(w, h) * 0.62) continue;
      cells.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), d: Number(d.toFixed(2)) });
    }
  }

  // Order by distance to center so “growth” looks like an organic blob.
  cells.sort((a, b) => a.d - b.d);
  return cells;
}

/**
 * Prototype mapping: supporters → controlled cell count.
 * Matches requested “lumpy” increases without radius visuals.
 */
export function controlledCellsForSupporters(totalSupporters: number) {
  const s = Math.max(0, Math.floor(totalSupporters));
  let cells = 20; // starting region baseline
  cells += Math.min(25, Math.floor(s / 100) * 5); // +5 per 100 up to +25
  if (s > 500) cells += Math.min(120, Math.floor((s - 500) / 1000) * 30); // +30 per 1k up to +120
  if (s > 5000) cells += Math.min(240, Math.floor((s - 5000) / 10000) * 120); // +120 per 10k up to +240
  return Math.max(10, Math.min(220, cells));
}

