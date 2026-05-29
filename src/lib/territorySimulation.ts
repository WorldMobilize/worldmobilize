import { controlledCount } from "./territoryMockData";
import type { AbilityId, Brand, Territory, TerritoryEvent, WorldState } from "./territoryTypes";

function nextEventId(now: number) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (crypto as any).randomUUID() as string;
  }
  const g = globalThis as unknown as { __brandArenaEventSeq?: number };
  g.__brandArenaEventSeq = (g.__brandArenaEventSeq ?? 0) + 1;
  return `e-${now}-${g.__brandArenaEventSeq}`;
}

function brandPower(brand: Brand, controlled: number, now: number) {
  let p = brand.power + brand.supporters * 0.04 + brand.budget * 0.0008;
  const sizePenalty = 1 / (1 + controlled / 32);
  p *= sizePenalty;
  if (now < brand.blitzUntil) p *= 1.35;
  if (now < brand.signalUntil) p *= 1.2;
  if (brand.activeBoosts > 0) p *= 1 + brand.activeBoosts * 0.05;
  return p;
}

function defensePower(brand: Brand, cell: Territory, now: number) {
  let d = brand.power * 0.9 + cell.strength * 0.6 + brand.supporters * 0.03;
  if (now < brand.fortifyUntil) d *= 1.45;
  return d;
}

function recomputeStatuses(state: WorldState, now: number) {
  for (const brand of state.brands) {
    const controlled = controlledCount(state.cells, brand.id);
    const inBattle = state.cells.some(
      (c) => c.battle && (c.battle.attackerId === brand.id || c.battle.defenderId === brand.id),
    );
    if (inBattle) brand.status = "fighting";
    else if (now < brand.fortifyUntil) brand.status = "defending";
    else if (now < brand.blitzUntil || now < brand.signalUntil) brand.status = "expanding";
    else if (controlled < 3) brand.status = "recovering";
    else brand.status = "expanding";
  }
}

export function tickWorld(
  state: WorldState,
  rng: () => number,
  now: number,
): { state: WorldState; events: TerritoryEvent[] } {
  const events: TerritoryEvent[] = [];
  const cells = state.cells.map((c) => ({ ...c, battle: c.battle ? { ...c.battle } : null, neighbors: c.neighbors }));
  const brands = state.brands.map((b) => ({ ...b }));
  const byId = new Map(cells.map((c) => [c.id, c]));
  const brandById = new Map(brands.map((b) => [b.id, b]));

  const pushEvent = (text: string) => {
    events.push({ id: nextEventId(now), ts: now, text });
  };

  for (const cell of cells) {
    if (!cell.battle) continue;
    const battle = cell.battle;
    const attacker = brandById.get(battle.attackerId);
    const defender = brandById.get(battle.defenderId);
    if (!attacker || !defender) {
      cell.battle = null;
      continue;
    }
    const aPow = brandPower(attacker, controlledCount(cells, attacker.id), now);
    const dPow = defensePower(defender, cell, now);
    const delta = (aPow - dPow) * 0.32;
    battle.progress = Math.max(0, Math.min(100, battle.progress + delta));
    battle.ticks += 1;

    if (battle.progress >= 100) {
      cell.ownerBrandId = attacker.id;
      cell.strength = 2;
      cell.battle = null;
      pushEvent(`${attacker.name} captured ${cell.name} (${cell.region})`);
    } else if (battle.progress <= 0 || battle.ticks > 14) {
      cell.battle = null;
      pushEvent(`${defender.name} defended ${cell.name}`);
    }
  }

  const order = [...brands].sort((a, b) => a.id.localeCompare(b.id));
  for (const brand of order) {
    const controlled = controlledCount(cells, brand.id);
    if (controlled === 0) continue;

    const owned = cells.filter((c) => c.ownerBrandId === brand.id);
    const frontier: Territory[] = [];
    const seen = new Set<string>();

    for (const c of owned) {
      for (const nid of c.neighbors) {
        if (seen.has(nid)) continue;
        seen.add(nid);
        const n = byId.get(nid);
        if (n && n.ownerBrandId !== brand.id && !n.battle) frontier.push(n);
      }
    }
    if (frontier.length === 0) continue;

    const target = frontier[Math.floor(rng() * frontier.length)]!;
    const power = brandPower(brand, controlled, now);

    if (target.ownerBrandId === null) {
      const chance = Math.min(0.38, 0.07 + power * 0.011);
      if (rng() < chance) {
        target.ownerBrandId = brand.id;
        target.strength = 1 + Math.floor(rng() * 2);
        pushEvent(`${brand.name} expanded into ${target.name}`);
      }
      continue;
    }

    const defender = brandById.get(target.ownerBrandId);
    if (!defender) continue;

    if (!target.battle) {
      target.battle = {
        attackerId: brand.id,
        defenderId: defender.id,
        progress: 50,
        cellId: target.id,
        ticks: 0,
      };
      pushEvent(`${brand.name} started a border war with ${defender.name} near ${target.region}`);
    }
  }

  recomputeStatuses({ cells, brands }, now);
  return { state: { cells, brands }, events };
}

export function supportBrand(state: WorldState, brandId: string): WorldState {
  const brands = state.brands.map((b) =>
    b.id === brandId ? { ...b, supporters: b.supporters + 1, power: b.power + 0.15 } : b,
  );
  return { ...state, brands };
}

export function boostBrand(state: WorldState, brandId: string, amount: number): WorldState {
  const brands = state.brands.map((b) =>
    b.id === brandId
      ? { ...b, budget: b.budget + amount, power: b.power + amount * 0.001, activeBoosts: b.activeBoosts + 1 }
      : b,
  );
  return { ...state, brands };
}

export function triggerAbility(
  state: WorldState,
  brandId: string,
  ability: AbilityId,
  now: number,
): { state: WorldState; ok: boolean; message: string } {
  const brands = state.brands.map((b) => ({ ...b }));
  const brand = brands.find((b) => b.id === brandId);
  if (!brand) return { state, ok: false, message: "Brand not found" };
  if (now < brand.abilityCooldownUntil) {
    return { state, ok: false, message: "Ability on cooldown" };
  }

  const cd = now + 25_000;
  if (ability === "fortify") {
    brand.fortifyUntil = now + 20_000;
    brand.status = "defending";
  } else if (ability === "blitz") {
    brand.blitzUntil = now + 18_000;
    brand.status = "expanding";
  } else {
    brand.signalUntil = now + 20_000;
    brand.supporters += 25;
    brand.power += 2;
    brand.status = "expanding";
  }
  brand.abilityCooldownUntil = cd;

  return {
    state: { ...state, brands },
    ok: true,
    message:
      ability === "fortify"
        ? `${brand.name} fortified border sectors`
        : ability === "blitz"
          ? `${brand.name} launched a blitz`
          : `${brand.name} triggered Signal Boost`,
  };
}

export function getActiveBattles(state: WorldState) {
  return state.cells.filter((c) => c.battle).length;
}

export function mapControlPct(state: WorldState) {
  const total = state.cells.length;
  const owned = state.cells.filter((c) => c.ownerBrandId).length;
  return total > 0 ? (owned / total) * 100 : 0;
}
