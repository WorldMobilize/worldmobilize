import { describe, expect, it } from "vitest";
import { activeSceneAt, isLayerVisible, layerLocalTimeMs, projectDurationMs, sceneWindows } from "@/lib/motion/timing";
import type { MotionLayer, MotionProject, MotionScene } from "@/lib/motion/types";

function scene(id: string, durationSec: number, enabled = true): MotionScene {
  return {
    id,
    name: id,
    purpose: "",
    startSec: 0,
    durationSec,
    enabled,
    background: { type: "solid", color: "#000" },
    layers: [],
  };
}

function project(scenes: MotionScene[]): MotionProject {
  return {
    version: 1,
    id: "p",
    title: "p",
    format: { width: 1920, height: 1080, fps: 30, aspectRatio: "16:9" },
    durationSec: scenes.reduce((a, s) => a + s.durationSec, 0),
    brand: {
      primaryColor: "#111",
      secondaryColor: "#222",
      backgroundColor: "#000",
      foregroundColor: "#fff",
      accentColor: "#3b82f6",
      fontFamily: "Inter",
      style: "premium-saas",
      cornerRadius: 12,
    },
    scenes,
    audio: {},
  };
}

describe("timing", () => {
  it("computes project duration from enabled scenes", () => {
    const p = project([scene("a", 3), scene("b", 4), scene("c", 2, false)]);
    expect(projectDurationMs(p)).toBe(7000);
  });

  it("builds sequential scene windows", () => {
    const p = project([scene("a", 3), scene("b", 4)]);
    const w = sceneWindows(p);
    expect(w[0]).toMatchObject({ startMs: 0, endMs: 3000 });
    expect(w[1]).toMatchObject({ startMs: 3000, endMs: 7000 });
  });

  it("resolves active scene at a time", () => {
    const p = project([scene("a", 3), scene("b", 4)]);
    expect(activeSceneAt(p, 0)?.scene.id).toBe("a");
    expect(activeSceneAt(p, 2999)?.scene.id).toBe("a");
    expect(activeSceneAt(p, 3000)?.scene.id).toBe("b");
    expect(activeSceneAt(p, 6999)?.scene.id).toBe("b");
  });

  it("clamps beyond end to last scene", () => {
    const p = project([scene("a", 3), scene("b", 4)]);
    expect(activeSceneAt(p, 999999)?.scene.id).toBe("b");
  });

  it("computes scene-local time", () => {
    const p = project([scene("a", 3), scene("b", 4)]);
    expect(activeSceneAt(p, 3500)?.sceneLocalMs).toBe(500);
  });

  it("skips disabled scenes in windows", () => {
    const p = project([scene("a", 3, false), scene("b", 4)]);
    expect(activeSceneAt(p, 0)?.scene.id).toBe("b");
  });

  it("layer visibility respects start/duration", () => {
    const layer: MotionLayer = {
      id: "l",
      name: "l",
      type: "shape",
      shape: "rectangle",
      startSec: 1,
      durationSec: 2,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      opacity: 1,
      rotation: 0,
      scale: 1,
      zIndex: 1,
      animations: [],
    };
    expect(isLayerVisible(layer, 500)).toBe(false);
    expect(isLayerVisible(layer, 1500)).toBe(true);
    expect(isLayerVisible(layer, 3500)).toBe(false);
    expect(layerLocalTimeMs(layer, 1500)).toBe(500);
  });
});
