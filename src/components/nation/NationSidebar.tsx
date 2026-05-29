"use client";

import type { Faction } from "@/lib/factionTypes";
import type { Nation, NationWar } from "@/lib/nationMvpTypes";
import { deriveNationAlert } from "@/lib/warEscalation";

function pct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function NationSidebar(props: {
  nation: Nation | null;
  owner: Faction | null;
  war: NationWar | null;
  neighbors: Array<{ nation: Nation; owner: Faction | null }>;
  canFoundFaction: boolean;
  canProposeWar: boolean;
  onFoundFaction: () => void;
  onSupport: (amount: number) => void;
  onProposeWar: (targetNationId: string) => void;
  onDefend: () => void;
  onClearSelection?: () => void;
}) {
  const { nation, owner, war } = props;

  if (!nation) {
    return (
      <div className="glass-panel min-w-0 max-w-full rounded-2xl p-4">
        <div className="text-sm font-semibold text-zinc-100">Nation intel</div>
        <p className="mt-2 text-sm text-zinc-400">Select a country to inspect territory, support capacity, and command options.</p>
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
          Claim a nation, build support to its cap, then declare war on neighbors to expand your influence.
        </p>
      </div>
    );
  }

  const supportPct = nation.audienceCap > 0 ? (nation.currentSupport / nation.audienceCap) * 100 : 0;
  const isCapped = nation.currentSupport >= nation.audienceCap;
  const alert = war ? deriveNationAlert(war, nation.id, Date.now()) : "stable";

  return (
    <div className="glass-panel min-w-0 max-w-full rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Nation</div>
          <div className="mt-1 text-base font-semibold text-zinc-50">{nation.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
            <span>Status: {nation.status}</span>
            {alert !== "stable" ? (
              <span className="rounded-full border border-orange-400/25 bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-100">
                {alert.replaceAll("_", " ")}
              </span>
            ) : null}
          </div>
        </div>
        {props.onClearSelection ? (
          <button
            type="button"
            onClick={props.onClearSelection}
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 hover:bg-white/10"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Support</div>
          <div className="text-[11px] font-semibold text-zinc-200 tabular-nums">
            {Math.round(nation.currentSupport).toLocaleString()} / {Math.round(nation.audienceCap).toLocaleString()}
          </div>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300/90 to-fuchsia-400/90"
            style={{ width: `${pct(supportPct).toFixed(1)}%` }}
          />
        </div>
        <div className="mt-2 text-[11px] text-zinc-500">{isCapped ? "Cap reached — war unlocked" : "Fill the cap to unlock war"}</div>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Owner</div>
        {owner ? (
          <div className="mt-1 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: owner.color }} />
            <div className="text-sm font-semibold text-zinc-100">
              {owner.name}
            </div>
          </div>
        ) : (
          <div className="mt-1 text-sm text-zinc-300">Neutral</div>
        )}
      </div>

      {props.canFoundFaction ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={props.onFoundFaction}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-400/90 to-fuchsia-400/90 px-3 py-2 text-xs font-semibold text-black"
          >
            Claim nation (set capital)
          </button>
          <p className="mt-2 text-[11px] text-zinc-500">You can only claim one capital. Expansion happens via wars.</p>
        </div>
      ) : null}

      {war ? (
        <div className="mt-4 rounded-xl border border-orange-400/20 bg-orange-400/5 px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-200/90">War</div>
          <div className="mt-1 text-sm text-zinc-100">Nation is contested</div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-300/90 to-red-400/90"
              style={{ width: `${pct(war.progress).toFixed(1)}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={props.onDefend}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10"
            >
              Defend
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          {owner ? (
            <div className="mb-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Test support</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => props.onSupport(100)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/5"
                >
                  +100 supporters
                </button>
                <button
                  type="button"
                  onClick={() => props.onSupport(1_000)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/5"
                >
                  +1,000 supporters
                </button>
                <button
                  type="button"
                  onClick={() => props.onSupport(10_000)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/5"
                >
                  +10,000 supporters
                </button>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Neighbors</div>
            <div className="mt-2 space-y-2">
              {props.neighbors.length === 0 ? (
                <div className="text-[11px] text-zinc-500">No playable neighbors configured.</div>
              ) : (
                props.neighbors.map(({ nation: nn, owner: no }) => {
                  const canAttack = props.canProposeWar && !war;
                  return (
                    <div key={nn.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-zinc-100">{nn.name}</div>
                        <div className="mt-0.5 text-[11px] text-zinc-500">
                          {no ? `Owned by ${no.name}` : "Neutral"}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!props.canProposeWar}
                        onClick={() => props.onProposeWar(nn.id)}
                        className="rounded-xl border border-orange-400/20 bg-orange-400/5 px-3 py-2 text-xs font-semibold text-orange-50 hover:bg-orange-400/10 disabled:opacity-40"
                      >
                        Propose invasion
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

