"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CreateFactionModal } from "@/components/territory/CreateFactionModal";
import { TerritoryActivityFeed } from "@/components/territory/TerritoryActivityFeed";
import { TerritoryMap } from "@/components/territory/TerritoryMap";
import { NationLeaderboard } from "@/components/nation/NationLeaderboard";
import { NationSidebar } from "@/components/nation/NationSidebar";
import { WarPanel } from "@/components/nation/WarPanel";
import { WarTicker } from "@/components/nation/WarTicker";
import { FactionRolesPanel } from "@/components/nation/FactionRolesPanel";
import type { TerritoryEvent } from "@/lib/territoryTypes";
import type { SelectedCountry } from "@/lib/territoryZones";
import { toSelectedCountry } from "@/lib/territoryZones";
import type { Faction } from "@/lib/factionTypes";
import type { FactionMember } from "@/lib/factionRoles";
import { seedFactionRoster } from "@/lib/factionRoles";
import type { Nation, NationWar, WarProposal } from "@/lib/nationMvpTypes";
import { COUNTRY_BY_ID, countryName } from "@/lib/worldMapData";
import {
  ATTACKER_ACTIONS,
  DEFENDER_ACTIONS,
  WAR_ACTIONS,
  applyWarActionToWar,
  computeWarProgressTick,
  createWarWithParticipation,
  getPlayerWarSide,
  type WarActionId,
} from "@/lib/warParticipation";
import { buildNationAlertMap, effectiveCooldownMs, getWarActionModifiers, tickWarEscalation } from "@/lib/warEscalation";
import {
  cinematicApproved,
  cinematicCapture,
  cinematicDefend,
  cinematicDemoAction,
  cinematicFounderClaim,
  cinematicProposal,
  cinematicRejected,
  cinematicSupportCap,
  cinematicWarDeclared,
} from "@/lib/warEventFeed";
import { applyPlayerWarAction, normalizeWarState, runWarEscalationTick } from "@/lib/warRuntime";
import type { NationAlertVisual } from "@/lib/warEscalation";
import {
  classifyMoment,
  createInitialMomentGateState,
  createMoment,
  markBannerMomentShown,
  shouldEnqueueBannerMoment,
  type LiveMoment,
  type MomentGateState,
} from "@/lib/liveMoments";
import { GlobalMomentBanner } from "@/components/moments/GlobalMomentBanner";
import { createInitialNations } from "@/lib/nationMvpData";

function pick<T>(arr: T[], i: number) {
  return arr[Math.max(0, Math.min(arr.length - 1, i))]!;
}

export default function Home() {
  const [events, setEvents] = useState<TerritoryEvent[]>([
    { id: "boot", ts: 0, text: "Select a country to inspect territory and command options." },
    { id: "boot-2", ts: 0, text: "Claim a nation and start the first global conflict." },
  ]);
  const [selectedCountry, setSelectedCountry] = useState<SelectedCountry | null>(null);
  const [foundOpen, setFoundOpen] = useState(false);

  const [nations, setNations] = useState<Nation[]>(() => createInitialNations());
  const [factions, setFactions] = useState<Faction[]>([]);
  const [wars, setWars] = useState<NationWar[]>([]);
  const [warProposals, setWarProposals] = useState<WarProposal[]>([]);
  const [members, setMembers] = useState<FactionMember[]>([]);
  const [playerMemberId, setPlayerMemberId] = useState<string | null>(null);
  const [selectedFactionId, setSelectedFactionId] = useState<string | null>(null);
  const [selectedWarId, setSelectedWarId] = useState<string | null>(null);
  const [actionCooldowns, setActionCooldowns] = useState<Record<string, number>>({});
  const [lastActionFeedback, setLastActionFeedback] = useState<string | null>(null);
  const [actAsFactionId, setActAsFactionId] = useState<string | null>(null);
  const [screenPulseUntil, setScreenPulseUntil] = useState(0);
  const [escalationClock, setEscalationClock] = useState(0);
  const [moments, setMoments] = useState<LiveMoment[]>([]);
  const [momentGate, setMomentGate] = useState<MomentGateState>(() => createInitialMomentGateState());

  const handleMomentExpire = useCallback((id: string) => {
    setMoments((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleMomentShow = useCallback((m: LiveMoment) => {
    setMomentGate((g) => markBannerMomentShown({ gate: g, text: m.text, now: Date.now() }));
  }, []);

  // Product mode: simulation is always running locally (no visible dev controls).
  const simRunning = true;
  const simSpeed: 1 | 5 | 20 | 50 = 5;
  const demoMode: "none" | "nation" | "world" = "none";

  const uiEventSeqRef = useRef(0);
  const nextUiEventId = () => {
    uiEventSeqRef.current += 1;
    return `e-${uiEventSeqRef.current}`;
  };

  const pushEvent = (text: string) => {
    const now = Date.now();
    setEvents((prev) => [{ id: nextUiEventId(), ts: now, text }, ...prev].slice(0, 80));

    const m = classifyMoment(text);
    if (!m.bannerText) return;

    const bannerText = m.bannerText;
    setMomentGate((gate) => {
      const g = shouldEnqueueBannerMoment({
        gate,
        text: bannerText,
        priority: m.priority,
        now,
      });
      if (g.allow) {
        const next = createMoment(g.normalized, m.priority);
        setMoments((prev) => {
          // If multiple moments happen close together, keep only highest-priority recent ones.
          const merged = [next, ...prev]
            .sort((a, b) => {
              const pr = rank(b.priority) - rank(a.priority);
              if (pr !== 0) return pr;
              return b.ts - a.ts;
            })
            .slice(0, 6);
          return merged;
        });
      }
      return g.nextGate;
    });
  };

  const selectedNation = useMemo(() => {
    if (!selectedCountry?.id) return null;
    return nations.find((n) => n.id === selectedCountry.id) ?? null;
  }, [nations, selectedCountry]);

  const selectedOwner = useMemo(() => {
    if (!selectedNation?.ownerFactionId) return null;
    return factions.find((f) => f.id === selectedNation.ownerFactionId) ?? null;
  }, [factions, selectedNation]);

  const nationById = useMemo(() => new Map(nations.map((n) => [n.id, n])), [nations]);
  const nationNameById = useMemo(() => new Map(nations.map((n) => [n.id, n.name])), [nations]);

  useEffect(() => {
    const t = setInterval(() => setEscalationClock(Date.now()), 400);
    return () => clearInterval(t);
  }, []);

  const nationAlerts = useMemo((): Map<string, NationAlertVisual> => {
    void escalationClock;
    return buildNationAlertMap(wars, nationNameById, Date.now());
  }, [wars, nationNameById, escalationClock]);

  const screenPulse = screenPulseUntil > Date.now();

  const worldIntensity = useMemo(() => {
    // 0..1 based on how many wars and how hot they are
    const now = Date.now();
    const hot = wars.filter((w) => {
      const phase = w.escalation?.phase;
      const defAlert = w.escalation?.defenderAlert;
      return phase === "critical" || phase === "last_stand" || defAlert === "last_stand" || defAlert === "capital_threatened";
    }).length;
    const base = Math.min(1, wars.length / 4);
    const heat = Math.min(1, hot / 2);
    const pulse = screenPulse ? 0.18 : 0;
    void now;
    return Math.max(base * 0.55 + heat * 0.55 + pulse, 0);
  }, [wars, screenPulse]);

  const focusedWar = useMemo(() => {
    if (selectedWarId) return wars.find((w) => w.id === selectedWarId) ?? null;
    if (!selectedNation) return wars[0] ?? null;
    return (
      wars.find((w) => w.targetNationId === selectedNation.id || w.attackerNationId === selectedNation.id) ?? wars[0] ?? null
    );
  }, [wars, selectedNation, selectedWarId]);

  const focusedWarNations = useMemo(() => {
    if (!focusedWar) return { attacker: null, defender: null };
    return {
      attacker: nationById.get(focusedWar.attackerNationId) ?? null,
      defender: nationById.get(focusedWar.targetNationId) ?? null,
    };
  }, [focusedWar, nationById]);

  const focusedWarFactions = useMemo(() => {
    if (!focusedWar) return { attacker: null, defender: null };
    return {
      attacker: factions.find((f) => f.id === focusedWar.attackerFactionId) ?? null,
      defender: focusedWar.defenderFactionId ? factions.find((f) => f.id === focusedWar.defenderFactionId) ?? null : null,
    };
  }, [focusedWar, factions]);

  const playerMember = useMemo(
    () => members.find((m) => m.id === playerMemberId) ?? null,
    [members, playerMemberId],
  );

  const playerFactionId = playerMember?.factionId ?? selectedFactionId;
  const effectiveFactionId = actAsFactionId || playerFactionId;

  const playerWarSide = useMemo(() => {
    if (!focusedWar) return null;
    return getPlayerWarSide(focusedWar, effectiveFactionId);
  }, [focusedWar, effectiveFactionId]);

  const pendingProposalsForPlayer = useMemo(() => {
    if (!playerFactionId) return [];
    return warProposals.filter((p) => p.factionId === playerFactionId && p.status === "pending");
  }, [warProposals, playerFactionId]);

  const selectedWar = useMemo(() => {
    if (!selectedNation) return null;
    return wars.find((w) => w.targetNationId === selectedNation.id || w.attackerNationId === selectedNation.id) ?? null;
  }, [wars, selectedNation]);

  const neighbors = useMemo(() => {
    if (!selectedNation) return [];
    return selectedNation.neighbors
      .map((id) => nationById.get(id))
      .filter((n): n is Nation => !!n)
      .map((n) => ({ nation: n, owner: n.ownerFactionId ? factions.find((f) => f.id === n.ownerFactionId) ?? null : null }));
  }, [selectedNation, nationById, factions]);

  const canFoundFaction = !!selectedNation && !selectedNation.ownerFactionId;
  const canProposeWar =
    !!selectedNation &&
    !!selectedNation.ownerFactionId &&
    selectedNation.currentSupport >= selectedNation.audienceCap &&
    playerMember?.role === "founder" &&
    selectedNation.ownerFactionId === playerMember.factionId;

  const foundFaction = (args: { territoryId: string; name: string; color: string; logoUrl?: string; logoInitials?: string }) => {
    const capNation = nations.find((n) => n.id === args.territoryId) ?? null;
    if (!capNation || capNation.ownerFactionId) return;

    const id = `f-${Math.random().toString(16).slice(2, 10)}`;
    const f: Faction = {
      id,
      name: args.name,
      color: args.color,
      logoUrl: args.logoUrl,
      logoInitials: args.logoInitials,
      aggression: 0.58,
      capitalTerritoryId: capNation.id,
      supportersTotal: 0,
      supportersActive: 0,
      engagementRate: 0.14,
      morale: 72,
      influence: 0,
      engagement: 55,
    };

    const roster = seedFactionRoster(id, args.name);
    setFactions((prev) => [...prev, f]);
    setMembers((prev) => [...prev, ...roster]);
    setPlayerMemberId(roster[0]!.id);
    setSelectedFactionId(id);
    setNations((prev) =>
      prev.map((n) =>
        n.id === capNation.id
          ? {
              ...n,
              ownerFactionId: id,
              status: "owned",
              currentSupport: Math.max(n.currentSupport, Math.min(n.audienceCap, 50)),
            }
          : n,
      ),
    );
    pushEvent(cinematicFounderClaim(capNation.name, args.name));
  };

  const addSupport = (amount: number) => {
    if (!selectedNation?.ownerFactionId) return;
    const fid = selectedNation.ownerFactionId;

    setNations((prev) =>
      prev.map((n) => {
        if (n.id !== selectedNation.id) return n;
        const next = Math.min(n.audienceCap, n.currentSupport + amount);
        return { ...n, currentSupport: next };
      }),
    );

    setFactions((prev) =>
      prev.map((f) => {
        if (f.id !== fid) return f;
        const total = f.supportersTotal + amount;
        const active = Math.min(total, Math.max(f.supportersActive, total * f.engagementRate));
        return { ...f, supportersTotal: total, supportersActive: active };
      }),
    );

    const after = Math.min(selectedNation.audienceCap, selectedNation.currentSupport + amount);
    if (after >= selectedNation.audienceCap) pushEvent(cinematicSupportCap(selectedNation.name));
  };

  const executeWar = (attackerNationId: string, targetNationId: string, attackerFactionId: string) => {
    if (wars.some((w) => w.targetNationId === targetNationId)) return;
    const attackerNation = nationById.get(attackerNationId);
    const target = nationById.get(targetNationId);
    if (!attackerNation || !target) return;
    if (!attackerNation.neighbors.includes(targetNationId)) return;

    const defenderFactionId = target.ownerFactionId;
    const id = `w-${Math.random().toString(16).slice(2, 10)}`;
    const startedAt = Date.now();
    const endsAt = startedAt + (defenderFactionId ? 24_000 : 10_000);
    const attackerF = factions.find((f) => f.id === attackerFactionId);
    const defenderF = defenderFactionId ? factions.find((f) => f.id === defenderFactionId) ?? null : null;

    const w = createWarWithParticipation({
      id,
      attackerFactionId,
      defenderFactionId,
      attackerNationId,
      targetNationId,
      startedAt,
      endsAt,
      attackerActive: attackerF?.supportersActive ?? 0,
      defenderActive: defenderF?.supportersActive ?? 800,
    });

    setWars((prev) => [...prev, w]);
    setSelectedWarId(id);
    setNations((prev) => prev.map((n) => (n.id === targetNationId ? { ...n, status: "contested" } : n)));

    const attackerName = factions.find((f) => f.id === attackerFactionId)?.name ?? "Unknown faction";
    const defenderName = defenderFactionId
      ? factions.find((f) => f.id === defenderFactionId)?.name ?? target.name
      : target.name;
    pushEvent(cinematicWarDeclared(attackerNation.name, target.name));
  };

  const proposeWar = (targetNationId: string) => {
    if (!selectedNation?.ownerFactionId || !playerMemberId) return;
    if (playerMember?.role !== "founder") return;
    if (selectedNation.currentSupport < selectedNation.audienceCap) return;
    if (!selectedNation.neighbors.includes(targetNationId)) return;
    if (warProposals.some((p) => p.status === "pending" && p.targetNationId === targetNationId)) return;

    const target = nationById.get(targetNationId);
    if (!target) return;

    const proposal: WarProposal = {
      id: `p-${Math.random().toString(16).slice(2, 10)}`,
      factionId: selectedNation.ownerFactionId,
      attackerNationId: selectedNation.id,
      targetNationId,
      proposedByMemberId: playerMemberId,
      status: "pending",
      votes: [],
      createdAt: Date.now(),
    };
    setWarProposals((prev) => [...prev, proposal]);
    pushEvent(cinematicProposal(target.name));
  };

  const applyProposalResolutions = (list: WarProposal[]): WarProposal[] => {
    const approved: WarProposal[] = [];
    const next = list.map((p) => {
      if (p.status !== "pending") return p;
      const yes = p.votes.filter((v) => v.vote === "yes").length;
      const no = p.votes.filter((v) => v.vote === "no").length;
      if (yes > no) {
        approved.push(p);
        return { ...p, status: "approved" as const };
      }
      if (no > yes && no > 0) {
        const target = nationById.get(p.targetNationId);
        pushEvent(cinematicRejected(target?.name ?? "target"));
        return { ...p, status: "rejected" as const };
      }
      return p;
    });
    for (const p of approved) {
      const target = nationById.get(p.targetNationId);
      executeWar(p.attackerNationId, p.targetNationId, p.factionId);
      pushEvent(cinematicApproved(target?.name ?? "target"));
    }
    return next;
  };

  const voteOnProposal = (proposalId: string, vote: "yes" | "no") => {
    if (!playerMember || playerMember.role !== "general") return;
    setWarProposals((prev) => {
      const voted = prev.map((p) => {
        if (p.id !== proposalId || p.status !== "pending") return p;
        if (p.votes.some((v) => v.memberId === playerMember.id)) return p;
        return { ...p, votes: [...p.votes, { memberId: playerMember.id, vote }] };
      });
      return applyProposalResolutions(voted);
    });
  };

  const autoVoteDemoProposals = () => {
    if (demoMode === "none") return;
    setWarProposals((prev) => {
      const withVotes = prev.map((p) => {
        if (p.status !== "pending") return p;
        const gens = members.filter((m) => m.factionId === p.factionId && m.role === "general");
        const votes = [...p.votes];
        for (const g of gens) {
          if (!votes.some((v) => v.memberId === g.id)) votes.push({ memberId: g.id, vote: "yes" });
        }
        return { ...p, votes };
      });
      return applyProposalResolutions(withVotes);
    });
  };

  const promoteToGeneral = (memberId: string) => {
    if (playerMember?.role !== "founder") return;
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId && m.factionId === playerMember.factionId ? { ...m, role: "general" } : m)),
    );
  };

  const demoteGeneral = (memberId: string) => {
    if (playerMember?.role !== "founder") return;
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId && m.role === "general" ? { ...m, role: "soldier" } : m)),
    );
  };

  const performWarAction = (warId: string, actionId: WarActionId, skipCooldown = false) => {
    const war = wars.find((w) => w.id === warId);
    if (!war) return;
    const side = getPlayerWarSide(war, effectiveFactionId);
    const action = WAR_ACTIONS[actionId];
    if (!side || action.side !== side) return;

    const cdKey = `${warId}:${actionId}`;
    const now = Date.now();
    const nw = normalizeWarState(war);
    if (!skipCooldown && (actionCooldowns[cdKey] ?? 0) > now) return;

    const atkNation = nationById.get(war.attackerNationId);
    const defNation = nationById.get(war.targetNationId);
    const atkF = factions.find((f) => f.id === war.attackerFactionId);

    const result = applyPlayerWarAction({
      war: nw,
      actionId,
      side,
      actorLabel: playerMember?.displayName ?? atkF?.name ?? "Soldier",
      attackerNationName: atkNation?.name ?? "Attackers",
      defenderNationName: defNation?.name ?? "target",
      attackerFactionName: side === "attack" ? atkF?.name : undefined,
      now,
    });

    const esc = tickWarEscalation(result.war, now, {
      attacker: atkNation?.name ?? "Attackers",
      defender: defNation?.name ?? "target",
    });

    setWars((prev) => prev.map((w) => (w.id === warId ? esc.war : w)));
    if (!skipCooldown) {
      const cdMs = effectiveCooldownMs(action, nw, side, now);
      setActionCooldowns((prev) => ({ ...prev, [cdKey]: now + cdMs }));
    }

    pushEvent(result.feedLine);
    for (const line of esc.feedEvents) pushEvent(line);
    if (result.screenPulse || esc.screenPulse) setScreenPulseUntil(now + 650);
    setLastActionFeedback(result.feedback);
    window.setTimeout(() => setLastActionFeedback(null), 3500);
  };

  const applyDemoWarActions = (input: NationWar[]): NationWar[] => {
    if (demoMode === "none") return input;
    const ts = Date.now();
    return input.map((w) => {
      if (Math.random() > 0.22) return w;
      const canDefend = !!w.defenderFactionId;
      const side = canDefend && Math.random() > 0.48 ? "defense" : "attack";
      const pool = side === "attack" ? ATTACKER_ACTIONS : DEFENDER_ACTIONS;
      const aid = pool[Math.floor(Math.random() * pool.length)]!;
      const atkN = nationById.get(w.attackerNationId);
      const defN = nationById.get(w.targetNationId);
      const actor = side === "attack" ? atkN?.name ?? "Attackers" : defN?.name ?? "Defenders";
      const action = WAR_ACTIONS[aid];
      const mods = getWarActionModifiers(normalizeWarState(w), side, ts);
      const { war: nextWar } = applyWarActionToWar(normalizeWarState(w), action, actor, defN?.name ?? "target", ts, mods);
      const line = cinematicDemoAction(side, side === "attack" ? atkN?.name ?? "Attackers" : defN?.name ?? "Defenders");
      if (line) pushEvent(line);
      return nextWar;
    });
  };

  // Dev-only geography validation: ensure each playable nation id maps to the intended country name.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const mismatches: string[] = [];
    for (const n of nations) {
      const f = COUNTRY_BY_ID.get(n.id);
      if (!f) {
        mismatches.push(`${n.name}: missing feature for id ${n.id}`);
        continue;
      }
      const actual = countryName(f);
      if (actual !== n.name) mismatches.push(`${n.name}: id ${n.id} resolves to ${actual}`);
    }
    if (mismatches.length > 0) {
      // eslint-disable-next-line no-console
      console.warn("[geo-validate] playable nation mismatches", mismatches);
      pushEvent("Geography warning: some playable nations mismatch map data (see console)");
    }
  }, [nations]);

  const simTickOnce = () => {
    autoVoteDemoProposals();

    // 1) advance wars
    const factionById = new Map(factions.map((f) => [f.id, f]));
    const now = Date.now();

    const warsAfterActions = applyDemoWarActions(wars);

    const captures: NationWar[] = [];
    const nextWars: NationWar[] = warsAfterActions
      .map((w) => {
        const nw = normalizeWarState(w);
        const attacker = factionById.get(nw.attackerFactionId) ?? null;
        const defender = nw.defenderFactionId ? factionById.get(nw.defenderFactionId) ?? null : null;
        const atk = attacker ? Math.max(0, attacker.supportersActive) : 0;
        const def = defender ? Math.max(0, defender.supportersActive) : 0;
        const ticked = computeWarProgressTick(nw, atk, def, 0.25);
        const done = ticked.progress >= 100 || now >= ticked.endsAt;
        if (done) captures.push({ ...ticked, progress: Math.min(100, ticked.progress) });
        return done ? null : ticked;
      })
      .filter((x): x is NationWar => !!x);

    const escalated = runWarEscalationTick(nextWars, nationNameById, now);
    for (const line of escalated.feedEvents) pushEvent(line);
    if (escalated.screenPulse) setScreenPulseUntil(now + 650);
    const warsEscalated = escalated.wars;

    if (captures.length > 0) {
      const capIds = new Set(captures.map((c) => c.targetNationId));
      setNations((prev) =>
        prev.map((n) => {
          const cap = captures.find((c) => c.targetNationId === n.id);
          if (!cap) return n;
          return {
            ...n,
            ownerFactionId: cap.attackerFactionId,
            status: "owned",
            currentSupport: Math.min(n.audienceCap, Math.max(n.currentSupport, Math.round(n.audienceCap * 0.25))),
          };
        }),
      );
      for (const w of captures) {
        const targetName = nationById.get(w.targetNationId)?.name ?? "Unknown";
        const attackerName = factions.find((f) => f.id === w.attackerFactionId)?.name ?? "Unknown faction";
        pushEvent(cinematicCapture(attackerName, targetName));
      }
      // clear contested on nations no longer at war
      setNations((prev) =>
        prev.map((n) => (capIds.has(n.id) ? { ...n, status: "owned" } : n.status === "contested" ? n : n)),
      );
    }

    setWars(warsEscalated);

    // 2) drip support into owned nations (demo feel)
    setNations((prev) =>
      prev.map((n) => {
        if (!n.ownerFactionId) return n;
        const inc = Math.max(15, Math.round(n.audienceCap * 0.02));
        const next = Math.min(n.audienceCap, n.currentSupport + inc);
        return { ...n, currentSupport: next };
      }),
    );

    // 3) auto declare wars for capped owned nations (demo modes)
    if (demoMode === "none") return;
    const byIdNow = new Map(nations.map((n) => [n.id, n]));
    for (const n of nations) {
      if (!n.ownerFactionId) continue;
      if (n.currentSupport < n.audienceCap) continue;
      if (wars.some((w) => w.attackerNationId === n.id)) continue;
      const targets = n.neighbors.map((id) => byIdNow.get(id)).filter(Boolean) as Nation[];
      const neutral = targets.find((x) => !x.ownerFactionId) ?? null;
      const enemy = targets.find((x) => x.ownerFactionId && x.ownerFactionId !== n.ownerFactionId) ?? null;
      const pickTarget = neutral ?? enemy;
      if (pickTarget && n.ownerFactionId) executeWar(n.id, pickTarget.id, n.ownerFactionId);
    }
  };

  // Simulation runner (start/pause + speed)
  useEffect(() => {
    if (!simRunning) return;
    const t = window.setInterval(() => {
      for (let i = 0; i < simSpeed; i++) simTickOnce();
    }, 250);
    return () => window.clearInterval(t);
  }, [simRunning, simSpeed, demoMode, wars, nations, factions]); // ok for MVP

  // (Demo seeders removed from UI for productization.)

  const clearCountrySelection = () => {
    setSelectedCountry(null);
    setSelectedWarId(null);
  };

  const resetMvp = () => {
    // Reset back to a clean neutral alpha baseline (no seeded wars).
    setWars([]);
    setWarProposals([]);
    setMembers([]);
    setPlayerMemberId(null);
    setActionCooldowns({});
    setLastActionFeedback(null);
    setActAsFactionId(null);
    setFactions([]);
    setNations(createInitialNations());
    setSelectedCountry(null);
    setSelectedFactionId(null);
    setSelectedWarId(null);
    setMoments([]);
    setMomentGate(createInitialMomentGateState());
    setEvents([
      { id: "boot", ts: 0, text: "Select a country to inspect territory and command options." },
      { id: "boot-2", ts: 0, text: "The world is waiting for its first war." },
    ]);
  };

  return (
    <div className="arena-backdrop flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-hidden text-zinc-100">
      {/* World intensity overlay (tasteful, cinematic) */}
      {worldIntensity > 0.01 ? (
        <div
          className="world-intensity-overlay"
          style={{
            // keep subtle; intensity increases during critical/multi-war moments
            ["--war-hot" as any]: String(Math.min(0.22, 0.06 + worldIntensity * 0.18)),
            ["--war-cyan" as any]: String(Math.min(0.18, 0.05 + worldIntensity * 0.14)),
          }}
          aria-hidden
        />
      ) : null}

      <GlobalMomentBanner moments={moments} onExpire={handleMomentExpire} onShow={handleMomentShow} />

      <header className="shrink-0 border-b border-white/5 px-4 py-4 lg:px-6">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold tracking-tight">BrandArena</div>
            <div className="mt-0.5 text-sm font-semibold text-zinc-100">Claim a nation, rally your faction, and start the next war.</div>
            <div className="mt-0.5 text-[11px] text-zinc-400">Community conflict, built for spectators.</div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/twitch"
              className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-50 backdrop-blur hover:bg-cyan-500/15"
            >
              BrandArena Live
            </Link>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-x-hidden px-4 pb-10 pt-4 lg:px-6">
        <div className="mx-auto w-full max-w-[1200px] space-y-4">
          {/* Top area: active conflicts */}
          <section>
            <WarTicker
              wars={wars}
              nations={nations}
              factions={factions}
              selectedWarId={selectedWarId}
              onSelectWar={(id) => {
                setSelectedWarId(id);
                const w = wars.find((x) => x.id === id);
                if (w) {
                  const def = nationById.get(w.targetNationId);
                  if (def) setSelectedCountry(toSelectedCountry(def.id, def.name));
                }
              }}
            />
          </section>

          {/* Main hero stage: globe */}
          <section className="rounded-3xl border border-white/10 bg-black/20 p-2 shadow-[inset_0_0_140px_rgba(0,0,0,0.85)] sm:p-3">
            <div className="min-h-[min(72vh,860px)]">
              <TerritoryMap
                selectedCountryId={selectedCountry?.id ?? null}
                onSelectCountry={(c) => {
                  setSelectedCountry(c);
                  setSelectedFactionId(null);
                }}
                onClearSelection={clearCountrySelection}
                nations={nations}
                factions={factions}
                wars={wars}
                nationAlerts={nationAlerts}
                screenPulse={screenPulse}
                simulationLabel={null}
              />
            </div>
          </section>

          {/* Lower information section: panels below the globe */}
          <section className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-6 xl:col-span-5">
              <NationSidebar
                nation={selectedNation}
                owner={selectedOwner}
                war={selectedWar}
                neighbors={neighbors}
                canFoundFaction={canFoundFaction}
                canProposeWar={canProposeWar}
                onFoundFaction={() => setFoundOpen(true)}
                onSupport={(amt) => addSupport(amt)}
                onProposeWar={(targetId) => proposeWar(targetId)}
                onDefend={() => {
                  if (!selectedNation?.ownerFactionId) return;
                  addSupport(500);
                  const defName = selectedOwner?.name ?? selectedNation.name;
                  pushEvent(cinematicDefend(selectedNation.name, defName));
                }}
                onClearSelection={clearCountrySelection}
              />
            </div>

            <div className="min-w-0 lg:col-span-6 xl:col-span-7">
              <WarPanel
                war={focusedWar}
                attackerNation={focusedWarNations.attacker}
                defenderNation={focusedWarNations.defender}
                attackerFaction={focusedWarFactions.attacker}
                defenderFaction={focusedWarFactions.defender}
                playerSide={playerWarSide}
                actAsFactionId={actAsFactionId}
                factions={factions}
                onActAsFaction={setActAsFactionId}
                actionCooldowns={actionCooldowns}
                lastActionFeedback={lastActionFeedback}
                onWarAction={(warId, actionId) => performWarAction(warId, actionId)}
              />
            </div>

            <div className="min-w-0 lg:col-span-7">
              <FactionRolesPanel
                members={playerFactionId ? members.filter((m) => m.factionId === playerFactionId) : []}
                playerMemberId={playerMemberId}
                pendingProposals={pendingProposalsForPlayer}
                nationById={nationById}
                onVote={voteOnProposal}
                onPromote={promoteToGeneral}
                onDemote={demoteGeneral}
                onSwitchPlayer={(id) => setPlayerMemberId(id)}
              />
            </div>

            <div className="min-w-0 lg:col-span-5">
              <NationLeaderboard
                factions={factions}
                nations={nations}
                wars={wars}
                selectedFactionId={selectedFactionId}
                onSelectFaction={(id) => setSelectedFactionId(id)}
              />
            </div>

            <div className="min-w-0 lg:col-span-12">
              <TerritoryActivityFeed events={events} />
            </div>
          </section>
        </div>
      </main>

      <CreateFactionModal
        open={foundOpen}
        territory={selectedNation ? { id: selectedNation.id, name: selectedNation.name } : null}
        onClose={() => setFoundOpen(false)}
        onCreate={(args) => foundFaction(args)}
      />
    </div>
  );
}

function rank(p: "low" | "medium" | "high" | "critical") {
  return p === "critical" ? 4 : p === "high" ? 3 : p === "medium" ? 2 : 1;
}

