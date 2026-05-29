import type { NationWar } from "./nationMvpTypes";
import type { WarActionDef, WarSide } from "./warParticipation";

export type WarPhase = "early" | "active" | "critical" | "last_stand";
export type NationAlertLevel = "stable" | "under_attack" | "critical_defense" | "capital_threatened" | "last_stand";

export type WarEscalationSnapshot = {
  phase: WarPhase;
  defenderAlert: NationAlertLevel;
  attackerAlert: NationAlertLevel;
};

export type NationAlertVisual = {
  level: NationAlertLevel;
  pulse: boolean;
  glow: number;
  banner: string | null;
};

export type WarActionModifiers = {
  cooldownMult: number;
  effectivenessMult: number;
  reinforcementSurge: boolean;
  momentumSurge: boolean;
};

const REINFORCEMENT_SURGE_MS = 9_000;
const MOMENTUM_SURGE_MS = 5_500;

export function normalizeEscalationWar(w: NationWar): NationWar {
  return {
    ...w,
    escalation: w.escalation ?? {
      phase: "early",
      defenderAlert: "stable",
      attackerAlert: "stable",
    },
  };
}

function warDurationMs(w: NationWar) {
  return Math.max(1, w.endsAt - w.startedAt);
}

function timeRatio(w: NationWar, now: number) {
  const left = Math.max(0, w.endsAt - now);
  return left / warDurationMs(w);
}

function capturePressure(w: NationWar) {
  return w.progress / 100;
}

function defenderPressure(w: NationWar) {
  const cap = capturePressure(w);
  const mom = w.actionMomentum / 22;
  return Math.max(0, Math.min(1, cap * 0.65 + Math.max(0, mom) * 0.35));
}

function recentActionCount(w: NationWar, now: number, windowMs: number) {
  return w.recentActions.filter((a) => now - a.ts <= windowMs).length;
}

function recentMomentumSum(w: NationWar, now: number, windowMs: number) {
  return w.recentActions
    .filter((a) => now - a.ts <= windowMs)
    .reduce((s, a) => s + Math.abs(a.momentumDelta), 0);
}

export function deriveWarPhase(w: NationWar, now: number): WarPhase {
  const wn = normalizeEscalationWar(w);
  if (wn.reinforcementSurgeUntil && wn.reinforcementSurgeUntil > now) return "last_stand";

  const cap = capturePressure(wn);
  const tr = timeRatio(wn, now);
  const elapsed = 1 - tr;
  const recentActions = recentActionCount(wn, now, 9_000);
  const recentBurst = recentMomentumSum(wn, now, 10_000);

  if (cap >= 0.82 || tr <= 0.12) return "last_stand";
  if (cap >= 0.58 || tr <= 0.32 || Math.abs(wn.actionMomentum) >= 14) return "critical";
  if (recentActions >= 4 || recentBurst >= 9) return "critical";
  if (elapsed < 0.22 && cap < 0.28) return "early";
  return "active";
}

export function deriveNationAlert(
  war: NationWar,
  nationId: string,
  now: number,
): NationAlertLevel {
  const w = normalizeEscalationWar(war);
  const phase = deriveWarPhase(w, now);
  const isDefender = nationId === w.targetNationId;
  const isAttacker = nationId === w.attackerNationId;
  if (!isDefender && !isAttacker) return "stable";

  const pressure = defenderPressure(w);
  const tr = timeRatio(w, now);

  if (isDefender) {
    if (phase === "last_stand" || pressure >= 0.78) return "last_stand";
    if (pressure >= 0.62 || tr <= 0.22) return "capital_threatened";
    if (pressure >= 0.46 || tr <= 0.32) return "critical_defense";
    if (pressure >= 0.22 || w.actionMomentum > 4) return "under_attack";
    return "stable";
  }

  // Attacker nation — mostly stable, but can be flagged on breakthrough windows
  if (w.progress >= 72 && w.actionMomentum > 6) return "capital_threatened";
  if (w.progress >= 58 && w.actionMomentum > 4) return "critical_defense";
  return "stable";
}

export function nationAlertVisual(level: NationAlertLevel, nationName: string): NationAlertVisual {
  const banners: Record<NationAlertLevel, string | null> = {
    stable: null,
    under_attack: `${nationName.toUpperCase()} UNDER ATTACK`,
    critical_defense: `${nationName.toUpperCase()} — CRITICAL DEFENSE`,
    capital_threatened: `${nationName.toUpperCase()} — CAPITAL UNDER THREAT`,
    last_stand: `${nationName.toUpperCase()} — LAST STAND`,
  };
  const glow: Record<NationAlertLevel, number> = {
    stable: 0,
    under_attack: 0.55,
    critical_defense: 0.78,
    capital_threatened: 0.9,
    last_stand: 1,
  };
  return {
    level,
    pulse:
      level === "under_attack" ||
      level === "critical_defense" ||
      level === "capital_threatened" ||
      level === "last_stand",
    glow: glow[level],
    banner: banners[level],
  };
}

export function buildNationAlertMap(
  wars: NationWar[],
  nationNames: Map<string, string>,
  now: number,
): Map<string, NationAlertVisual> {
  const out = new Map<string, NationAlertVisual>();
  for (const w of wars) {
    for (const nid of [w.attackerNationId, w.targetNationId]) {
      const name = nationNames.get(nid) ?? "Nation";
      const level = deriveNationAlert(w, nid, now);
      const prev = out.get(nid);
      const next = nationAlertVisual(level, name);
      if (!prev || glowRank(next.level) > glowRank(prev.level)) {
        out.set(nid, next);
      }
    }
  }
  return out;
}

function glowRank(l: NationAlertLevel) {
  const order: NationAlertLevel[] = ["stable", "under_attack", "critical_defense", "capital_threatened", "last_stand"];
  return order.indexOf(l);
}

export function phaseLabel(phase: WarPhase): string {
  const labels: Record<WarPhase, string> = {
    early: "Early",
    active: "Active",
    critical: "Critical",
    last_stand: "Last stand",
  };
  return labels[phase];
}

export function isReinforcementSurgeActive(w: NationWar, now: number) {
  return !!(w.reinforcementSurgeUntil && w.reinforcementSurgeUntil > now);
}

export function isMomentumSurgeActive(w: NationWar, now: number) {
  return !!(w.momentumSurgeUntil && w.momentumSurgeUntil > now);
}

export function getWarActionModifiers(w: NationWar, side: WarSide, now: number): WarActionModifiers {
  const rein = isReinforcementSurgeActive(w, now) && side === "defense";
  const mom = isMomentumSurgeActive(w, now) && w.momentumSurgeSide === side;

  let cooldownMult = 1;
  let effectivenessMult = 1;
  if (rein) {
    cooldownMult = 0.72;
    effectivenessMult = 1.12;
  }
  if (mom) {
    effectivenessMult *= 1.18;
  }
  return { cooldownMult, effectivenessMult, reinforcementSurge: rein, momentumSurge: mom };
}

export function effectiveCooldownMs(
  action: WarActionDef,
  war: NationWar,
  side: WarSide,
  now: number,
): number {
  const { cooldownMult } = getWarActionModifiers(war, side, now);
  return Math.round(action.cooldownMs * cooldownMult);
}

function shouldStartReinforcementSurge(w: NationWar, now: number): boolean {
  if (!w.defenderFactionId) return false;
  if (isReinforcementSurgeActive(w, now)) return false;
  const age = now - w.startedAt;
  if (age < 2_500) return false;

  const phase = deriveWarPhase(w, now);
  const pressure = defenderPressure(w);
  if (phase === "last_stand") return true;
  if (pressure >= 0.62 && w.actionMomentum > 2) return true;
  if (w.progress >= 58 && w.defenderParticipants < w.attackerParticipants * 0.85) return true;
  if (recentActionCount(w, now, 7_000) >= 4) return true; // sudden activity spike
  return false;
}

function detectMomentumSurgeTrigger(w: NationWar, now: number): { side: WarSide; label: string } | null {
  const recent = recentActionCount(w, now, 8_000);
  const momBurst = recentMomentumSum(w, now, 10_000);
  if (recent < 3 && momBurst < 7) return null;

  const atkRecent = w.recentActions.filter((a) => a.side === "attack" && now - a.ts <= 8_000).length;
  const defRecent = w.recentActions.filter((a) => a.side === "defense" && now - a.ts <= 8_000).length;

  if (atkRecent >= defRecent + 2 || w.actionMomentum > 5) {
    return { side: "attack", label: "Massive Frontline Push" };
  }
  if (defRecent >= atkRecent + 2 || w.actionMomentum < -4) {
    return { side: "defense", label: "Defensive Counterattack" };
  }
  return { side: w.actionMomentum >= 0 ? "attack" : "defense", label: "Momentum Shift" };
}

export type EscalationTickResult = {
  war: NationWar;
  feedEvents: string[];
  screenPulse: boolean;
};

/** Advance surges + emit transition feed lines (call once per sim tick per war). */
export function tickWarEscalation(
  war: NationWar,
  now: number,
  names: { attacker: string; defender: string },
): EscalationTickResult {
  let w = normalizeEscalationWar(war);
  const feedEvents: string[] = [];
  let screenPulse = false;

  // Expire surges
  if (w.reinforcementSurgeUntil && w.reinforcementSurgeUntil <= now) {
    w = { ...w, reinforcementSurgeUntil: undefined };
  }
  if (w.momentumSurgeUntil && w.momentumSurgeUntil <= now) {
    w = { ...w, momentumSurgeUntil: undefined, momentumSurgeSide: undefined, momentumSurgeLabel: undefined };
  }

  if (shouldStartReinforcementSurge(w, now)) {
    w = { ...w, reinforcementSurgeUntil: now + REINFORCEMENT_SURGE_MS };
    feedEvents.push(`EMERGENCY REINFORCEMENTS ARRIVE — ${names.defender.toUpperCase()}`);
    feedEvents.push(`FINAL DEFENSIVE PUSH — ${names.defender.toUpperCase()}`);
  }

  if (!isMomentumSurgeActive(w, now)) {
    const trig = detectMomentumSurgeTrigger(w, now);
    if (trig) {
      w = {
        ...w,
        momentumSurgeUntil: now + MOMENTUM_SURGE_MS,
        momentumSurgeSide: trig.side,
        momentumSurgeLabel: trig.label,
      };
      feedEvents.push(trig.label.toUpperCase());
      screenPulse = true;
    }
  }

  const phase = deriveWarPhase(w, now);
  const defenderAlert = deriveNationAlert(w, w.targetNationId, now);
  const attackerAlert = deriveNationAlert(w, w.attackerNationId, now);
  const snap = w.escalation!;

  if (phase !== snap.phase) {
    if (phase === "critical") feedEvents.push(`CRITICAL PHASE — ${names.defender.toUpperCase()} FRONT`);
    if (phase === "last_stand") feedEvents.push(`LAST STAND ACTIVATED — ${names.defender.toUpperCase()}`);
    if (phase === "active" && snap.phase === "early") {
      feedEvents.push(`FRONTLINE ENGAGED — ${names.attacker.toUpperCase()} VS ${names.defender.toUpperCase()}`);
    }
  }

  if (defenderAlert !== snap.defenderAlert) {
    if (defenderAlert === "under_attack") feedEvents.push(`${names.defender.toUpperCase()} UNDER ATTACK`);
    if (defenderAlert === "critical_defense") feedEvents.push(`${names.defender.toUpperCase()} ENTERS CRITICAL DEFENSE`);
    if (defenderAlert === "capital_threatened") feedEvents.push(`${names.defender.toUpperCase()} CAPITAL UNDER THREAT`);
    if (defenderAlert === "last_stand") feedEvents.push(`LAST STAND — ${names.defender.toUpperCase()}`);
  }

  if (attackerAlert === "capital_threatened" && attackerAlert !== snap.attackerAlert) {
    feedEvents.push(`${names.attacker.toUpperCase()} BREAKS THE FRONT`);
  }

  w = {
    ...w,
    escalation: { phase, defenderAlert, attackerAlert },
  };

  return { war: w, feedEvents, screenPulse };
}

export function anyScreenPulseActive(wars: NationWar[], now: number) {
  return wars.some((w) => isMomentumSurgeActive(w, now));
}
