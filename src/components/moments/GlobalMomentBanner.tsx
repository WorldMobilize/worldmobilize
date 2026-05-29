"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LiveMoment, MomentPriority } from "@/lib/liveMoments";

function priorityStyles(p: MomentPriority) {
  if (p === "critical") {
    return {
      frame: "border-red-400/30 bg-gradient-to-b from-red-500/15 via-black/55 to-black/55",
      glow: "shadow-[0_0_70px_rgba(239,68,68,0.25)]",
      label: "CRITICAL",
      labelCls: "border-red-400/30 bg-red-500/10 text-red-100",
    };
  }
  if (p === "high") {
    return {
      frame: "border-orange-400/25 bg-gradient-to-b from-orange-500/12 via-black/55 to-black/55",
      glow: "shadow-[0_0_62px_rgba(249,115,22,0.20)]",
      label: "HIGH",
      labelCls: "border-orange-400/30 bg-orange-500/10 text-orange-100",
    };
  }
  if (p === "medium") {
    return {
      frame: "border-cyan-400/20 bg-gradient-to-b from-cyan-500/10 via-black/55 to-black/55",
      glow: "shadow-[0_0_54px_rgba(34,211,238,0.16)]",
      label: "LIVE",
      labelCls: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
    };
  }
  return {
    frame: "border-white/10 bg-black/55",
    glow: "shadow-[0_0_44px_rgba(0,0,0,0.35)]",
    label: "UPDATE",
    labelCls: "border-white/10 bg-white/5 text-zinc-200",
  };
}

export function GlobalMomentBanner(props: {
  moments: LiveMoment[];
  onExpire: (momentId: string) => void;
  onShow?: (moment: LiveMoment) => void;
}) {
  const [now, setNow] = useState(0);
  const onExpireRef = useRef(props.onExpire);
  const onShowRef = useRef(props.onShow);
  const lastShownIdRef = useRef<string | null>(null);
  const expiredIdsRef = useRef<Set<string>>(new Set());

  onExpireRef.current = props.onExpire;
  onShowRef.current = props.onShow;

  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 120);
    return () => window.clearInterval(t);
  }, []);

  const active = useMemo(() => {
    const sorted = [...props.moments].sort((a, b) => {
      const pr = rank(b.priority) - rank(a.priority);
      if (pr !== 0) return pr;
      return b.ts - a.ts;
    });
    return sorted[0] ?? null;
  }, [props.moments]);

  // Fire onShow exactly once per active moment id (avoids parent setState loop from unstable callbacks).
  useEffect(() => {
    if (!active) {
      lastShownIdRef.current = null;
      return;
    }
    if (lastShownIdRef.current === active.id) return;
    lastShownIdRef.current = active.id;
    onShowRef.current?.(active);
  }, [active?.id, active]);

  // Auto-dismiss timer for the currently displayed moment.
  useEffect(() => {
    if (!active) return;
    const remaining = active.ts + active.ttlMs - Date.now();
    if (remaining <= 0) {
      onExpireRef.current(active.id);
      return;
    }
    const timerId = window.setTimeout(() => onExpireRef.current(active.id), remaining);
    return () => window.clearTimeout(timerId);
  }, [active?.id, active?.ts, active?.ttlMs]);

  // Expire stale moments in the background (once per id).
  useEffect(() => {
    for (const m of props.moments) {
      if (m.ts + m.ttlMs > now) continue;
      if (expiredIdsRef.current.has(m.id)) continue;
      expiredIdsRef.current.add(m.id);
      onExpireRef.current(m.id);
    }
  }, [now, props.moments]);

  if (!active) return null;
  const s = priorityStyles(active.priority);

  return (
    <div className="pointer-events-none fixed left-1/2 top-3 z-[80] w-[min(860px,92vw)] -translate-x-1/2">
      <div
        className={[
          "moment-banner-enter rounded-2xl border px-4 py-3 backdrop-blur-xl",
          s.frame,
          s.glow,
          active.priority === "critical" ? "moment-banner-heavy" : active.priority === "high" ? "moment-banner-urgent" : "",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={["rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest", s.labelCls].join(" ")}>
                {s.label}
              </span>
              <span
                className={[
                  "h-2 w-2 rounded-full",
                  active.priority === "critical" ? "animate-ping bg-red-400" : active.priority === "high" ? "animate-pulse bg-orange-400" : "bg-cyan-300",
                ].join(" ")}
              />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">World moment</span>
            </div>
            <div className="mt-2 truncate text-sm font-extrabold tracking-tight text-zinc-50">{active.text}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function rank(p: MomentPriority) {
  return p === "critical" ? 4 : p === "high" ? 3 : p === "medium" ? 2 : 1;
}
