import type { TerritoryEvent } from "./territoryTypes";
import type { Faction } from "./factionTypes";
import type { FactionMember } from "./factionRoles";
import { seedFactionRoster } from "./factionRoles";
import type { Nation, NationWar } from "./nationMvpTypes";
import { createInitialNations } from "./nationMvpData";
import { createWarWithParticipation } from "./warParticipation";
import { cinematicCapture, cinematicWarDeclared } from "./warEventFeed";

export type AlphaScenario = {
  nations: Nation[];
  factions: Faction[];
  members: FactionMember[];
  wars: NationWar[];
  warProposals: [];
  events: TerritoryEvent[];
  selectedWarId: string | null;
};

/**
 * Deterministic timestamp so SSR + hydration match.
 * We shift the whole scenario to real "now" on first client effect.
 */
export const SCENARIO_BASE_TS = 1_750_000_000_000; // stable constant

function byName(nations: Nation[]) {
  return new Map(nations.map((n) => [n.name, n]));
}

function mustNationId(nationsByName: Map<string, Nation>, name: string) {
  const n = nationsByName.get(name);
  if (!n) throw new Error(`[scenario] missing nation ${name}`);
  return n.id;
}

export function createAlphaScenario(baseTs = SCENARIO_BASE_TS): AlphaScenario {
  const nations = createInitialNations();
  const nByName = byName(nations);

  // Key countries for an immediately readable alpha world.
  const franceId = mustNationId(nByName, "France");
  const italyId = mustNationId(nByName, "Italy");
  const germanyId = mustNationId(nByName, "Germany");

  const factions: Faction[] = [
    {
      id: "f-fr",
      name: "Hex Front",
      color: "#a78bfa",
      aggression: 0.62,
      capitalTerritoryId: franceId,
      supportersTotal: 62_000,
      supportersActive: 18_500,
      engagementRate: 0.18,
      morale: 74,
      influence: 0,
      engagement: 62,
    },
    {
      id: "f-it",
      name: "Roma Guard",
      color: "#22d3ee",
      aggression: 0.55,
      capitalTerritoryId: italyId,
      supportersTotal: 54_000,
      supportersActive: 16_300,
      engagementRate: 0.17,
      morale: 71,
      influence: 0,
      engagement: 60,
    },
    {
      id: "f-de",
      name: "Rhine Union",
      color: "#34d399",
      aggression: 0.58,
      capitalTerritoryId: germanyId,
      supportersTotal: 58_000,
      supportersActive: 17_200,
      engagementRate: 0.17,
      morale: 72,
      influence: 0,
      engagement: 61,
    },
  ];

  const members: FactionMember[] = factions.flatMap((f) => seedFactionRoster(f.id, f.name));

  // Ownership + support — subtle, readable, immediately alive.
  const factionByCap = new Map(factions.map((f) => [f.capitalTerritoryId, f.id]));
  const nationsSeeded = nations.map((n) => {
    const ownerFactionId = factionByCap.get(n.id) ?? null;
    if (!ownerFactionId) return n;
    const fill = Math.min(n.audienceCap, Math.max(0, Math.round(n.audienceCap * 0.62)));
    return { ...n, ownerFactionId, status: "owned" as const, currentSupport: fill };
  });

  // One active European war with pressure already building.
  const warId = "w-alpha-eu-1";
  const startedAt = baseTs - 18_000;
  const endsAt = baseTs + 72_000;
  const warBase = createWarWithParticipation({
    id: warId,
    attackerFactionId: "f-fr",
    defenderFactionId: "f-it",
    attackerNationId: franceId,
    targetNationId: italyId,
    startedAt,
    endsAt,
    attackerActive: factions[0]!.supportersActive,
    defenderActive: factions[1]!.supportersActive,
  });

  const wars: NationWar[] = [
    {
      ...warBase,
      progress: 68,
      actionMomentum: 11,
      attackerParticipants: Math.max(warBase.attackerParticipants, 2100),
      defenderParticipants: Math.max(warBase.defenderParticipants, 1700),
      reinforcementSurgeUntil: baseTs + 12_000,
      escalation: {
        phase: "critical",
        defenderAlert: "capital_threatened",
        attackerAlert: "stable",
      },
    },
  ];

  // Mark the defender nation contested.
  const nationsFinal = nationsSeeded.map((n) => (n.id === italyId ? { ...n, status: "contested" as const } : n));

  const events: TerritoryEvent[] = [
    { id: "boot", ts: baseTs - 25_000, text: cinematicWarDeclared("France", "Italy") },
    { id: "boot-2", ts: baseTs - 12_000, text: "ITALY — CAPITAL UNDER THREAT" },
    { id: "boot-3", ts: baseTs - 8_000, text: "EMERGENCY REINFORCEMENTS ARRIVE — ITALY" },
    { id: "boot-4", ts: baseTs - 4_000, text: "FINAL DEFENSIVE PUSH — ITALY" },
    // Optional: a recent conquest headline to set the tone (kept rare)
    { id: "boot-5", ts: baseTs - 2_000, text: cinematicCapture("Rhine Union", "Austria") },
  ];

  return {
    nations: nationsFinal,
    factions,
    members,
    wars,
    warProposals: [],
    events,
    selectedWarId: warId,
  };
}

export function shiftScenarioToNow(s: AlphaScenario, now: number): AlphaScenario {
  const base = s.events.reduce((min, e) => Math.min(min, e.ts), SCENARIO_BASE_TS);
  const delta = now - base;
  const shift = (t: number) => t + delta;

  return {
    ...s,
    events: s.events.map((e) => ({ ...e, ts: shift(e.ts) })),
    wars: s.wars.map((w) => ({
      ...w,
      startedAt: shift(w.startedAt),
      endsAt: shift(w.endsAt),
      reinforcementSurgeUntil: w.reinforcementSurgeUntil ? shift(w.reinforcementSurgeUntil) : undefined,
      momentumSurgeUntil: w.momentumSurgeUntil ? shift(w.momentumSurgeUntil) : undefined,
      recentActions: w.recentActions.map((a) => ({ ...a, ts: shift(a.ts) })),
    })),
  };
}

