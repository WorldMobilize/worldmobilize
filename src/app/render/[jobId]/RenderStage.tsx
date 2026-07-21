"use client";

import { useEffect, useState } from "react";
import { MotionCanvas } from "@/components/motion/MotionCanvas";
import type { MotionProject, ProjectAsset } from "@/lib/motion/types";

/**
 * Headless render surface driven externally by Playwright.
 *
 * Exposes:
 *  - window.__motionSeek(ms): set the current frame time
 *  - window.__motionReady: true once mounted
 *  - window.__motionDuration: total duration in ms
 * Renders the MotionCanvas at native resolution at (0,0) with no chrome, so a
 * clipped screenshot is pixel-identical to the in-editor player.
 */
declare global {
  interface Window {
    __motionSeek?: (ms: number) => void;
    __motionReady?: boolean;
    __motionDuration?: number;
  }
}

export function RenderStage({
  project,
  assets,
  initialMs = 0,
}: {
  project: MotionProject;
  assets: ProjectAsset[];
  initialMs?: number;
}) {
  const [ms, setMs] = useState(initialMs);

  useEffect(() => {
    window.__motionSeek = (next: number) => setMs(next);
    window.__motionReady = true;
    return () => {
      window.__motionReady = false;
      delete window.__motionSeek;
    };
  }, []);

  const { width, height } = project.format;

  return (
    <div
      data-render-root
      style={{ position: "fixed", top: 0, left: 0, width, height, background: "#000" }}
    >
      <MotionCanvas project={project} currentTimeMs={ms} jobId={project.id} assets={assets} />
    </div>
  );
}
