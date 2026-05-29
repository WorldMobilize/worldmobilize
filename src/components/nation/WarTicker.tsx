"use client";

import { useEffect, useState } from "react";
import type { Faction } from "@/lib/factionTypes";
import type { Nation, NationWar } from "@/lib/nationMvpTypes";
import { deriveNationAlert, deriveWarPhase, nationAlertVisual, phaseLabel } from "@/lib/warEscalation";

function fmtTimeLeft(ms: number) {
  if (ms <= 0) return "0:00";
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export function WarTicker(props: {
  wars: NationWar[];
  nations: Nation[];
  factions: Faction[];
  onSelectWar: (warId: string) => void;
  selectedWarId: string | null;
}) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const nationById = new Map(props.nations.map((n) => [n.id, n]));
  const factionById = new Map(props.factions.map((f) => [f.id, f]));

  if (props.wars.length === 0) {
    return (
      <div className="glass-panel min-w-0 max-w-full rounded-2xl px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Active conflicts</div>
        <div className="mt-1 text-sm text-zinc-400">No active conflicts.</div>
        <div className="mt-1 text-[11px] text-zinc-500">Claim a nation, rally your faction, and start the next war.</div>
      </div>
    );
  }

  return (
    <div className="glass-panel min-w-0 max-w-full rounded-2xl px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-200/80">Active conflicts</div>
        <div className="text-[11px] text-zinc-400 tabular-nums">{props.wars.length} live</div>
      </div>
      <div className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
        {props.wars.map((w) => {
          const atkN = nationById.get(w.attackerNationId);
          const defN = nationById.get(w.targetNationId);
          const atkF = factionById.get(w.attackerFactionId);
          const selected = props.selectedWarId === w.id;
          const phase = deriveWarPhase(w, now);
          const defAlert = nationAlertVisual(
            deriveNationAlert(w, w.targetNationId, now),
            defN?.name ?? "Defender",
          );
          const hot = phase === "critical" || phase === "last_stand";

          return (
            <button
              key={w.id}
              type="button"
              onClick={() => props.onSelectWar(w.id)}
              className={[
                "shrink-0 rounded-xl border px-3 py-2 text-left transition",
                selected
                  ? "border-orange-400/40 bg-orange-400/10"
                  : hot
                    ? "border-orange-500/35 bg-orange-500/10 hover:bg-orange-500/15"
                    : "border-white/10 bg-white/5 hover:bg-white/10",
              ].join(" ")}
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-100">
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    hot ? "animate-pulse bg-red-400" : "animate-pulse bg-orange-400",
                  ].join(" ")}
                />
                <span style={{ color: atkF?.color }}>{atkF?.name ?? "Unknown"}</span>
                <span className="text-zinc-500">vs</span>
                <span>{defN?.name ?? "?"}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-semibold uppercase text-zinc-300">
                  {phaseLabel(phase)}
                </span>
                <span className="text-zinc-400 tabular-nums">
                  {w.progress.toFixed(0)}% · {fmtTimeLeft(w.endsAt - now)}
                </span>
              </div>
              {defAlert.banner ? (
                <div className="mt-1.5 text-[9px] font-bold uppercase tracking-wide text-orange-200/90">
                  {defAlert.banner}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
