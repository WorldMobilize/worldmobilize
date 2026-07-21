"use client";

import { MotionSceneRenderer } from "@/components/motion/MotionSceneRenderer";
import { transitionDurationMs, transitionStyles } from "@/components/motion/transitions";
import { sceneWindows } from "@/lib/motion/timing";
import type { MotionProject, ProjectAsset } from "@/lib/motion/types";

/**
 * Renders a MotionProject at its native resolution for a single point in time.
 * This is the exact DOM that the Playwright exporter screenshots, guaranteeing
 * preview/export parity — including scene transitions.
 */
export function MotionCanvas({
  project,
  currentTimeMs,
  jobId,
  assets,
  selectable = false,
  selectedLayerId = null,
  onSelectLayer,
  onBackgroundClick,
}: {
  project: MotionProject;
  currentTimeMs: number;
  jobId?: string;
  assets?: ProjectAsset[];
  selectable?: boolean;
  selectedLayerId?: string | null;
  onSelectLayer?: (layerId: string) => void;
  onBackgroundClick?: () => void;
}) {
  const { width, height } = project.format;
  const windows = sceneWindows(project);

  const clamped = Math.max(0, currentTimeMs);
  let activeIdx = windows.findIndex((w) => clamped >= w.startMs && clamped < w.endMs);
  if (activeIdx < 0) activeIdx = windows.length - 1;
  const active = windows[activeIdx];

  const shared = { jobId, assets, brand: project.brand } as const;

  let content: React.ReactNode = null;

  if (active) {
    const sceneLocalMs = clamped - active.startMs;
    const prev = windows[activeIdx - 1];
    const transType = prev?.scene.transitionOut?.type;
    const transDur = transitionDurationMs(transType, prev?.scene.transitionOut?.durationSec ?? 0);

    if (prev && transType && transDur > 0 && sceneLocalMs < transDur) {
      // Transition zone: blend outgoing (prev, frozen at its end) + incoming.
      const p = sceneLocalMs / transDur;
      const styles = transitionStyles(transType, p);
      content = (
        <>
          <div style={styles.outgoing}>
            <MotionSceneRenderer
              scene={prev.scene}
              sceneLocalMs={prev.endMs - prev.startMs}
              {...shared}
            />
          </div>
          <div style={styles.incoming}>
            <MotionSceneRenderer
              scene={active.scene}
              sceneLocalMs={sceneLocalMs}
              {...shared}
              selectable={selectable}
              selectedLayerId={selectedLayerId}
              onSelectLayer={onSelectLayer}
            />
          </div>
        </>
      );
    } else {
      content = (
        <MotionSceneRenderer
          scene={active.scene}
          sceneLocalMs={sceneLocalMs}
          {...shared}
          selectable={selectable}
          selectedLayerId={selectedLayerId}
          onSelectLayer={onSelectLayer}
        />
      );
    }
  }

  return (
    <div
      data-motion-canvas
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        background: project.brand.backgroundColor ?? "#0b1220",
        fontFamily: project.brand.fontFamily ?? "Inter, system-ui, sans-serif",
      }}
      onClick={selectable && onBackgroundClick ? () => onBackgroundClick() : undefined}
    >
      {content}
    </div>
  );
}
