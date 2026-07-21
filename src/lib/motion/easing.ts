import type { Easing } from "@/lib/motion/types";

export type EasingFn = (t: number) => number;

/**
 * Easing functions operating on a normalized progress value t in [0, 1].
 * Each returns an eased progress in [0, 1].
 */
export const EASING_FUNCTIONS: Record<Easing, EasingFn> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

export function clamp01(t: number): number {
  if (Number.isNaN(t)) return 0;
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

/** Apply a named easing to a normalized progress value. Defaults to linear. */
export function applyEasing(easing: Easing | undefined, t: number): number {
  const fn = easing ? EASING_FUNCTIONS[easing] : EASING_FUNCTIONS.linear;
  return (fn ?? EASING_FUNCTIONS.linear)(clamp01(t));
}
