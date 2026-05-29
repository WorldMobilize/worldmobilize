import type { NationWar } from "./nationMvpTypes";
import {
  getWarActionModifiers,
  normalizeEscalationWar,
  tickWarEscalation,
} from "./warEscalation";
import {
  applyWarActionToWar,
  WAR_ACTIONS,
  type WarActionId,
  type WarSide,
} from "./warParticipation";
import { cinematicSoldierAction } from "./warEventFeed";

export function normalizeWarState(w: NationWar): NationWar {
  return normalizeEscalationWar({
    ...w,
    attackerParticipants: w.attackerParticipants ?? 500,
    defenderParticipants: w.defenderParticipants ?? 400,
    actionMomentum: w.actionMomentum ?? 0,
    recentActions: w.recentActions ?? [],
  });
}

export function runWarEscalationTick(
  wars: NationWar[],
  nationNames: Map<string, string>,
  now: number,
): { wars: NationWar[]; feedEvents: string[]; screenPulse: boolean } {
  const feedEvents: string[] = [];
  let screenPulse = false;
  const next = wars.map((w) => {
    const nw = normalizeWarState(w);
    const attacker = nationNames.get(nw.attackerNationId) ?? "Attackers";
    const defender = nationNames.get(nw.targetNationId) ?? "Defenders";
    const res = tickWarEscalation(nw, now, { attacker, defender });
    feedEvents.push(...res.feedEvents);
    if (res.screenPulse) screenPulse = true;
    return res.war;
  });
  return { wars: next, feedEvents, screenPulse };
}

export function applyPlayerWarAction(args: {
  war: NationWar;
  actionId: WarActionId;
  side: WarSide;
  actorLabel: string;
  attackerNationName: string;
  defenderNationName: string;
  attackerFactionName?: string;
  now: number;
}): {
  war: NationWar;
  feedback: string;
  feedLine: string;
  screenPulse: boolean;
} {
  const w = normalizeWarState(args.war);
  const action = WAR_ACTIONS[args.actionId];
  const mods = getWarActionModifiers(w, args.side, args.now);
  const { war: nextWar, momentumDelta, feedback } = applyWarActionToWar(
    w,
    action,
    args.actorLabel,
    args.defenderNationName,
    args.now,
    mods,
  );

  const actorNation = args.side === "attack" ? args.attackerNationName : args.defenderNationName;
  const feedLine = cinematicSoldierAction(args.actionId, args.side, {
    actorNation,
    targetNation: args.defenderNationName,
    actorFaction: args.attackerFactionName,
    surgeLabel: mods.momentumSurge ? w.momentumSurgeLabel ?? "Momentum surge" : null,
  });

  return {
    war: nextWar,
    feedback,
    feedLine,
    screenPulse: mods.momentumSurge,
  };
}
