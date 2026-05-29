export type Faction = {
  id: string;
  name: string;
  color: string;
  /** Optional image URL (used as map identity). */
  logoUrl?: string;
  /** Text fallback (initials or emoji) if no logoUrl. */
  logoInitials?: string;
  /** 0..1 expansion aggressiveness. */
  aggression: number;
  /** Total community size (passive + active). */
  supportersTotal: number;
  /** Supporters currently “in the war room” (participating). */
  supportersActive: number;
  /** 0..1 share of community that reliably participates (derived/tested in prototype). */
  engagementRate: number;
  /** 0..100 global faction morale. */
  morale: number;
  /** Abstract long-term power from wins/alliances (not money). */
  influence: number;
  /** 0..100 engagement score; affects active participation conversion. */
  engagement: number;
  /** Territory id of the capital. */
  capitalTerritoryId: string;
};

