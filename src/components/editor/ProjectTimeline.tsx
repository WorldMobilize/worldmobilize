"use client";

import { useCallback, useRef } from "react";
import { projectDurationMs, sceneWindows } from "@/lib/motion/timing";
import type { MotionProject } from "@/lib/motion/types";

/**
 * Scrubbable timeline: scene bars sized by duration, layer bars within each
 * scene, a draggable playhead, and click-to-seek. Selecting a scene or layer
 * bubbles up to the editor.
 */
export function ProjectTimeline({
  project,
  currentMs,
  selectedSceneId,
  selectedLayerId,
  onSeek,
  onSelectScene,
  onSelectLayer,
}: {
  project: MotionProject;
  currentMs: number;
  selectedSceneId: string | null;
  selectedLayerId: string | null;
  onSeek: (ms: number) => void;
  onSelectScene: (sceneId: string) => void;
  onSelectLayer: (layerId: string) => void;
}) {
  const durationMs = Math.max(1, projectDurationMs(project));
  const windows = sceneWindows(project);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onSeek(ratio * durationMs);
    },
    [durationMs, onSeek],
  );

  const playheadPct = Math.max(0, Math.min(100, (currentMs / durationMs) * 100));

  return (
    <div className="mt-3 select-none">
      <div
        ref={trackRef}
        className="relative w-full cursor-pointer"
        onPointerDown={(e) => {
          draggingRef.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          seekFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) seekFromClientX(e.clientX);
        }}
        onPointerUp={(e) => {
          draggingRef.current = false;
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        }}
      >
        <div className="space-y-1">
          {windows.map(({ scene, startMs, endMs }) => {
            const leftPct = (startMs / durationMs) * 100;
            const widthPct = ((endMs - startMs) / durationMs) * 100;
            const sceneSelected = scene.id === selectedSceneId;
            return (
              <div key={scene.id} className="relative" style={{ height: 26 }}>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onSelectScene(scene.id)}
                  title={scene.name}
                  className={`absolute top-0 flex h-full items-center overflow-hidden rounded-md border px-2 text-[10px] ${
                    sceneSelected
                      ? "border-blue-400 bg-blue-500/20 text-blue-100"
                      : "border-zinc-700 bg-zinc-800/80 text-zinc-300"
                  }`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  <span className="truncate">{scene.name}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Layer bars for the selected scene */}
        {selectedSceneId
          ? windows
              .filter((w) => w.scene.id === selectedSceneId)
              .map(({ scene, startMs }) => (
                <div key={`layers-${scene.id}`} className="mt-1 space-y-0.5">
                  {[...scene.layers]
                    .sort((a, b) => b.zIndex - a.zIndex)
                    .map((l) => {
                      const lStart = startMs + l.startSec * 1000;
                      const lEnd = lStart + l.durationSec * 1000;
                      const leftPct = (lStart / durationMs) * 100;
                      const widthPct = ((lEnd - lStart) / durationMs) * 100;
                      return (
                        <div key={l.id} className="relative" style={{ height: 14 }}>
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => onSelectLayer(l.id)}
                            title={l.name}
                            className={`absolute top-0 h-full rounded-sm border text-[9px] ${
                              l.id === selectedLayerId
                                ? "border-blue-300 bg-blue-400/30"
                                : "border-zinc-700 bg-zinc-700/50 hover:bg-zinc-600/60"
                            }`}
                            style={{ left: `${leftPct}%`, width: `${Math.max(1, widthPct)}%` }}
                          />
                        </div>
                      );
                    })}
                </div>
              ))
          : null}

        {/* Playhead */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-blue-400"
          style={{ left: `${playheadPct}%` }}
        >
          <div className="absolute -top-1 -left-[5px] h-2.5 w-2.5 rounded-full bg-blue-400" />
        </div>
      </div>

      <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-500">
        <span>{(currentMs / 1000).toFixed(1)}s</span>
        <span>{(durationMs / 1000).toFixed(1)}s</span>
      </div>
    </div>
  );
}
