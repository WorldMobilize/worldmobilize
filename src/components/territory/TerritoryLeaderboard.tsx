"use client";

import type { Faction } from "@/lib/factionTypes";
import type { Territory } from "@/lib/territoryGameplayTypes";

function fmt(n: number) {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

export function TerritoryLeaderboard(props: {
  factions: Faction[];
  territories: Territory[];
  selectedFactionId: string | null;
  onSelectFaction: (id: string) => void;
}) {
  const total = props.territories.length;
  const contested = props.territories.filter((t) => t.status === "contested").length;

  const rows = [...props.factions]
    .map((f) => ({
      faction: f,
      zones: props.territories.filter((t) => t.ownerFactionId === f.id).length,
    }))
    .sort((a, b) => b.zones - a.zones);

  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold tracking-wide text-zinc-100">Leaderboard</div>
        <div className="text-[11px] text-zinc-400">{contested} contested</div>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map(({ faction, zones }, i) => {
          const pct = total > 0 ? (zones / total) * 100 : 0;
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
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: faction.color, boxShadow: `0 0 8px ${faction.color}55` }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate text-sm font-semibold text-zinc-100">
                    {(faction.logoInitials ? `${faction.logoInitials.toUpperCase()} ` : "")}{faction.name}
                  </div>
                  {isTop ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold">
                      #1
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-400 tabular-nums">
                  {zones} territories · {pct.toFixed(1)}% · {fmt(faction.supportersActive)}/{fmt(faction.supportersTotal)} active
                </div>
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                morale {Math.round(faction.morale)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
