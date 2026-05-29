"use client";

import { useMemo } from "react";
import type { Faction } from "@/lib/factionTypes";
import type { Nation, NationWar } from "@/lib/nationMvpTypes";

export function NationLeaderboard(props: {
  factions: Faction[];
  nations: Nation[];
  wars: NationWar[];
  selectedFactionId: string | null;
  onSelectFaction: (id: string) => void;
}) {
  const total = props.nations.length;
  const contested = props.nations.filter((n) => n.status === "contested").length;

  const warsActiveByFaction = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of props.wars) {
      m.set(w.attackerFactionId, (m.get(w.attackerFactionId) ?? 0) + 1);
      if (w.defenderFactionId) m.set(w.defenderFactionId, (m.get(w.defenderFactionId) ?? 0) + 1);
    }
    return m;
  }, [props.wars]);

  const rows = [...props.factions]
    .map((f) => ({
      faction: f,
      nations: props.nations.filter((n) => n.ownerFactionId === f.id).length,
    }))
    .sort((a, b) => b.nations - a.nations);

  return (
    <div className="glass-panel min-w-0 max-w-full rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold tracking-wide text-zinc-100">Leaderboard</div>
        <div className="text-[11px] text-zinc-400">{contested} contested</div>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map(({ faction, nations }, i) => {
          const pct = total > 0 ? (nations / total) * 100 : 0;
          const isTop = i === 0;
          const selected = props.selectedFactionId === faction.id;
          return (
            <button
              key={faction.id}
              type="button"
              onClick={() => props.onSelectFaction(faction.id)}
              className={[
                "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition",
                selected ? "border-cyan-300/30 bg-cyan-400/10" : "",
                isTop
                  ? "border-cyan-300/20 bg-gradient-to-r from-cyan-400/10 to-fuchsia-400/10"
                  : "border-white/5 bg-white/5 hover:bg-white/10",
              ].join(" ")}
            >
              <div className="w-6 text-xs font-semibold text-zinc-400 tabular-nums">{i + 1}</div>
              <div
                className="grid h-7 w-7 shrink-0 place-items-center rounded-xl border border-white/10 text-[10px] font-extrabold text-zinc-950"
                style={{ backgroundColor: faction.color, boxShadow: `0 0 10px ${faction.color}33` }}
              >
                {(faction.logoInitials ?? faction.name.slice(0, 2)).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-zinc-100">
                  {(faction.logoInitials ? `${faction.logoInitials.toUpperCase()} ` : "") + faction.name}
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-400 tabular-nums">
                  {nations} nations · {pct.toFixed(1)}% · {Math.round(faction.supportersActive).toLocaleString()} active
                </div>
              </div>
              <div className="text-right text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                <div>morale {Math.round(faction.morale)}</div>
                <div className="mt-0.5 normal-case text-zinc-400">
                  wars {warsActiveByFaction.get(faction.id) ?? 0}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

