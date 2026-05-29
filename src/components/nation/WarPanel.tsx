"use client";

import { useEffect, useMemo, useState } from "react";
import type { Faction } from "@/lib/factionTypes";
import type { Nation, NationWar } from "@/lib/nationMvpTypes";
import {
  deriveNationAlert,
  deriveWarPhase,
  getWarActionModifiers,
  isMomentumSurgeActive,
  isReinforcementSurgeActive,
  phaseLabel,
} from "@/lib/warEscalation";
import {
  ATTACKER_ACTIONS,
  DEFENDER_ACTIONS,
  WAR_ACTIONS,
  type WarActionId,
  type WarSide,
} from "@/lib/warParticipation";

function fmtCount(n: number) {
  return Math.round(n).toLocaleString();
}

function fmtTimeLeft(ms: number) {
  if (ms <= 0) return "0:00";
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function fmtCooldown(ms: number) {
  if (ms <= 0) return "Ready";
  return `${Math.ceil(ms / 1000)}s`;
}

export function WarPanel(props: {
  war: NationWar | null;
  attackerNation: Nation | null;
  defenderNation: Nation | null;
  attackerFaction: Faction | null;
  defenderFaction: Faction | null;
  playerSide: WarSide | null;
  actAsFactionId: string | null;
  factions: Faction[];
  onActAsFaction: (factionId: string) => void;
  actionCooldowns: Record<string, number>;
  lastActionFeedback: string | null;
  onWarAction: (warId: string, actionId: WarActionId) => void;
}) {
  const [now, setNow] = useState(0);
  const [momentumFlash, setMomentumFlash] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!props.lastActionFeedback) return;
    setMomentumFlash(true);
    const id = window.setTimeout(() => setMomentumFlash(false), 600);
    return () => window.clearTimeout(id);
  }, [props.lastActionFeedback]);

  const { war, attackerNation, defenderNation, attackerFaction, defenderFaction } = props;
  const effectiveSide = props.playerSide;

  const actionIds = useMemo(() => {
    if (effectiveSide === "attack") return ATTACKER_ACTIONS;
    if (effectiveSide === "defense") return DEFENDER_ACTIONS;
    return [];
  }, [effectiveSide]);

  if (!war || !attackerNation || !defenderNation || !attackerFaction) {
    return (
      <div className="glass-panel min-w-0 max-w-full rounded-2xl p-5">
        <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500">War room</div>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          No active conflict selected. Pick a conflict above or select a contested country.
        </p>
      </div>
    );
  }

  const atkRoom = war.attackerParticipants;
  const defRoom = war.defenderParticipants;
  const totalRoom = atkRoom + defRoom || 1;
  const atkShare = (atkRoom / totalRoom) * 100;
  const timeLeft = war.endsAt - now;
  const capture = Math.max(0, Math.min(100, war.progress));
  const urgent = timeLeft > 0 && timeLeft < 12_000;
  const phase = deriveWarPhase(war, now);
  const reinSurge = isReinforcementSurgeActive(war, now);
  const momSurge = isMomentumSurgeActive(war, now);
  const defAlert = deriveNationAlert(war, defenderNation.id, now);
  const mods =
    effectiveSide && props.playerSide
      ? getWarActionModifiers(war, effectiveSide, now)
      : null;

  const panelIntensity =
    phase === "last_stand" || defAlert === "last_stand"
      ? "border-red-500/35 shadow-[0_0_56px_rgba(239,68,68,0.18)]"
      : phase === "critical"
        ? "border-orange-500/30 shadow-[0_0_48px_rgba(249,115,22,0.16)]"
        : "border-orange-500/20 shadow-[0_0_48px_rgba(249,115,22,0.12)]";

  return (
    <div
      className={[
        "glass-panel min-w-0 max-w-full overflow-hidden rounded-2xl border bg-gradient-to-b from-orange-950/25 via-black/40 to-black/55",
        panelIntensity,
        reinSurge || momSurge ? "war-panel-surge" : "",
      ].join(" ")}
    >
      {/* Header */}
      <div className="border-b border-orange-500/15 bg-orange-500/5 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-orange-200/90">Live war room</span>
              <span className="rounded-md border border-orange-400/25 bg-orange-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange-100">
                {phaseLabel(phase)}
              </span>
            </div>
            {defAlert === "under_attack" ||
            defAlert === "critical_defense" ||
            defAlert === "capital_threatened" ||
            defAlert === "last_stand" ? (
              <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-red-300/90">
                {defenderNation.name} — {defAlert.replace("_", " ")}
              </div>
            ) : null}
            {(reinSurge || momSurge) && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {reinSurge ? (
                  <span className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-cyan-100">
                    Reinforcement surge
                  </span>
                ) : null}
                {momSurge && war.momentumSurgeLabel ? (
                  <span className="rounded-md border border-orange-400/30 bg-orange-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-orange-100">
                    {war.momentumSurgeLabel}
                  </span>
                ) : null}
              </div>
            )}
            <div
              className={[
                "mt-2 text-2xl font-bold tabular-nums tracking-tight",
                urgent ? "text-orange-100" : "text-zinc-50",
              ].join(" ")}
            >
              {timeLeft > 0 ? fmtTimeLeft(timeLeft) : "Resolving"}
            </div>
            <div className="text-[11px] text-zinc-500">{timeLeft > 0 ? "until frontline resolves" : "capture imminent"}</div>
          </div>
          <div className="shrink-0 rounded-xl border border-orange-400/20 bg-black/40 px-3 py-2 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Capture</div>
            <div className="text-lg font-bold tabular-nums text-orange-100">{capture.toFixed(0)}%</div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Attacker vs defender */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="min-w-0 rounded-xl border border-orange-500/25 bg-orange-500/10 px-3 py-2.5">
            <div className="text-[9px] font-bold uppercase tracking-widest text-orange-300/80">Attacker</div>
            <div className="mt-1 truncate text-sm font-bold" style={{ color: attackerFaction.color }}>
              {attackerFaction.name}
            </div>
            <div className="mt-0.5 truncate text-xs font-semibold text-zinc-100">{attackerNation.name}</div>
            <div className="mt-2 text-[11px] tabular-nums text-orange-200/90">{fmtCount(atkRoom)} active</div>
          </div>
          <div className="px-1 text-lg font-light text-zinc-600">vs</div>
          <div className="min-w-0 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5 text-right">
            <div className="text-[9px] font-bold uppercase tracking-widest text-cyan-300/80">Defender</div>
            <div className="mt-1 truncate text-sm font-bold text-zinc-100">{defenderFaction?.name ?? "Neutral"}</div>
            <div className="mt-0.5 truncate text-xs font-semibold text-zinc-200">{defenderNation.name}</div>
            <div className="mt-2 text-[11px] tabular-nums text-cyan-200/90">{fmtCount(defRoom)} active</div>
          </div>
        </div>

        {/* Side / test picker */}
        {!props.playerSide ? (
          <div className="rounded-xl border border-white/10 bg-black/35 px-3 py-2.5">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Preview as faction</label>
            <select
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-2.5 py-2 text-xs text-zinc-100"
              value={props.actAsFactionId ?? ""}
              onChange={(e) => props.onActAsFaction(e.target.value)}
            >
              <option value="">Choose faction…</option>
              {[attackerFaction, defenderFaction].filter(Boolean).map((f) => (
                <option key={f!.id} value={f!.id}>
                  {f!.name} {f!.id === war.attackerFactionId ? "· attacker" : "· defender"}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-center text-xs text-zinc-300">
            You are fighting as{" "}
            <span
              className={[
                "font-bold capitalize",
                effectiveSide === "attack" ? "text-orange-300" : "text-cyan-300",
              ].join(" ")}
            >
              {effectiveSide}
            </span>
          </div>
        )}

        {/* Momentum */}
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-zinc-400">Frontline momentum</span>
            <span className="tabular-nums text-zinc-500">
              Bias {war.actionMomentum >= 0 ? "+" : ""}
              {war.actionMomentum.toFixed(1)}
            </span>
          </div>
          <div
            className={[
              "mt-2 h-3 w-full overflow-hidden rounded-full bg-black/60 ring-1 ring-white/5 transition-shadow duration-300",
              momentumFlash || momSurge ? "shadow-[0_0_20px_rgba(249,115,22,0.5)]" : "",
            ].join(" ")}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-400 transition-[width] duration-500 ease-out"
              style={{ width: `${capture}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-zinc-500">
            <span className="text-orange-300/90">{atkShare.toFixed(0)}% attacker pressure</span>
            <span>{(100 - atkShare).toFixed(0)}% defender</span>
          </div>
        </div>

        {/* Action feedback */}
        {props.lastActionFeedback ? (
          <div className="animate-pulse rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5 text-center text-xs font-semibold text-emerald-100">
            {props.lastActionFeedback}
          </div>
        ) : null}

        {/* Soldier actions */}
        {actionIds.length > 0 ? (
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Soldier orders</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {actionIds.map((aid) => {
                const def = WAR_ACTIONS[aid];
                const cdKey = `${war.id}:${aid}`;
                const cdLeft = Math.max(0, (props.actionCooldowns[cdKey] ?? 0) - now);
                const ready = cdLeft <= 0;
                const isAttack = effectiveSide === "attack";
                return (
                  <button
                    key={aid}
                    type="button"
                    disabled={!ready}
                    onClick={() => props.onWarAction(war.id, aid)}
                    className={[
                      "rounded-xl border px-3 py-3 text-left transition",
                      ready
                        ? isAttack
                          ? "border-orange-400/30 bg-orange-500/15 text-orange-50 hover:bg-orange-500/20"
                          : "border-cyan-400/30 bg-cyan-500/10 text-cyan-50 hover:bg-cyan-500/15"
                        : "cursor-not-allowed border-white/5 bg-black/25 text-zinc-600",
                    ].join(" ")}
                  >
                    <div className="text-xs font-bold">{def.label}</div>
                    <div className="mt-1 text-[10px] font-medium tabular-nums opacity-80">
                      {ready
                        ? mods?.reinforcementSurge && isAttack === false
                          ? "Surge — execute now"
                          : "Execute now"
                        : `Cooldown · ${fmtCooldown(cdLeft)}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : effectiveSide === null && props.actAsFactionId ? (
          <p className="text-center text-xs text-zinc-500">That faction is not in this war.</p>
        ) : (
          <p className="text-center text-xs text-zinc-500">Join a warring faction to issue orders.</p>
        )}

        {/* Recent actions */}
        {war.recentActions.length > 0 ? (
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Recent orders</div>
            <ul className="max-h-[88px] space-y-1.5 overflow-y-auto">
              {war.recentActions.slice(0, 4).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-2.5 py-1.5 text-[11px]"
                >
                  <span
                    className={[
                      "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                      a.side === "attack" ? "bg-orange-500/20 text-orange-200" : "bg-cyan-500/20 text-cyan-200",
                    ].join(" ")}
                  >
                    {a.side === "attack" ? "ATK" : "DEF"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-zinc-300">
                    <span className="font-semibold text-zinc-100">{a.actorLabel}</span>
                    {" · "}
                    {a.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
