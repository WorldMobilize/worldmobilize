"use client";

import { useEffect, useState } from "react";
import type { TerritoryEvent } from "@/lib/territoryTypes";

function timeAgo(now: number, ts: number) {
  if (now <= 0 || ts <= 0) return "—";
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 5) return "now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m`;
}

export function TerritoryActivityFeed(props: { events: TerritoryEvent[] }) {
  const items = props.events.slice(0, 12);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="glass-panel min-w-0 max-w-full rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold tracking-wide text-zinc-100">World news</div>
        <div className="text-[11px] text-zinc-400">Live</div>
      </div>
      <div className="mt-3 max-h-[220px] space-y-2 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-sm text-zinc-400">No major events yet.</div>
        ) : (
          items.map((e) => {
            const warish =
              /war|invad|captur|declar|defend|conflict|mobiliz|approved|rejected/i.test(e.text);
            return (
              <div
                key={e.id}
                className={[
                  "flex items-start gap-3 rounded-xl border px-3 py-2",
                  warish ? "border-orange-400/15 bg-orange-400/5" : "border-white/5 bg-white/5",
                ].join(" ")}
              >
                <div className="mt-0.5 w-10 text-[11px] text-zinc-400 tabular-nums">{timeAgo(now, e.ts)}</div>
                <div className={["min-w-0 flex-1 break-words text-sm", warish ? "font-medium text-orange-50" : "text-zinc-100"].join(" ")}>
                  {e.text}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
