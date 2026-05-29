"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoCentroid, geoDistance, geoGraticule10, geoPath } from "d3-geo";
import {
  createGlobeProjection,
  clampPhi,
  DEBUG_ANCHOR_ZONES,
  GLOBE_VIEW_SIZE,
  globeSphereRadius,
  INITIAL_GLOBE_ROTATION,
  projectLonLat,
  roundRotation,
  viewCenter,
} from "@/lib/globeProjection";
import type { SelectedCountry } from "@/lib/territoryZones";
import { toSelectedCountry } from "@/lib/territoryZones";
import { WORLD_COUNTRIES, countryId, countryName, gameplayGeometryForCountry } from "@/lib/worldMapData";
import type { Faction } from "@/lib/factionTypes";
import type { Nation, NationWar } from "@/lib/nationMvpTypes";
import type { NationAlertVisual } from "@/lib/warEscalation";
import { warArrowCurvePath } from "@/lib/warArrowPath";

const VIEW_SIZE = GLOBE_VIEW_SIZE;
const GLOBE_R = globeSphereRadius(VIEW_SIZE);
const SHOW_ANCHOR_DEBUG = false;
const DEV = process.env.NODE_ENV === "development";

const AUTO_ROTATE_IDLE_MS = 1200;
const AUTO_ROTATE_SPEED = 0.18;

export function TerritoryMap(props: {
  selectedCountryId: string | null;
  onSelectCountry: (country: SelectedCountry) => void;
  onClearSelection?: () => void;
  factions: Faction[];
  nations: Nation[];
  wars: NationWar[];
  nationAlerts?: Map<string, NationAlertVisual>;
  screenPulse?: boolean;
  simulationLabel?: string | null;
}) {
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const lastRef = useRef({ x: 0, y: 0 });
  const idleSinceRef = useRef(0);
  // Globe surface used for pointer interactions (no zoom for now).
  const globeSurfaceRef = useRef<HTMLDivElement>(null);

  const [rotation, setRotation] = useState<[number, number, number]>(INITIAL_GLOBE_ROTATION);
  const [mounted, setMounted] = useState(false);
  const [hoverCountryId, setHoverCountryId] = useState<string | null>(null);
  const [hoverCapitalFactionId, setHoverCapitalFactionId] = useState<string | null>(null);
  const [geoDebug, setGeoDebug] = useState(false);

  useEffect(() => {
    setMounted(true);
    idleSinceRef.current = Date.now();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (draggingRef.current) return;
      if (props.selectedCountryId) return;
      if (Date.now() - idleSinceRef.current < AUTO_ROTATE_IDLE_MS) return;
      setRotation((r) => roundRotation([r[0] + AUTO_ROTATE_SPEED, r[1], r[2]]));
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [props.selectedCountryId]);

  const displayRot = mounted ? rotation : INITIAL_GLOBE_ROTATION;

  const globe = useMemo(() => {
    // Camera zoom is applied visually to the whole globe composition (CSS scale).
    // Keep the projection stable so we’re not “magnifying the texture inside” a fixed sphere.
    const projection = createGlobeProjection(displayRot, VIEW_SIZE, 1);
    const path = geoPath(projection);
    const center = viewCenter(displayRot);

    const sortedCountries = [...WORLD_COUNTRIES].sort(
      (a, b) => geoDistance(geoCentroid(b), center) - geoDistance(geoCentroid(a), center),
    );

    const countries = sortedCountries
      .map((f) => {
        const baseD = path(f) ?? "";
        const gameplayGeom = gameplayGeometryForCountry(f);
        const gameplayD = gameplayGeom ? path({ type: "Feature", properties: {}, geometry: gameplayGeom }) : null;
        const d = gameplayD ?? baseD;
        if (!d) return null;
        const centroid = geoCentroid({ type: "Feature", properties: {}, geometry: gameplayGeom ?? f.geometry }) as [
          number,
          number,
        ];
        return { id: countryId(f), name: countryName(f), d, baseD, centroid };
      })
      .filter(Boolean) as Array<{ id: string; name: string; d: string; baseD: string; centroid: [number, number] }>;

    const debugAnchors = DEBUG_ANCHOR_ZONES.map((z) => {
      const p = projectLonLat(projection, displayRot, z.lon, z.lat);
      return p ? { ...z, ...p } : null;
    }).filter(Boolean) as Array<{ id: string; lon: number; lat: number; x: number; y: number; alpha: number }>;

    return {
      projection,
      path,
      graticulePath: path(geoGraticule10()) ?? "",
      countries,
      debugAnchors,
    };
  }, [displayRot]);

  useEffect(() => {
    if (!DEV || !mounted) return;
    if (!SHOW_ANCHOR_DEBUG) return;
    const center = viewCenter(displayRot);
    // eslint-disable-next-line no-console
    console.info(
      "[BrandArena globe] view center",
      { lon: center[0].toFixed(1), lat: center[1].toFixed(1) },
      "debug anchors",
      globe.debugAnchors.map((a) => `${a.id}@${a.x},${a.y}`),
    );
  }, [displayRot, mounted, globe.debugAnchors]);

  const hoveredCountry = globe.countries.find((c) => c.id === hoverCountryId);
  const hoveredCapitalFaction = props.factions.find((f) => f.id === hoverCapitalFactionId) ?? null;

  const byNationId = useMemo(() => new Map(props.nations.map((n) => [n.id, n])), [props.nations]);
  const warByTargetNationId = useMemo(() => new Map(props.wars.map((w) => [w.targetNationId, w])), [props.wars]);
  const warByAttackerNationId = useMemo(() => new Map(props.wars.map((w) => [w.attackerNationId, w])), [props.wars]);

  const warArrows = useMemo(() => {
    const out: Array<{ id: string; d: string; alpha: number }> = [];
    for (const w of props.wars) {
      const atkC = globe.countries.find((c) => c.id === w.attackerNationId);
      const defC = globe.countries.find((c) => c.id === w.targetNationId);
      if (!atkC || !defC) continue;
      const [lon1, lat1] = atkC.centroid;
      const [lon2, lat2] = defC.centroid;
      const p1 = projectLonLat(globe.projection, displayRot, lon1, lat1);
      const p2 = projectLonLat(globe.projection, displayRot, lon2, lat2);
      if (!p1 || !p2) continue;
      const d = warArrowCurvePath(p1.x, p1.y, p2.x, p2.y, VIEW_SIZE);
      out.push({ id: w.id, d, alpha: Math.min(p1.alpha, p2.alpha) });
    }
    return out;
  }, [props.wars, globe.countries, globe.projection, displayRot]);
  const warsActiveByFactionId = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of props.wars) {
      m.set(w.attackerFactionId, (m.get(w.attackerFactionId) ?? 0) + 1);
      if (w.defenderFactionId) m.set(w.defenderFactionId, (m.get(w.defenderFactionId) ?? 0) + 1);
    }
    return m;
  }, [props.wars]);

  const hoveredNation = hoveredCountry ? byNationId.get(hoveredCountry.id) ?? null : null;
  const hoveredNationOwner =
    hoveredNation?.ownerFactionId ? props.factions.find((f) => f.id === hoveredNation.ownerFactionId) ?? null : null;
  const hoveredNationWar = hoveredCountry ? warByTargetNationId.get(hoveredCountry.id) ?? null : null;
  const hoveredProj = useMemo(() => {
    if (!hoveredCountry) return null;
    const [lon, lat] = hoveredCountry.centroid;
    return projectLonLat(globe.projection, displayRot, lon, lat);
  }, [hoveredCountry, globe.projection, displayRot]);

  // Intentionally no on-globe badges/logos/initials — keep the surface clean and cinematic.

  const onPointerDown = (clientX: number, clientY: number) => {
    draggingRef.current = true;
    movedRef.current = false;
    lastRef.current = { x: clientX, y: clientY };
    idleSinceRef.current = Date.now();
  };

  const onPointerMove = (clientX: number, clientY: number) => {
    if (!draggingRef.current) return;
    const dx = clientX - lastRef.current.x;
    const dy = clientY - lastRef.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) movedRef.current = true;
    lastRef.current = { x: clientX, y: clientY };
    idleSinceRef.current = Date.now();
    setRotation((r) => roundRotation([r[0] + dx * 0.35, clampPhi(r[1] - dy * 0.28), r[2]]));
  };

  const onPointerUp = () => {
    draggingRef.current = false;
    idleSinceRef.current = Date.now();
  };

  const resetView = () => {
    setRotation(INITIAL_GLOBE_ROTATION);
    idleSinceRef.current = Date.now();
  };

  const clearSelection = () => {
    idleSinceRef.current = Date.now();
    props.onClearSelection?.();
  };

  return (
    <div className="relative flex h-full min-h-[320px] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[inset_0_0_140px_rgba(0,0,0,0.85)]">
      {props.screenPulse ? (
        <div className="war-screen-pulse pointer-events-none absolute inset-0 z-40 rounded-2xl" aria-hidden />
      ) : null}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(34,211,238,0.12),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,rgba(167,139,250,0.06),transparent_62%)]" />
      </div>

      <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden p-2 sm:p-4">
        {/* Rectangular frame. The *globe* stays in a stable square viewport inside it. */}
        <div className="relative h-full w-full">
          <div
            ref={globeSurfaceRef}
            className="relative mx-auto aspect-square h-full max-h-[760px] w-full max-w-[760px] touch-none select-none"
            onMouseDown={(e) => onPointerDown(e.clientX, e.clientY)}
            onMouseUp={onPointerUp}
            onMouseLeave={onPointerUp}
            onTouchStart={(e) => {
              const t = e.touches[0];
              if (t) onPointerDown(t.clientX, t.clientY);
            }}
            onTouchMove={(e) => {
              const t = e.touches[0];
              if (t) onPointerMove(t.clientX, t.clientY);
            }}
            onTouchEnd={onPointerUp}
            onMouseMove={(e) => onPointerMove(e.clientX, e.clientY)}
          >
            <div className="relative h-full w-full overflow-hidden rounded-xl">
              <div
                className="absolute inset-0"
              >
            {hoveredCountry ? (
              hoveredNation && hoveredNationOwner && hoveredProj ? (
                <div
                  className="pointer-events-none absolute z-30 max-w-[min(280px,88%)] rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-[11px] text-zinc-200 shadow-[0_0_40px_rgba(0,0,0,0.55)] backdrop-blur"
                  style={{
                    left: `${Math.max(4, Math.min(96, (hoveredProj.x / VIEW_SIZE) * 100)).toFixed(4)}%`,
                    top: `${Math.max(6, Math.min(92, (hoveredProj.y / VIEW_SIZE) * 100)).toFixed(4)}%`,
                    transform: "translate(14px, -14px)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-50">{hoveredCountry.name}</div>
                      <div className="mt-0.5 truncate text-[11px] text-zinc-400">
                        Owned by <span className="font-semibold text-zinc-200">{hoveredNationOwner.name}</span>
                        {DEV && geoDebug ? <span className="ml-2 font-mono text-zinc-500">#{hoveredCountry.id}</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3.5 w-3.5 rounded-full border border-white/10"
                        style={{ backgroundColor: hoveredNationOwner.color, boxShadow: `0 0 14px ${hoveredNationOwner.color}55` }}
                        aria-hidden
                      />
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Support</span>
                      <span className="font-semibold text-zinc-200 tabular-nums">
                        {Math.round(hoveredNation.currentSupport).toLocaleString()} / {Math.round(hoveredNation.audienceCap).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/40">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, hoveredNation.audienceCap > 0 ? (hoveredNation.currentSupport / hoveredNation.audienceCap) * 100 : 0),
                          ).toFixed(1)}%`,
                          background: `linear-gradient(90deg, ${hoveredNationOwner.color}CC, ${hoveredNationOwner.color}66)`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-zinc-400">
                    <div>
                      Active:{" "}
                      <span className="font-semibold text-zinc-200">{Math.round(hoveredNationOwner.supportersActive).toLocaleString()}</span>
                    </div>
                    <div>
                      Wars: <span className="font-semibold text-zinc-200">{warsActiveByFactionId.get(hoveredNationOwner.id) ?? 0}</span>
                    </div>
                    <div className="col-span-2">
                      Status:{" "}
                      <span className="font-semibold text-zinc-200">
                        {hoveredNationWar ? "contested" : hoveredNation.status}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full border border-cyan-400/25 bg-black/60 px-4 py-1.5 text-xs font-semibold text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.2)]">
                  {hoveredCountry.name}
                  {DEV && geoDebug ? (
                    <span className="ml-2 font-mono text-[11px] text-cyan-100/70">#{hoveredCountry.id}</span>
                  ) : null}
                </div>
              )
            ) : null}

            {props.simulationLabel ? (
              <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full border border-orange-400/25 bg-black/60 px-4 py-1.5 text-xs font-semibold text-orange-50 shadow-[0_0_24px_rgba(249,115,22,0.18)]">
                {props.simulationLabel}
              </div>
            ) : null}

            <svg
              viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
              className="h-full w-full cursor-grab active:cursor-grabbing"
              role="img"
              aria-label="Interactive world globe"
            >
            <defs>
              <radialGradient id="oceanGlow" cx="38%" cy="34%" r="68%">
                <stop offset="0%" stopColor="rgba(18,32,48,0.95)" />
                <stop offset="55%" stopColor="rgba(6,12,22,0.98)" />
                <stop offset="100%" stopColor="rgba(2,4,10,1)" />
              </radialGradient>
              <radialGradient id="rimLight" cx="35%" cy="30%" r="55%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              <filter id="landGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="selectGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="defenderGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="warRouteStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(239,68,68,0.55)" />
                <stop offset="100%" stopColor="rgba(251,146,60,0.9)" />
              </linearGradient>
              <filter id="warRouteGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <marker
                id="warArrowHeadSmall"
                markerWidth="5"
                markerHeight="5"
                refX="4.2"
                refY="2.5"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path
                  d="M0,0.5 L4,2.5 L0,4.5"
                  fill="none"
                  stroke="rgba(251,146,60,0.95)"
                  strokeWidth="0.65"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </marker>
            </defs>

            <circle
              cx={VIEW_SIZE / 2}
              cy={VIEW_SIZE / 2}
              r={GLOBE_R}
              fill="url(#oceanGlow)"
              stroke="rgba(34,211,238,0.22)"
              strokeWidth={1.2}
              onClick={() => {
                if (movedRef.current) return;
                clearSelection();
              }}
              style={{ cursor: props.selectedCountryId ? "pointer" : undefined }}
            />
            <circle
              cx={VIEW_SIZE / 2}
              cy={VIEW_SIZE / 2}
              r={GLOBE_R}
              fill="url(#rimLight)"
              pointerEvents="none"
            />

            <path
              d={globe.graticulePath}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={0.5}
              pointerEvents="none"
            />

            <clipPath id="globeClip">
              <circle cx={VIEW_SIZE / 2} cy={VIEW_SIZE / 2} r={GLOBE_R - 0.5} />
            </clipPath>

            <g clipPath="url(#globeClip)">
              {/* Nation-only MVP: countries are the only playable territories */}
              {globe.countries.map((c) => {
                const n = byNationId.get(c.id) ?? null;
                const owner = n?.ownerFactionId ? props.factions.find((f) => f.id === n.ownerFactionId) ?? null : null;
                const warAsTarget = warByTargetNationId.get(c.id) ?? null;
                const warAsAttacker = warByAttackerNationId.get(c.id) ?? null;
                const war = warAsTarget ?? warAsAttacker;
                const selected = props.selectedCountryId === c.id;
                const alert = props.nationAlerts?.get(c.id);

                const fill = owner ? owner.color : "rgba(14,28,24,0.92)";
                const fillOpacity = owner ? 0.44 : 0.92;
                let stroke = warAsTarget
                  ? "rgba(249,115,22,0.96)"
                  : warAsAttacker
                    ? "rgba(248,113,113,0.85)"
                    : selected
                      ? "rgba(34,211,238,0.95)"
                      : owner
                        ? owner.color
                        : "rgba(34,211,238,0.38)";
                let strokeWidth = warAsTarget ? 2.4 : warAsAttacker ? 1.8 : selected ? 1.6 : 0.65;

                if (alert && alert.level !== "stable") {
                  stroke = alert.level === "last_stand" ? "rgba(255,90,70,0.98)" : "rgba(251,146,60,0.95)";
                  strokeWidth =
                    alert.level === "last_stand"
                      ? 3.2
                      : alert.level === "capital_threatened"
                        ? 3.0
                        : alert.level === "critical_defense"
                          ? 2.8
                          : 2.2;
                }

                const interactive = !!n;

                return (
                  <path
                    key={c.id}
                    d={c.d}
                    fill={fill}
                    fillOpacity={fillOpacity}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    filter={
                      alert && alert.glow >= 0.55
                        ? "url(#defenderGlow)"
                        : warAsTarget
                          ? "url(#defenderGlow)"
                          : selected
                            ? "url(#selectGlow)"
                            : undefined
                    }
                    className={[
                      "transition-[fill,stroke] duration-150",
                      warAsTarget || alert?.pulse ? "animate-pulse" : "",
                    ].join(" ")}
                    style={interactive ? { cursor: "pointer" } : undefined}
                    strokeDasharray={DEV && geoDebug && selected ? "4 3" : undefined}
                    pointerEvents={interactive ? "auto" : "none"}
                    onMouseEnter={() => setHoverCountryId(c.id)}
                    onMouseLeave={() => setHoverCountryId(null)}
                    onClick={() => {
                      if (movedRef.current) return;
                      props.onSelectCountry(toSelectedCountry(c.id, c.name));
                    }}
                  />
                );
              })}

              {/* Attack routes — thin tactical lines */}
              <g pointerEvents="none">
                {warArrows.map((a) => (
                  <path
                    key={`arrow-${a.id}`}
                    d={a.d}
                    fill="none"
                    stroke="url(#warRouteStroke)"
                    strokeWidth={1.15}
                    strokeLinecap="round"
                    markerEnd="url(#warArrowHeadSmall)"
                    opacity={Math.min(0.85, a.alpha * 0.75)}
                    filter="url(#warRouteGlow)"
                    className="war-route-path"
                  />
                ))}
              </g>

              {/* Borders on top for readability */}
              {globe.countries.map((c) => (
                <path key={`b-${c.id}`} d={c.baseD} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.6} pointerEvents="none" />
              ))}

              {props.factions.map((f) => {
                const capNation = byNationId.get(f.capitalTerritoryId ?? "") ?? null;
                if (!capNation) return null;
                const capCountry = globe.countries.find((c) => c.id === capNation.id) ?? null;
                if (!capCountry) return null;
                const [lon, lat] = capCountry.centroid;
                const proj = projectLonLat(globe.projection, displayRot, lon, lat);
                if (!proj) return null;
                return (
                  <g key={`cap-${f.id}`} opacity={proj.alpha}>
                    <circle
                      cx={proj.x}
                      cy={proj.y}
                      r={3.1}
                      fill={f.color}
                      opacity={0.95}
                      onMouseEnter={() => setHoverCapitalFactionId(f.id)}
                      onMouseLeave={() => setHoverCapitalFactionId(null)}
                      onClick={() => {
                        if (movedRef.current) return;
                        props.onSelectCountry(toSelectedCountry(capNation.id, capNation.name));
                      }}
                    />
                    <circle cx={proj.x} cy={proj.y} r={7.2} fill={f.color} opacity={0.08} pointerEvents="none" className="animate-pulse" />
                  </g>
                );
              })}

              {process.env.NODE_ENV === "development" && SHOW_ANCHOR_DEBUG
                ? globe.debugAnchors.map((a) => (
                    <g key={`dbg-${a.id}`} pointerEvents="none" opacity={a.alpha}>
                      <circle cx={a.x} cy={a.y} r={2.5} fill="rgba(34,211,238,0.5)" />
                      <text x={a.x + 5} y={a.y - 5} fontSize={6} fill="rgba(103,232,249,0.75)">
                        {a.id}
                      </text>
                    </g>
                  ))
                : null}
            </g>

            <circle
              cx={VIEW_SIZE / 2}
              cy={VIEW_SIZE / 2}
              r={GLOBE_R}
              fill="none"
              stroke="rgba(0,0,0,0.55)"
              strokeWidth={14}
              pointerEvents="none"
              opacity={0.55}
            />
            <circle
              cx={VIEW_SIZE / 2}
              cy={VIEW_SIZE / 2}
              r={GLOBE_R}
              fill="none"
              stroke="rgba(34,211,238,0.08)"
              strokeWidth={1}
              pointerEvents="none"
            />
            </svg>

            {/* No on-globe initials/logos/badges — identity stays in panels and tooltips. */}
            </div>
          </div>
          </div>

          {/* HUD */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-50 flex flex-col gap-2">
            <div className="pointer-events-auto rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-[11px] text-zinc-200 backdrop-blur">
              <div className="font-semibold text-zinc-100">Globe</div>
              <div className="mt-0.5 text-zinc-500">Drag to rotate</div>
              <button
                type="button"
                onClick={resetView}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-white/10"
              >
                Reset view
              </button>
            </div>

            {null}

            {props.selectedCountryId ? (
              <div className="pointer-events-auto rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-[11px] backdrop-blur">
                <div className="font-semibold text-cyan-50">Inspecting nation</div>
                <div className="mt-0.5 text-zinc-400">Globe rotation paused</div>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-white/10"
                >
                  Clear selection
                </button>
              </div>
            ) : null}

            {props.simulationLabel ? (
              <div className="pointer-events-none rounded-xl border border-white/10 bg-black/55 px-3 py-2 text-[11px] text-zinc-300 backdrop-blur">
                <div className="font-semibold text-zinc-100">Status</div>
                <div className="mt-0.5 text-zinc-500">{props.simulationLabel}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="pointer-events-none border-t border-white/5 px-4 py-3 text-center">
        <p className="text-[11px] text-zinc-500">
          {props.selectedCountryId
            ? "Drag to adjust view · Clear selection to resume auto-rotation"
            : "Drag to rotate"}
        </p>
      </div>
    </div>
  );
}
