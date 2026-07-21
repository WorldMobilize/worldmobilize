import { describe, expect, it } from "vitest";
import { applyEasing, clamp01, EASING_FUNCTIONS } from "@/lib/motion/easing";
import { resolveAnimatedValue } from "@/lib/motion/interpolate";
import type { AnimationTrack } from "@/lib/motion/types";

function track(kfs: [number, number, AnimationTrack["keyframes"][number]["easing"]][]): AnimationTrack {
  return {
    property: "x",
    keyframes: kfs.map(([time, value, easing]) => ({ time, value, easing })),
  };
}

describe("easing", () => {
  it("linear is identity", () => {
    expect(EASING_FUNCTIONS.linear(0.5)).toBe(0.5);
  });

  it("boundaries return 0 and 1 for all easings", () => {
    for (const key of Object.keys(EASING_FUNCTIONS) as (keyof typeof EASING_FUNCTIONS)[]) {
      expect(EASING_FUNCTIONS[key](0)).toBeCloseTo(0);
      expect(EASING_FUNCTIONS[key](1)).toBeCloseTo(1);
    }
  });

  it("easeIn is slower at start than linear", () => {
    expect(EASING_FUNCTIONS.easeIn(0.25)).toBeLessThan(0.25);
  });

  it("easeOut is faster at start than linear", () => {
    expect(EASING_FUNCTIONS.easeOut(0.25)).toBeGreaterThan(0.25);
  });

  it("clamp01 clamps out-of-range", () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(5)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
  });

  it("applyEasing defaults to linear when undefined", () => {
    expect(applyEasing(undefined, 0.4)).toBeCloseTo(0.4);
  });
});

describe("resolveAnimatedValue", () => {
  it("returns base value when no track", () => {
    expect(resolveAnimatedValue({ baseValue: 42, track: undefined, localTimeMs: 100 })).toBe(42);
  });

  it("returns base value when track has no keyframes", () => {
    const t: AnimationTrack = { property: "x", keyframes: [] };
    expect(resolveAnimatedValue({ baseValue: 7, track: t, localTimeMs: 100 })).toBe(7);
  });

  it("single keyframe returns its value at any time", () => {
    const t = track([[0.5, 99, "linear"]]);
    expect(resolveAnimatedValue({ baseValue: 0, track: t, localTimeMs: 0 })).toBe(99);
    expect(resolveAnimatedValue({ baseValue: 0, track: t, localTimeMs: 5000 })).toBe(99);
  });

  it("returns first keyframe value before the first keyframe", () => {
    const t = track([[1, 10, "linear"], [2, 20, "linear"]]);
    expect(resolveAnimatedValue({ baseValue: 0, track: t, localTimeMs: 0 })).toBe(10);
  });

  it("returns last keyframe value after the last keyframe", () => {
    const t = track([[0, 0, "linear"], [1, 100, "linear"]]);
    expect(resolveAnimatedValue({ baseValue: 0, track: t, localTimeMs: 5000 })).toBe(100);
  });

  it("interpolates linearly between keyframes", () => {
    const t = track([[0, 0, "linear"], [1, 100, "linear"]]);
    expect(resolveAnimatedValue({ baseValue: 0, track: t, localTimeMs: 500 })).toBeCloseTo(50);
  });

  it("applies destination-segment easing", () => {
    const t = track([[0, 0, "easeIn"], [1, 100, "easeIn"]]);
    // easeIn(0.5) = 0.25 -> 25
    expect(resolveAnimatedValue({ baseValue: 0, track: t, localTimeMs: 500 })).toBeCloseTo(25);
  });

  it("handles negative times as before-first", () => {
    const t = track([[0, 5, "linear"], [1, 100, "linear"]]);
    expect(resolveAnimatedValue({ baseValue: 0, track: t, localTimeMs: -500 })).toBe(5);
  });

  it("equal-time keyframes jump to the later value", () => {
    const t = track([[0, 0, "linear"], [1, 50, "linear"], [1, 80, "linear"]]);
    // exactly at t=1 returns last matching value (the 80) since it's the final kf
    expect(resolveAnimatedValue({ baseValue: 0, track: t, localTimeMs: 1000 })).toBe(80);
  });

  it("is deterministic across repeated calls", () => {
    const t = track([[0, 0, "easeInOut"], [2, 200, "easeInOut"]]);
    const a = resolveAnimatedValue({ baseValue: 0, track: t, localTimeMs: 1234 });
    const b = resolveAnimatedValue({ baseValue: 0, track: t, localTimeMs: 1234 });
    expect(a).toBe(b);
  });

  it("interpolates across three keyframes correctly", () => {
    const t = track([[0, 0, "linear"], [1, 100, "linear"], [2, 0, "linear"]]);
    expect(resolveAnimatedValue({ baseValue: 0, track: t, localTimeMs: 1500 })).toBeCloseTo(50);
  });
});
