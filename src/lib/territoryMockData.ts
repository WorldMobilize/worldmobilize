import type { Brand, Territory, WorldState } from "./territoryTypes";
import { territoryByRegion, WORLD_TERRITORIES } from "./territoryWorldData";

const BRAND_DEFS: Array<{
  id: string;
  name: string;
  color: string;
  budget: number;
  region: string;
}> = [
  { id: "openai", name: "OpenAI", color: "#22d3ee", budget: 9000, region: "Asia" },
  { id: "nike", name: "Nike", color: "#a78bfa", budget: 7200, region: "North America" },
  { id: "netflix", name: "Netflix", color: "#fb7185", budget: 6400, region: "Europe" },
  { id: "redbull", name: "Red Bull", color: "#34d399", budget: 6000, region: "Middle East" },
  { id: "discord", name: "Discord", color: "#fbbf24", budget: 5200, region: "Europe" },
  { id: "steam", name: "Steam", color: "#60a5fa", budget: 4800, region: "Asia" },
  { id: "tesla", name: "Tesla", color: "#f472b6", budget: 4300, region: "North America" },
  { id: "spotify", name: "Spotify", color: "#c084fc", budget: 4100, region: "Europe" },
];

function cloneTerritories(): Territory[] {
  return WORLD_TERRITORIES.map((t) => ({
    ...t,
    neighbors: [...t.neighbors],
    battle: null,
    ownerBrandId: null,
    strength: 1,
  }));
}

export function createInitialWorld(): WorldState {
  const cells = cloneTerritories();
  const byId = new Map(cells.map((c) => [c.id, c]));

  const regionSpawnIdx = new Map<string, number>();
  const brands: Brand[] = BRAND_DEFS.map((b) => {
    const pool = territoryByRegion(b.region);
    const idx = regionSpawnIdx.get(b.region) ?? 0;
    regionSpawnIdx.set(b.region, idx + 1);
    const spawn = pool[idx % Math.max(1, pool.length)] ?? cells[0]!;
    const spawnCell = byId.get(spawn.id)!;
    spawnCell.ownerBrandId = b.id;
    spawnCell.strength = 3;

    // Seed a small cluster via neighbors (deterministic order)
    const cluster = [spawnCell, ...spawnCell.neighbors.map((nid) => byId.get(nid)).filter(Boolean)].slice(0, 4);
    for (const c of cluster) {
      if (!c) continue;
      c.ownerBrandId = b.id;
      c.strength = Math.max(c.strength, 2);
    }

    return {
      id: b.id,
      name: b.name,
      color: b.color,
      budget: b.budget,
      supporters: 120 + Math.floor(b.budget / 100),
      power: 10 + Math.floor(b.budget / 800),
      activeBoosts: 0,
      spawnCellId: spawnCell.id,
      status: "expanding",
      fortifyUntil: 0,
      blitzUntil: 0,
      signalUntil: 0,
      abilityCooldownUntil: 0,
    };
  });

  return { cells, brands };
}

export function controlledCount(cells: Territory[], brandId: string) {
  return cells.filter((c) => c.ownerBrandId === brandId).length;
}
