export type BrandStatus = "expanding" | "fighting" | "defending" | "recovering";

export type Brand = {
  id: string;
  name: string;
  color: string;
  budget: number;
  supporters: number;
  power: number;
  activeBoosts: number;
  spawnCellId: string;
  status: BrandStatus;
  fortifyUntil: number;
  blitzUntil: number;
  signalUntil: number;
  abilityCooldownUntil: number;
};

export type Battle = {
  attackerId: string;
  defenderId: string;
  progress: number;
  cellId: string;
  ticks: number;
};

export type Territory = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  ownerBrandId: string | null;
  strength: number;
  battle: Battle | null;
  neighbors: string[];
};

/** @deprecated Use Territory — kept as alias for existing imports */
export type Cell = Territory;

export type TerritoryEvent = {
  id: string;
  ts: number;
  text: string;
};

export type WorldState = {
  cells: Territory[];
  brands: Brand[];
};

export type AbilityId = "fortify" | "blitz" | "signal";
