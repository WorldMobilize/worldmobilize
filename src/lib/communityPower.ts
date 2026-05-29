export const INFLUENCE_BASE_RADIUS_PX = 14;
export const INFLUENCE_MULTIPLIER_PX = 1.25;
export const INFLUENCE_MAX_RADIUS_PX = 52;

export function computeInfluenceRadiusPx(activeSupporters: number) {
  const a = Math.max(0, activeSupporters);
  const r = INFLUENCE_BASE_RADIUS_PX + Math.sqrt(a) * INFLUENCE_MULTIPLIER_PX;
  return Math.max(10, Math.min(INFLUENCE_MAX_RADIUS_PX, r));
}

/** 0..1 visual identity strength based on active supporters (diminishing returns). */
export function computeIdentityStrength(activeSupporters: number) {
  const a = Math.max(0, activeSupporters);
  // Normalize against a "very large" active community. log keeps it subtle.
  const max = Math.log1p(40_000);
  return Math.max(0, Math.min(1, Math.log1p(a) / max));
}

export function clampEngagementRate(x: number) {
  if (!Number.isFinite(x)) return 0.35;
  return Math.max(0.05, Math.min(0.95, x));
}

/** Prototype: how many active supporters are plausibly committed to a battle side. */
export function committedActiveForWar(activeSupporters: number, engagementRate: number) {
  const a = Math.max(0, activeSupporters);
  const e = clampEngagementRate(engagementRate);
  // Diminishing returns and a soft cap so wars don't instantly max out.
  const committed = Math.sqrt(a) * (18 + 34 * e);
  return Math.max(80, Math.min(18_000, committed));
}

