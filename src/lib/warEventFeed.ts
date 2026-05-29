import type { NationWar } from "./nationMvpTypes";
import type { WarActionDef, WarActionId, WarSide } from "./warParticipation";
import { deriveWarPhase, phaseLabel, type WarPhase } from "./warEscalation";

export function cinematicWarDeclared(attacker: string, defender: string) {
  return `${attacker.toUpperCase()} STRIKES — ${defender.toUpperCase()} BRACES`;
}

export function cinematicCapture(attackerFaction: string, target: string) {
  return `${attackerFaction.toUpperCase()} SEIZES ${target.toUpperCase()}`;
}

export function cinematicProposal(target: string) {
  return `WAR COUNCIL VOTES — INVASION OF ${target.toUpperCase()}`;
}

export function cinematicApproved(target: string) {
  return `INVASION APPROVED — ${target.toUpperCase()} IN THE CROSSHAIRS`;
}

export function cinematicRejected(target: string) {
  return `INVASION DENIED — ${target.toUpperCase()} SPARED (FOR NOW)`;
}

export function cinematicDefend(nation: string, faction: string) {
  return `${faction.toUpperCase()} RALLIES DEFENSE OF ${nation.toUpperCase()}`;
}

export function cinematicSupportCap(nation: string) {
  return `${nation.toUpperCase()} AT FULL STRENGTH`;
}

export function cinematicFounderClaim(nation: string, faction: string) {
  return `${faction.toUpperCase()} RAISES BANNER OVER ${nation.toUpperCase()}`;
}

export function cinematicSoldierAction(
  actionId: WarActionId,
  side: WarSide,
  ctx: {
    actorNation: string;
    targetNation: string;
    actorFaction?: string;
    surgeLabel?: string | null;
  },
): string {
  const atk = ctx.actorNation.toUpperCase();
  const def = ctx.targetNation.toUpperCase();
  const fac = ctx.actorFaction?.toUpperCase();

  if (ctx.surgeLabel) {
    return ctx.surgeLabel.toUpperCase();
  }

  const lines: Record<WarActionId, Record<WarSide, string>> = {
    rally_attack: {
      attack: fac ? `${fac} STORMS THE FRONT` : `${atk} RALLIES THE ASSAULT`,
      defense: `${def} UNDER PRESSURE`,
    },
    push_frontline: {
      attack: `${atk} BREAKS THE FRONT`,
      defense: `FRONTLINE BUCKLES — ${def}`,
    },
    reinforce_defense: {
      attack: `${atk} HAMMERS THE LINE`,
      defense: `${def} HOLDS THE LINE`,
    },
    hold_capital: {
      attack: `${def} CAPITAL UNDER SIEGE`,
      defense: `${def} DIGS IN — CAPITAL HELD`,
    },
  };

  return lines[actionId][side];
}

export function cinematicPhaseBadge(war: NationWar, now: number): string {
  return phaseLabel(deriveWarPhase(war, now)).toUpperCase();
}

export function cinematicActionFeedback(
  action: WarActionDef,
  side: WarSide,
  targetNation: string,
  momentumDelta: number,
): string {
  if (action.id === "push_frontline" && side === "attack") {
    return `Momentum surges toward ${targetNation}`;
  }
  if (action.id === "reinforce_defense" && side === "defense") {
    return `Defense reinforced · +${Math.abs(momentumDelta).toFixed(1)} pressure`;
  }
  if (side === "attack") {
    return `+${Math.abs(momentumDelta).toFixed(1)} attack pressure`;
  }
  return `Holding against the assault`;
}

export function cinematicDemoAction(side: WarSide, nation: string): string | null {
  if (Math.random() > 0.4) return null;
  return side === "attack"
    ? `${nation.toUpperCase()} PUSHES THE FRONTLINE`
    : `${nation.toUpperCase()} HOLDS THE LINE`;
}

export function cinematicReinforcementAlly(supporter: string, supported: string) {
  return `${supporter.toUpperCase()} SENDS SUPPORT TO ${supported.toUpperCase()}`;
}
