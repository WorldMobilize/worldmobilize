import { describe, expect, it } from "vitest";
import { effectiveAnimations, resolveLayerState } from "@/lib/motion/resolveLayerState";
import { MOTION_PRESET_IDS } from "@/lib/motion/presets";
import { countUpText } from "@/components/motion/layers/TextLayerView";
import type { MotionLayer } from "@/lib/motion/types";

function baseLayer(preset?: string): MotionLayer {
  return {
    id: "l",
    name: "l",
    type: "text",
    text: "Hello",
    fontSize: 48,
    fontWeight: 700,
    color: "#fff",
    align: "center",
    startSec: 0,
    durationSec: 3,
    x: 100,
    y: 200,
    width: 400,
    height: 80,
    opacity: 1,
    rotation: 0,
    scale: 1,
    zIndex: 1,
    animations: [],
    animationPreset: preset,
  };
}

describe("preset resolution in player engine", () => {
  it("expands every preset into non-empty animation tracks", () => {
    for (const preset of MOTION_PRESET_IDS) {
      const anims = effectiveAnimations(baseLayer(preset));
      expect(anims.length, `preset ${preset}`).toBeGreaterThan(0);
    }
  });

  it("fadeIn drives opacity from 0 to base", () => {
    const layer = baseLayer("fadeIn");
    expect(resolveLayerState(layer, 0).opacity).toBeCloseTo(0);
    expect(resolveLayerState(layer, 3000).opacity).toBeCloseTo(1);
  });

  it("slideUp settles at base position by the end", () => {
    const layer = baseLayer("slideUp");
    // starts below base y (base.y + 60), ends at base.y
    expect(resolveLayerState(layer, 0).y).toBeGreaterThan(200);
    expect(resolveLayerState(layer, 3000).y).toBeCloseTo(200);
  });

  it("scaleIn grows scale to base", () => {
    const layer = baseLayer("scaleIn");
    expect(resolveLayerState(layer, 0).scale).toBeLessThan(1);
    expect(resolveLayerState(layer, 3000).scale).toBeCloseTo(1);
  });

  it("countUp resolves without throwing and reaches full opacity", () => {
    const layer = baseLayer("countUp");
    expect(resolveLayerState(layer, 3000).opacity).toBeCloseTo(1);
  });
});

describe("countUp text interpolation", () => {
  it("interpolates a plain integer", () => {
    expect(countUpText("764", 0)).toBe("0");
    expect(countUpText("764", 0.5)).toBe("382");
    expect(countUpText("764", 1)).toBe("764");
  });

  it("keeps surrounding text and label", () => {
    expect(countUpText("Copywriting 764", 1)).toBe("Copywriting 764");
    expect(countUpText("Copywriting 764", 0)).toBe("Copywriting 0");
  });

  it("preserves thousands formatting", () => {
    expect(countUpText("1,400+ secrets", 1)).toBe("1,400+ secrets");
    expect(countUpText("1,400+ secrets", 0)).toBe("0+ secrets");
  });

  it("returns text unchanged when no number present", () => {
    expect(countUpText("No digits here", 0.5)).toBe("No digits here");
  });
});
