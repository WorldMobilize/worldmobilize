"use client";

import type { FactionMember } from "@/lib/factionRoles";
import { canAppointGenerals, canVoteOnWar } from "@/lib/factionRoles";
import type { WarProposal } from "@/lib/nationMvpTypes";
import type { Nation } from "@/lib/nationMvpTypes";

export function FactionRolesPanel(props: {
  members: FactionMember[];
  playerMemberId: string | null;
  pendingProposals: WarProposal[];
  nationById: Map<string, Nation>;
  onVote: (proposalId: string, vote: "yes" | "no") => void;
  onPromote: (memberId: string) => void;
  onDemote: (memberId: string) => void;
  onSwitchPlayer?: (memberId: string) => void;
}) {
  const player = props.members.find((m) => m.id === props.playerMemberId) ?? null;
  const generals = props.members.filter((m) => m.role === "general");
  const soldiers = props.members.filter((m) => m.role === "soldier");

  return (
    <div className="glass-panel min-w-0 max-w-full rounded-2xl p-4">
      <div className="text-sm font-semibold text-zinc-100">Command</div>
      {player ? (
        <div className="mt-1 text-[11px] text-zinc-400">
          You: <span className="font-semibold capitalize text-zinc-200">{player.displayName}</span> ·{" "}
          <span className="capitalize text-cyan-200/90">{player.role}</span>
        </div>
      ) : (
        <div className="mt-1 text-[11px] text-zinc-500">Found a faction to take command.</div>
      )}

      {props.onSwitchPlayer && props.members.length > 1 ? (
        <div className="mt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Local test: act as</div>
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] text-zinc-200"
            value={props.playerMemberId ?? ""}
            onChange={(e) => props.onSwitchPlayer?.(e.target.value)}
          >
            {props.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName} ({m.role})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {props.pendingProposals.length > 0 ? (
        <div className="mt-4 space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">War council vote</div>
          {props.pendingProposals.map((p) => {
            const target = props.nationById.get(p.targetNationId);
            const attacker = props.nationById.get(p.attackerNationId);
            const yes = p.votes.filter((v) => v.vote === "yes").length;
            const no = p.votes.filter((v) => v.vote === "no").length;
            const playerVoted = player ? p.votes.some((v) => v.memberId === player.id) : false;
            return (
              <div key={p.id} className="rounded-xl border border-orange-400/20 bg-orange-400/5 px-3 py-3">
                <div className="text-sm font-semibold text-zinc-100">
                  Invade {target?.name ?? "?"}
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-400">From {attacker?.name ?? "?"}</div>
                <div className="mt-2 flex gap-4 text-[11px] tabular-nums">
                  <span className="text-emerald-300/90">YES: {yes}</span>
                  <span className="text-red-300/90">NO: {no}</span>
                </div>
                {player && canVoteOnWar(player.role) && !playerVoted ? (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => props.onVote(p.id, "yes")}
                      className="flex-1 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2 py-1.5 text-xs font-semibold text-emerald-100"
                    >
                      Vote YES
                    </button>
                    <button
                      type="button"
                      onClick={() => props.onVote(p.id, "no")}
                      className="flex-1 rounded-lg border border-red-400/25 bg-red-400/10 px-2 py-1.5 text-xs font-semibold text-red-100"
                    >
                      Vote NO
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {player && canAppointGenerals(player.role) ? (
        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Generals ({generals.length})</div>
          <div className="mt-2 space-y-1">
            {generals.map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-2 py-1.5 text-[11px]">
                <span className="text-zinc-200">{g.displayName}</span>
                {g.id !== props.playerMemberId ? (
                  <button type="button" onClick={() => props.onDemote(g.id)} className="text-zinc-500 hover:text-zinc-300">
                    Demote
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {soldiers.length > 0 ? (
            <>
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Promote soldier</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {soldiers.slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => props.onPromote(s.id)}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-zinc-200 hover:bg-white/10"
                  >
                    {s.displayName}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
