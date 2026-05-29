import type { NationAlertLevel, WarPhase } from "./warEscalation";

export type NationStatus = "neutral" | "owned" | "contested";

export type Nation = {
  /** Country numericId from `worldMapData` */
  id: string;
  name: string;

  ownerFactionId: string | null;
  status: NationStatus;

  audienceCap: number;
  currentSupport: number;

  neighbors: string[];
};

export type WarActionLog = {
  id: string;
  ts: number;
  actionId: string;
  side: "attack" | "defense";
  label: string;
  momentumDelta: number;
  actorLabel: string;
};

export type NationWar = {
  id: string;
  attackerFactionId: string;
  defenderFactionId: string | null; // null if neutral target at declaration time
  attackerNationId: string;
  targetNationId: string;
  startedAt: number;
  endsAt: number;
  progress: number; // 0..100 capture progress
  /** Soldiers actively participating on each side (war room). */
  attackerParticipants: number;
  defenderParticipants: number;
  /** -22..+22 bias toward attacker capture (from soldier actions). */
  actionMomentum: number;
  recentActions: WarActionLog[];
  /** Defender reinforcement surge window (client-only pacing). */
  reinforcementSurgeUntil?: number;
  /** Short momentum surge window after burst activity. */
  momentumSurgeUntil?: number;
  momentumSurgeSide?: "attack" | "defense";
  momentumSurgeLabel?: string;
  /** Cached escalation snapshot for transition events. */
  escalation?: {
    phase: WarPhase;
    defenderAlert: NationAlertLevel;
    attackerAlert: NationAlertLevel;
  };
};

export type WarProposalStatus = "pending" | "approved" | "rejected";

export type WarProposalVote = {
  memberId: string;
  vote: "yes" | "no";
};

export type WarProposal = {
  id: string;
  factionId: string;
  attackerNationId: string;
  targetNationId: string;
  proposedByMemberId: string;
  status: WarProposalStatus;
  votes: WarProposalVote[];
  createdAt: number;
};

