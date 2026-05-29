import type { NationWar, WarActionLog } from "./nationMvpTypes";
import type { WarActionModifiers } from "./warEscalation";

export type WarActionId = "rally_attack" | "push_frontline" | "reinforce_defense" | "hold_capital";
export type WarSide = "attack" | "defense";

export type WarActionDef = {
  id: WarActionId;
  side: WarSide;
  label: string;
  cooldownMs: number;
  baseMomentum: number;
  participantsBoost: number;
  feedbackAttack: string;
  feedbackDefense: string;
};

export const WAR_ACTIONS: Record<WarActionId, WarActionDef> = {
  rally_attack: {
    id: "rally_attack",
    side: "attack",
    label: "Rally Attack",
    cooldownMs: 20_000,
    baseMomentum: 2.8,
    participantsBoost: 140,
    feedbackAttack: "+{d} attack pressure",
    feedbackDefense: "Attack rallied",
  },
  push_frontline: {
    id: "push_frontline",
    side: "attack",
    label: "Push Frontline",
    cooldownMs: 28_000,
    baseMomentum: 4.2,
    participantsBoost: 90,
    feedbackAttack: "Frontline pushed toward {target}",
    feedbackDefense: "Frontline pressure rising",
  },
  reinforce_defense: {
    id: "reinforce_defense",
    side: "defense",
    label: "Reinforce Defense",
    cooldownMs: 20_000,
    baseMomentum: -3.5,
    participantsBoost: 160,
    feedbackAttack: "Defense reinforced",
    feedbackDefense: "+{d} defense pressure",
  },
  hold_capital: {
    id: "hold_capital",
    side: "defense",
    label: "Hold Capital",
    cooldownMs: 30_000,
    baseMomentum: -5.5,
    participantsBoost: 70,
    feedbackAttack: "Capital defenses strengthened",
    feedbackDefense: "Holding the capital",
  },
};

export function createWarWithParticipation(args: {
  id: string;
  attackerFactionId: string;
  defenderFactionId: string | null;
  attackerNationId: string;
  targetNationId: string;
  startedAt: number;
  endsAt: number;
  attackerActive: number;
  defenderActive: number;
}): NationWar {
  return {
    id: args.id,
    attackerFactionId: args.attackerFactionId,
    defenderFactionId: args.defenderFactionId,
    attackerNationId: args.attackerNationId,
    targetNationId: args.targetNationId,
    startedAt: args.startedAt,
    endsAt: args.endsAt,
    progress: 0,
    attackerParticipants: Math.min(12_000, Math.max(400, Math.round(args.attackerActive * 0.14))),
    defenderParticipants: Math.min(12_000, Math.max(300, Math.round(args.defenderActive * 0.14))),
    actionMomentum: 0,
    recentActions: [],
  };
}

function diminishingFactor(war: NationWar, actionId: WarActionId, now: number) {
  const recentSame = war.recentActions.filter(
    (a) => a.actionId === actionId && now - a.ts < 45_000,
  ).length;
  return 1 / (1 + recentSame * 0.4);
}

export function effectiveMomentumDelta(
  war: NationWar,
  action: WarActionDef,
  now: number,
  modifiers?: WarActionModifiers,
) {
  const base = action.baseMomentum * diminishingFactor(war, action.id, now);
  return base * (modifiers?.effectivenessMult ?? 1);
}

export function applyWarActionToWar(
  war: NationWar,
  action: WarActionDef,
  actorLabel: string,
  targetNationName: string,
  now: number,
  modifiers?: WarActionModifiers,
): { war: NationWar; momentumDelta: number; feedback: string } {
  const delta = effectiveMomentumDelta(war, action, now, modifiers);
  const log: WarActionLog = {
    id: `wa-${now}-${Math.random().toString(16).slice(2, 6)}`,
    ts: now,
    actionId: action.id,
    side: action.side,
    label: action.label,
    momentumDelta: delta,
    actorLabel,
  };

  const tpl = action.side === "attack" ? action.feedbackAttack : action.feedbackDefense;
  const feedback = tpl
    .replace("{d}", Math.abs(delta).toFixed(1))
    .replace("{target}", targetNationName);

  const next: NationWar = {
    ...war,
    actionMomentum: Math.max(-22, Math.min(22, war.actionMomentum + delta)),
    attackerParticipants:
      action.side === "attack"
        ? war.attackerParticipants + Math.round(action.participantsBoost * diminishingFactor(war, action.id, now))
        : war.attackerParticipants,
    defenderParticipants:
      action.side === "defense"
        ? war.defenderParticipants + Math.round(action.participantsBoost * diminishingFactor(war, action.id, now))
        : war.defenderParticipants,
    recentActions: [log, ...war.recentActions].slice(0, 8),
  };

  return { war: next, momentumDelta: delta, feedback };
}

export function computeWarProgressTick(
  war: NationWar,
  attackerActive: number,
  defenderActive: number,
  dtSec: number,
): NationWar {
  const durationSec = Math.max(1, (war.endsAt - war.startedAt) / 1000);
  const atkP = war.attackerParticipants + attackerActive * 0.018;
  const defP = war.defenderParticipants + defenderActive * 0.018;
  const total = atkP + defP || 1;
  const pressureSwing = ((atkP - defP) / total) * 0.28;
  const bias = war.actionMomentum / 100;
  const base = war.defenderFactionId ? 0.42 : 0.78;
  const rate = (base + pressureSwing + bias) * (100 / durationSec);
  const progress = Math.max(0, Math.min(100, war.progress + rate * dtSec));
  const actionMomentum = war.actionMomentum * 0.96;

  return { ...war, progress, actionMomentum };
}

export function getPlayerWarSide(
  war: NationWar,
  factionId: string | null,
): WarSide | null {
  if (!factionId) return null;
  if (war.attackerFactionId === factionId) return "attack";
  if (war.defenderFactionId === factionId) return "defense";
  return null;
}

export const ATTACKER_ACTIONS: WarActionId[] = ["rally_attack", "push_frontline"];
export const DEFENDER_ACTIONS: WarActionId[] = ["reinforce_defense", "hold_capital"];
