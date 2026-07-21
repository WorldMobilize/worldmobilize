"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { MotionCanvas } from "@/components/motion/MotionCanvas";
import { projectDurationMs } from "@/lib/motion/timing";
import type { MotionProject, ProjectAsset } from "@/lib/motion/types";

export type MotionPlayerHandle = {
  play: () => void;
  pause: () => void;
  seek: (ms: number) => void;
  getTime: () => number;
};

type Props = {
  project: MotionProject;
  jobId?: string;
  assets?: ProjectAsset[];
  loop?: boolean;
  showControls?: boolean;
  selectable?: boolean;
  selectedLayerId?: string | null;
  onSelectLayer?: (layerId: string) => void;
  onBackgroundClick?: () => void;
  onTimeUpdate?: (ms: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  className?: string;
};

export const MotionPlayer = forwardRef<MotionPlayerHandle, Props>(function MotionPlayer(
  {
    project,
    jobId,
    assets,
    loop = true,
    showControls = true,
    selectable = false,
    selectedLayerId = null,
    onSelectLayer,
    onBackgroundClick,
    onTimeUpdate,
    onPlayingChange,
    className,
  },
  ref,
) {
  const durationMs = Math.max(1, projectDurationMs(project));
  const [currentMs, setCurrentMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [scale, setScale] = useState(1);

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const currentRef = useRef(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const { width, height } = project.format;

  const setTime = useCallback(
    (ms: number) => {
      const clamped = Math.max(0, Math.min(durationMs, ms));
      currentRef.current = clamped;
      setCurrentMs(clamped);
      onTimeUpdate?.(clamped);
    },
    [durationMs, onTimeUpdate],
  );

  const setPlayingState = useCallback(
    (next: boolean) => {
      setPlaying(next);
      onPlayingChange?.(next);
    },
    [onPlayingChange],
  );

  // rAF loop
  useEffect(() => {
    if (!playing) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
      return;
    }
    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const delta = ts - lastTsRef.current;
      lastTsRef.current = ts;
      let next = currentRef.current + delta;
      if (next >= durationMs) {
        if (loop) {
          next = next % durationMs;
        } else {
          next = durationMs;
          currentRef.current = next;
          setCurrentMs(next);
          onTimeUpdate?.(next);
          setPlayingState(false);
          return;
        }
      }
      currentRef.current = next;
      setCurrentMs(next);
      onTimeUpdate?.(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing, durationMs, loop, onTimeUpdate, setPlayingState]);

  // Fit-to-container scaling
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const avail = el.clientWidth;
      if (avail > 0) setScale(avail / width);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  useImperativeHandle(
    ref,
    () => ({
      play: () => setPlayingState(true),
      pause: () => setPlayingState(false),
      seek: (ms: number) => setTime(ms),
      getTime: () => currentRef.current,
    }),
    [setPlayingState, setTime],
  );

  const togglePlay = () => {
    if (playing) setPlayingState(false);
    else {
      if (currentRef.current >= durationMs) setTime(0);
      setPlayingState(true);
    }
  };

  return (
    <div className={className}>
      <div ref={wrapRef} style={{ width: "100%" }}>
        <div
          style={{
            width: "100%",
            height: height * scale,
            position: "relative",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <MotionCanvas
              project={project}
              currentTimeMs={currentMs}
              jobId={jobId}
              assets={assets}
              selectable={selectable}
              selectedLayerId={selectedLayerId}
              onSelectLayer={onSelectLayer}
              onBackgroundClick={onBackgroundClick}
            />
          </div>
        </div>
      </div>

      {showControls ? (
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-500"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <input
            type="range"
            min={0}
            max={durationMs}
            step={16}
            value={currentMs}
            onChange={(e) => setTime(Number(e.target.value))}
            className="flex-1 accent-blue-500"
          />
          <span className="w-24 text-right font-mono text-xs text-zinc-400">
            {fmt(currentMs)} / {fmt(durationMs)}
          </span>
        </div>
      ) : null}
    </div>
  );
});

function fmt(ms: number): string {
  const s = ms / 1000;
  return `${s.toFixed(1)}s`;
}
