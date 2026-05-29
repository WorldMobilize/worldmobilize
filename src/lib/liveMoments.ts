export type MomentPriority = "low" | "medium" | "high" | "critical";

export type LiveMoment = {
  id: string;
  ts: number;
  text: string;
  priority: MomentPriority;
  ttlMs: number;
};

export type MomentGateState = {
  /** last shown time by normalized banner text */
  lastShownByText: Record<string, number>;
  /** last enqueued time by normalized banner text */
  lastEnqueuedByText: Record<string, number>;
};

export function createInitialMomentGateState(): MomentGateState {
  return { lastShownByText: {}, lastEnqueuedByText: {} };
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
}

export function createMoment(text: string, priority: MomentPriority): LiveMoment {
  const ttlMs =
    priority === "critical" ? 5200 : priority === "high" ? 4200 : priority === "medium" ? 3200 : 2400;
  return {
    id: makeId("m"),
    ts: Date.now(),
    text,
    priority,
    ttlMs,
  };
}

export function classifyMoment(text: string): { priority: MomentPriority; bannerText: string | null } {
  const t = text.trim();
  if (!t) return { priority: "low", bannerText: null };

  // Conquest moments
  if (/\bHAS FALLEN\b/i.test(t)) return { priority: "critical", bannerText: t.toUpperCase() };
  if (/\bSEIZES\b|\bCAPTURES\b/i.test(t)) return { priority: "critical", bannerText: t.toUpperCase() };

  // War escalation moments
  if (/\bLAST STAND ACTIVATED\b/i.test(t)) return { priority: "critical", bannerText: t.toUpperCase() };
  if (/\bCAPITAL UNDER THREAT\b/i.test(t)) return { priority: "critical", bannerText: t.toUpperCase() };
  if (/\bEMERGENCY REINFORCEMENTS ARRIVE\b/i.test(t)) return { priority: "high", bannerText: t.toUpperCase() };
  if (/\bFINAL DEFENSIVE PUSH\b/i.test(t)) return { priority: "high", bannerText: t.toUpperCase() };

  // Volatility moments
  if (/\bMOMENTUM SHIFT\b|\bCOUNTERATTACK\b|\bFRONTLINE\b/i.test(t)) return { priority: "medium", bannerText: t.toUpperCase() };

  // Default: keep in feed only
  return { priority: "low", bannerText: null };
}

function normalizeBannerText(s: string) {
  return s.trim().replace(/\s+/g, " ").toUpperCase();
}

function gateWindowMs() {
  // 8–12s rule, deterministic for now (no jitter). Can be tuned later.
  return 10_000;
}

function pruneOld(map: Record<string, number>, now: number) {
  const out: Record<string, number> = {};
  const cutoff = now - 60_000;
  for (const k of Object.keys(map)) {
    const t = map[k]!;
    if (t >= cutoff) out[k] = t;
  }
  return out;
}

export function shouldEnqueueBannerMoment(args: {
  gate: MomentGateState;
  text: string;
  priority: MomentPriority;
  now: number;
}): { allow: boolean; normalized: string; nextGate: MomentGateState } {
  const normalized = normalizeBannerText(args.text);
  const windowMs = gateWindowMs();
  const lastShown = args.gate.lastShownByText[normalized] ?? 0;
  const lastEnqueued = args.gate.lastEnqueuedByText[normalized] ?? 0;
  const tooSoon = args.now - Math.max(lastShown, lastEnqueued) < windowMs;

  const allow = !tooSoon;
  const nextGate: MomentGateState = {
    lastShownByText: pruneOld(args.gate.lastShownByText, args.now),
    lastEnqueuedByText: pruneOld(args.gate.lastEnqueuedByText, args.now),
  };
  if (allow) nextGate.lastEnqueuedByText[normalized] = args.now;
  return { allow, normalized, nextGate };
}

export function markBannerMomentShown(args: { gate: MomentGateState; text: string; now: number }): MomentGateState {
  const normalized = normalizeBannerText(args.text);
  const next: MomentGateState = {
    lastShownByText: pruneOld(args.gate.lastShownByText, args.now),
    lastEnqueuedByText: pruneOld(args.gate.lastEnqueuedByText, args.now),
  };
  next.lastShownByText[normalized] = args.now;
  return next;
}

