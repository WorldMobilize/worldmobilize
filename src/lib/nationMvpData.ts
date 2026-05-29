import { geoArea } from "d3-geo";
import { WORLD_COUNTRIES, WORLD_NEIGHBORS_BY_ID, countryId, countryName } from "./worldMapData";
import type { Nation } from "./nationMvpTypes";

function capForCountryName(name: string) {
  // Simple size tiers for MVP.
  // (We can later compute area-based caps, but this is predictable and easy to tune.)
  if (name === "Switzerland" || name === "Netherlands") return 200;
  if (name === "Austria" || name === "Poland" || name === "Egypt" || name === "South Korea") return 500;
  if (name === "Italy" || name === "France" || name === "Germany" || name === "Spain" || name === "United Kingdom") return 800;
  if (name === "Japan" || name === "Australia" || name === "Argentina" || name === "Mexico" || name === "South Africa") return 1000;
  if (name === "Canada" || name === "Brazil" || name === "India") return 1500;
  if (name === "China" || name === "United States of America") return 2000;
  return 500;
}

function capFromArea(area: number, min: number, max: number) {
  const t = Math.max(0, Math.min(1, (area - min) / Math.max(1e-9, max - min)));
  const raw = 220 + t * (2200 - 220);
  const step = 50;
  return Math.round(raw / step) * step;
}

export function createInitialNations(): Nation[] {
  // Full world coverage: one Nation per Natural Earth country feature.
  // Skip Antarctica and unknown placeholders.
  const features = WORLD_COUNTRIES.filter((f) => {
    const nm = countryName(f);
    if (!nm || nm === "Unknown") return false;
    if (nm === "Antarctica") return false;
    return true;
  });

  const areas = features.map((f) => geoArea(f));
  const minA = Math.min(...areas);
  const maxA = Math.max(...areas);

  const nations: Nation[] = features.map((f) => {
    const id = countryId(f);
    const name = countryName(f);
    const area = geoArea(f);
    const areaCap = capFromArea(area, minA, maxA);
    const tuned = capForCountryName(name); // keep familiar caps for key countries
    const audienceCap = Math.max(areaCap, tuned);
    return {
      id,
      name,
      ownerFactionId: null,
      status: "neutral",
      audienceCap,
      currentSupport: 0,
      neighbors: WORLD_NEIGHBORS_BY_ID.get(id) ?? [],
    };
  });

  return nations;
}

export const PLAYABLE_COUNTRY_NAME_SET = new Set<string>(WORLD_COUNTRIES.map((f) => countryName(f)));

