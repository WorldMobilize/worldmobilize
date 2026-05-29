"use client";

import type { Faction } from "@/lib/factionTypes";
import type { Territory, TerritoryWar } from "@/lib/territoryGameplayTypes";

export function TerritorySidebar(props: {
  territory: Territory | null;
  owner: Faction | null;
  war: TerritoryWar | null;
  neighbors: Array<{ territory: Territory; owner: Faction | null }>;
  canFoundFaction: boolean;
  onFoundFaction: () => void;
  onAttack: (targetTerritoryId: string) => void;
  onDefend: () => void;
  onSupportAttack: () => void;
  onSupportDefense: () => void;
  onReinforce: () => void;
  onRallySupporters: (amount: number) => void;
}) {
  const { territory, owner, war } = props;

  if (!territory) {
    return (
      <div className="glass-panel rounded-2xl p-4">
        <div className="text-sm font-semibold text-zinc-100">Territory intel</div>
        <p className="mt-2 text-sm text-zinc-400">Click a territory on the globe.</p>
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
          Found a faction by claiming one starter territory as your capital. Expansion happens through wars.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Territory</div>
      <div className="mt-1 text-base font-semibold text-zinc-50">{territory.name}</div>
      <div className="text-[11px] text-zinc-400">
        {territory.countryName} · {territory.continent}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
        <div>Morale: {Math.round(territory.morale)}</div>
        <div>Defense: {Math.round(territory.defense)}</div>
        <div>Presence: {Math.round(territory.supporterPresence)}</div>
        <div>Status: {territory.status}</div>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Owner</div>
        {owner ? (
          <div className="mt-1 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: owner.color }} />
            <div className="text-sm font-semibold text-zinc-100">
              {owner.logoInitials ? `${owner.logoInitials.toUpperCase()} ` : ""}{owner.name}
            </div>
          </div>
        ) : (
          <div className="mt-1 text-sm text-zinc-300">Neutral</div>
        )}
        {owner ? (
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
            <div>
              Active: <span className="font-semibold text-zinc-200">{Math.round(owner.supportersActive).toLocaleString()}</span>
            </div>
            <div>
              Total: <span className="font-semibold text-zinc-200">{Math.round(owner.supportersTotal).toLocaleString()}</span>
            </div>
            <div>Engage: {Math.round(owner.engagementRate * 100)}%</div>
            <div>Identity: {Math.round((Math.log1p(Math.max(0, owner.supportersActive)) / Math.log1p(40_000)) * 100)}%</div>
          </div>
        ) : null}
      </div>

      {props.canFoundFaction ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={props.onFoundFaction}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-400/90 to-fuchsia-400/90 px-3 py-2 text-xs font-semibold text-black"
          >
            Found faction (set capital)
          </button>
          <p className="mt-2 text-[11px] text-zinc-500">
            Money does not buy power. Your capital is your entry — wars decide the map.
          </p>
        </div>
      ) : null}

      {war ? (
        <div className="mt-4 rounded-xl border border-orange-400/20 bg-orange-400/5 px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-orange-200/90">War</div>
          <div className="mt-1 text-sm text-zinc-100">Territory is contested</div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-300/90 to-red-400/90"
              style={{ width: `${Math.max(0, Math.min(100, war.progress)).toFixed(1)}%` }}
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
            <div>Attack active: {Math.round(war.attack.active)}</div>
            <div>Defense active: {Math.round(war.defense.active)}</div>
            <div>Atk momentum: {Math.round(war.attack.momentum)}</div>
            <div>Def momentum: {Math.round(war.defense.momentum)}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={props.onSupportAttack}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10"
            >
              Support attack
            </button>
            <button
              type="button"
              onClick={props.onSupportDefense}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10"
            >
              Support defense
            </button>
            <button
              type="button"
              onClick={props.onReinforce}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10"
            >
              Reinforce
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          {owner ? (
            <div className="mb-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Community power</div>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                Each supporter adds pressure to the map. Territory grows cell by cell.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => props.onRallySupporters(100)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/5"
                >
                  +100 supporters
                </button>
                <button
                  type="button"
                  onClick={() => props.onRallySupporters(1_000)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/5"
                >
                  +1,000 supporters
                </button>
                <button
                  type="button"
                  onClick={() => props.onRallySupporters(10_000)}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/5"
                >
                  +10,000 supporters
                </button>
              </div>
            </div>
          ) : null}
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Neighbors</div>
          <div className="mt-2 space-y-2">
            {props.neighbors.slice(0, 8).map((n) => {
              const hostile = owner && n.owner && n.owner.id !== owner.id;
              return (
                <div
                  key={n.territory.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-100">{n.territory.name}</div>
                    <div className="text-[11px] text-zinc-400">
                      {n.owner ? `${n.owner.logoInitials ? `${n.owner.logoInitials.toUpperCase()} ` : ""}${n.owner.name}` : "Neutral"}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!owner || (!!n.owner && !hostile && n.owner.id === owner.id)}
                    onClick={() => props.onAttack(n.territory.id)}
                    className="shrink-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/5 disabled:opacity-40"
                  >
                    Attack
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
