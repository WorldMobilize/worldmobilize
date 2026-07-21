import { describe, expect, it } from "vitest";
import { transitionDurationMs, transitionStyles } from "@/components/motion/transitions";
import type { TransitionType } from "@/lib/motion/types";

const TYPES: TransitionType[] = ["cut", "fade", "slideLeft", "slideUp", "zoom", "whipLeft", "whipRight"];

describe("transitions", () => {
  it("produces styles for every transition type at all progress points", () => {
    for (const t of TYPES) {
      for (const p of [0, 0.25, 0.5, 0.75, 1]) {
        const s = transitionStyles(t, p);
        expect(s.outgoing).toBeTruthy();
        expect(s.incoming).toBeTruthy();
      }
    }
  });

  it("fade cross-fades opacity", () => {
    expect(transitionStyles("fade", 0).incoming.opacity).toBeCloseTo(0);
    expect(transitionStyles("fade", 1).incoming.opacity).toBeCloseTo(1);
    expect(transitionStyles("fade", 0).outgoing.opacity).toBeCloseTo(1);
    expect(transitionStyles("fade", 1).outgoing.opacity).toBeCloseTo(0);
  });

  it("slideLeft moves incoming from right to zero", () => {
    expect(transitionStyles("slideLeft", 0).incoming.transform).toContain("translateX(100%)");
    expect(transitionStyles("slideLeft", 1).incoming.transform).toContain("translateX(0%)");
  });

  it("cut duration is zero, others positive", () => {
    expect(transitionDurationMs("cut", 0.5)).toBe(0);
    expect(transitionDurationMs("fade", 0.4)).toBe(400);
    expect(transitionDurationMs(undefined, 0.4)).toBe(0);
  });

  it("is deterministic", () => {
    const a = JSON.stringify(transitionStyles("whipLeft", 0.42));
    const b = JSON.stringify(transitionStyles("whipLeft", 0.42));
    expect(a).toBe(b);
  });
});
