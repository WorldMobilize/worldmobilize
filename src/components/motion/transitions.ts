import type { CSSProperties } from "react";
import { applyEasing } from "@/lib/motion/easing";
import type { TransitionType } from "@/lib/motion/types";

export type TransitionStyles = {
  outgoing: CSSProperties;
  incoming: CSSProperties;
};

/**
 * Compute wrapper styles for the outgoing and incoming scenes during a
 * transition. `p` is 0..1 progress through the transition. The same function is
 * used by the live player and the Playwright exporter, guaranteeing parity.
 */
export function transitionStyles(type: TransitionType, p: number): TransitionStyles {
  const base: CSSProperties = { position: "absolute", inset: 0 };
  const eased = applyEasing("easeInOut", p);

  switch (type) {
    case "fade":
      return {
        outgoing: { ...base, opacity: 1 - eased },
        incoming: { ...base, opacity: eased },
      };
    case "slideLeft":
      return {
        outgoing: { ...base, transform: `translateX(${-100 * eased}%)` },
        incoming: { ...base, transform: `translateX(${100 * (1 - eased)}%)` },
      };
    case "slideUp":
      return {
        outgoing: { ...base, transform: `translateY(${-100 * eased}%)` },
        incoming: { ...base, transform: `translateY(${100 * (1 - eased)}%)` },
      };
    case "zoom":
      return {
        outgoing: { ...base, opacity: 1 - eased, transform: `scale(${1 - 0.1 * eased})` },
        incoming: { ...base, opacity: eased, transform: `scale(${1.1 - 0.1 * eased})` },
      };
    case "whipLeft": {
      const blur = 18 * Math.sin(Math.PI * p);
      return {
        outgoing: {
          ...base,
          transform: `translateX(${-100 * eased}%)`,
          filter: `blur(${blur}px)`,
          opacity: 1 - eased * 0.5,
        },
        incoming: {
          ...base,
          transform: `translateX(${100 * (1 - eased)}%)`,
          filter: `blur(${blur}px)`,
          opacity: 0.5 + eased * 0.5,
        },
      };
    }
    case "whipRight": {
      const blur = 18 * Math.sin(Math.PI * p);
      return {
        outgoing: {
          ...base,
          transform: `translateX(${100 * eased}%)`,
          filter: `blur(${blur}px)`,
          opacity: 1 - eased * 0.5,
        },
        incoming: {
          ...base,
          transform: `translateX(${-100 * (1 - eased)}%)`,
          filter: `blur(${blur}px)`,
          opacity: 0.5 + eased * 0.5,
        },
      };
    }
    case "cut":
    default:
      return {
        outgoing: { ...base, opacity: 0 },
        incoming: base,
      };
  }
}

/** Duration (ms) of the transition into a scene from the previous scene's transitionOut. */
export function transitionDurationMs(type: TransitionType | undefined, durationSec: number): number {
  if (!type || type === "cut") return 0;
  return Math.max(0, durationSec * 1000);
}
