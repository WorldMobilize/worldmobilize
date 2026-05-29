import type { Geometry } from "geojson";

export type TerritoryStatus = "neutral" | "owned" | "contested";

export type Territory = {
  id: string;
  name: string;
  countryName: string;
  continent: string;
  geometry: Geometry;

  ownerFactionId: string | null;
  status: TerritoryStatus;

  /** 0..100 local morale (affects defense + war resilience). */
  morale: number;
  /** 0..100 defense score (fortifications, terrain, readiness). */
  defense: number;
  /** Supporter footprint inside this territory (0..100). */
  supporterPresence: number;

  neighbors: string[];

  anchorLat: number;
  anchorLon: number;

  /** Minimum active supporters required to expand/attack from this sector. */
  requiredSupportersToExpand: number;
};

export type WarSideSupport = {
  /** active participants currently contributing to this side */
  active: number;
  /** momentum 0..100 (builds with participation, decays slowly) */
  momentum: number;
};

export type TerritoryWar = {
  id: string;
  territoryId: string;
  attackerFactionId: string;
  defenderFactionId: string;
  startedAt: number;
  endsAt: number;
  progress: number; // 0..100 attacker capture progress
  attack: WarSideSupport;
  defense: WarSideSupport;
  lastTickAt: number;
};

