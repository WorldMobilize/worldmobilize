import { describe, expect, it } from "vitest";
import { createDtcpillFixture } from "@/lib/fixtures/dtcpill";
import {
  activeSceneAt,
  isLayerVisible,
  projectDurationMs,
  sceneWindows,
} from "@/lib/motion/timing";
import { resolveLayerState } from "@/lib/motion/resolveLayerState";
import { resolveCamera } from "@/lib/motion/camera";
import type { ComponentLayer, MotionLayer } from "@/lib/motion/types";

const JOB = "job_dtcpill_test";

function allLayers(project: ReturnType<typeof createDtcpillFixture>): MotionLayer[] {
  return project.scenes.flatMap((s) => s.layers);
}

describe("DTCPill acceptance fixture", () => {
  const project = createDtcpillFixture({ jobId: JOB });

  it("has the expected structure", () => {
    expect(project.id).toBe(JOB);
    expect(project.version).toBe(1);
    expect(project.scenes).toHaveLength(6);
    expect(project.format.fps).toBe(30);
    for (const scene of project.scenes) {
      expect(scene.name.length).toBeGreaterThan(0);
      expect(scene.durationSec).toBeGreaterThan(0);
      expect(scene.layers.length).toBeGreaterThan(0);
    }
  });

  it("exercises every component type", () => {
    const components = new Set(
      allLayers(project)
        .filter((l): l is ComponentLayer => l.type === "component")
        .map((l) => l.component),
    );
    for (const id of [
      "ParticleField",
      "MetricCard",
      "BookCoverStream",
      "BrandChip",
      "ChatDemo",
      "LogoLockup",
    ]) {
      expect(components.has(id)).toBe(true);
    }
    // ParticleField is atmosphere only; the hero pill is its own PillHero layer
    // (3D pill, not a flat PNG and not nested inside the particles).
    const particles = allLayers(project).find(
      (l) => l.type === "component" && l.component === "ParticleField",
    ) as ComponentLayer | undefined;
    expect(particles?.props.showCapsule).toBe(false);
    expect(components.has("PillHero")).toBe(true);
  });

  it("uses the full transition set and at least one camera", () => {
    const transitions = new Set(
      project.scenes.map((s) => s.transitionOut?.type).filter(Boolean),
    );
    for (const t of ["whipLeft", "whipRight", "slideLeft", "zoom", "fade", "cut"]) {
      expect(transitions.has(t as never)).toBe(true);
    }
    expect(project.scenes.some((s) => s.camera && s.camera.animations.length > 0)).toBe(true);
  });

  it("reports a duration matching the sum of scene windows", () => {
    const windows = sceneWindows(project);
    expect(windows).toHaveLength(6);
    const totalMs = projectDurationMs(project);
    expect(windows[windows.length - 1]!.endMs).toBe(totalMs);
    // ~18s at 30fps.
    expect(Math.round(totalMs / 1000)).toBe(18);
  });

  it("resolves finite layer + camera state across a full frame sweep", () => {
    const totalMs = projectDurationMs(project);
    const step = 1000 / project.format.fps;
    let visibleSamples = 0;

    for (let ms = 0; ms < totalMs; ms += step) {
      const active = activeSceneAt(project, ms);
      expect(active).not.toBeNull();
      const { scene, sceneLocalMs } = active!;

      const cam = resolveCamera(scene.camera, sceneLocalMs);
      for (const v of [cam.x, cam.y, cam.scale, cam.rotation]) {
        expect(Number.isFinite(v)).toBe(true);
      }

      for (const layer of scene.layers) {
        const state = resolveLayerState(layer, sceneLocalMs);
        for (const v of [state.x, state.y, state.scale, state.rotation, state.opacity, state.blur]) {
          expect(Number.isFinite(v)).toBe(true);
        }
        if (isLayerVisible(layer, sceneLocalMs)) visibleSamples++;
      }
    }

    // The composition is never empty — something is on screen throughout.
    expect(visibleSamples).toBeGreaterThan(0);
  });

  it("shows the hook headline early and the end-card lockup last", () => {
    const first = activeSceneAt(project, 1000)!;
    expect(first.scene.id).toBe("scene_01");
    const hook = first.scene.layers.find((l) => l.id === "hook_text");
    expect(hook && isLayerVisible(hook, first.sceneLocalMs)).toBe(true);

    const totalMs = projectDurationMs(project);
    const end = activeSceneAt(project, totalMs - 500)!;
    expect(end.scene.id).toBe("scene_06");
    const lockup = end.scene.layers.find((l) => l.type === "component") as
      | ComponentLayer
      | undefined;
    expect(lockup?.component).toBe("LogoLockup");
  });
});
