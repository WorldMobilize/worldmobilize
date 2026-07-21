"use client";

import { MotionSceneRenderer } from "@/components/motion/MotionSceneRenderer";
import { transitionDurationMs, transitionStyles } from "@/components/motion/transitions";
import { sceneWindows } from "@/lib/motion/timing";
import type { MotionProject, ProjectAsset } from "@/lib/motion/types";

/** Families that are actually loaded and can end a stack. */
const FONT_FALLBACKS = ["Inter", "system-ui", "sans-serif"];

/**
 * Build a CSS font stack that *ends* in something we ship.
 *
 * The Director picks brand fonts freely, and it picks families we never load —
 * "Inter Tight" was the one that surfaced this. Assigning that name alone left
 * the browser with a family it could not resolve and no fallback after it, so
 * headless Chromium dropped to its default serif and every video came out
 * looking like Times New Roman. The brand font goes first, but it can only ever
 * be the first entry, never the whole stack.
 */
function fontStack(brandFamily: string | undefined): string {
  const family = brandFamily?.trim();
  if (!family) return FONT_FALLBACKS.join(", ");
  // Multi-word families need quoting to survive as a single stack entry.
  const head = /[^a-zA-Z0-9-]/.test(family) && !/^["']/.test(family) ? `"${family}"` : family;
  return [head, ...FONT_FALLBACKS.filter((f) => f !== family)].join(", ");
}

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
        fontFamily: fontStack(project.brand.fontFamily),
      }}
      onClick={selectable && onBackgroundClick ? () => onBackgroundClick() : undefined}
    >
      {content}
    </div>
  );
}
