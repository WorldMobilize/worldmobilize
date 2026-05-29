/**
 * Future playable zone counts per country/region.
 * Not used in gameplay yet — documents the territory split plan.
 */

export type CountryZonePlan = {
  /** ISO 3166-1 numeric or custom slug */
  id: string;
  name: string;
  region: string;
  plannedZones: number;
};

/** Keyed by display name as in world-110m GeoJSON */
export const COUNTRY_ZONE_PLANS: Record<string, CountryZonePlan> = {
  Italy: { id: "380", name: "Italy", region: "Europe", plannedZones: 20 },
  France: { id: "250", name: "France", region: "Europe", plannedZones: 20 },
  Germany: { id: "276", name: "Germany", region: "Europe", plannedZones: 20 },
  "United Kingdom": { id: "826", name: "United Kingdom", region: "Europe", plannedZones: 18 },
  Spain: { id: "724", name: "Spain", region: "Europe", plannedZones: 18 },
  Japan: { id: "392", name: "Japan", region: "Asia", plannedZones: 14 },
  "South Korea": { id: "410", name: "South Korea", region: "Asia", plannedZones: 10 },
  China: { id: "156", name: "China", region: "Asia", plannedZones: 48 },
  India: { id: "356", name: "India", region: "Asia", plannedZones: 36 },
  "United States of America": {
    id: "840",
    name: "United States of America",
    region: "North America",
    plannedZones: 50,
  },
  Canada: { id: "124", name: "Canada", region: "North America", plannedZones: 28 },
  Brazil: { id: "076", name: "Brazil", region: "South America", plannedZones: 26 },
  Australia: { id: "036", name: "Australia", region: "Oceania", plannedZones: 16 },
  Mexico: { id: "484", name: "Mexico", region: "North America", plannedZones: 22 },
  Egypt: { id: "818", name: "Egypt", region: "Africa", plannedZones: 12 },
  Nigeria: { id: "566", name: "Nigeria", region: "Africa", plannedZones: 14 },
  "South Africa": { id: "710", name: "South Africa", region: "Africa", plannedZones: 12 },
};

export function zonePlanForCountry(name: string): CountryZonePlan | null {
  return COUNTRY_ZONE_PLANS[name] ?? null;
}

export function defaultZoneEstimate(name: string) {
  const plan = zonePlanForCountry(name);
  if (plan) return plan.plannedZones;
  if (name.length > 12) return 12;
  return 8;
}

export type SelectedCountry = {
  id: string;
  name: string;
  plannedZones: number;
  region: string;
};

export function toSelectedCountry(id: string, name: string): SelectedCountry {
  const plan = zonePlanForCountry(name);
  return {
    id,
    name,
    plannedZones: plan?.plannedZones ?? defaultZoneEstimate(name),
    region: plan?.region ?? "World",
  };
}
