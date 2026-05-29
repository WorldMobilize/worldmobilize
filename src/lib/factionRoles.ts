export type FactionRole = "founder" | "general" | "soldier";

export type FactionMember = {
  id: string;
  factionId: string;
  displayName: string;
  role: FactionRole;
};

export function canProposeWar(role: FactionRole) {
  return role === "founder";
}

export function canVoteOnWar(role: FactionRole) {
  return role === "general";
}

export function canAppointGenerals(role: FactionRole) {
  return role === "founder";
}

export function seedFactionRoster(factionId: string, founderName: string): FactionMember[] {
  const founder: FactionMember = {
    id: `m-${factionId}-founder`,
    factionId,
    displayName: founderName,
    role: "founder",
  };
  const generals: FactionMember[] = ["Alpha", "Bravo", "Charlie"].map((g, i) => ({
    id: `m-${factionId}-gen-${i}`,
    factionId,
    displayName: `General ${g}`,
    role: "general" as const,
  }));
  const soldiers: FactionMember[] = Array.from({ length: 5 }, (_, i) => ({
    id: `m-${factionId}-sol-${i}`,
    factionId,
    displayName: `Soldier ${i + 1}`,
    role: "soldier" as const,
  }));
  return [founder, ...generals, ...soldiers];
}
