"use client";

import type { MotionComponentProps } from "@/components/motion/components/registry";
import {
  asString,
  brandAccent,
  brandFg,
  cardChrome,
  fitFont,
  progressReveal,
  readChromeProps,
} from "@/components/motion/components/chrome";
import { asStringArray, clamp01 } from "@/components/motion/components/rng";
import { PillHero } from "@/components/motion/components/PillHero";

export function LogoLockup({ layer, props, progress, brand, jobId, assets }: MotionComponentProps) {
  const wordmark = asString(props.wordmark, "Brand");
  const tagline = asString(props.tagline);
  const accent = asString(props.color, brandAccent(brand));
  const p = clamp01(progress);
  const logo = asString(props.logo, "capsule");
  const useClaude = logo === "claude" || logo === "builtin:claude-mark" || logo.includes("claude");
  const showPill = !useClaude && (!logo || logo === "capsule" || logo.startsWith("capsule"));
  const claudeSrc =
    assets?.find((a) => a.id === "builtin:claude-mark")?.url ?? "/assets/claude-mark.png";
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: brandFg(brand), textAlign: "center", overflow: "hidden", padding: 10, boxSizing: "border-box" }}>
      {useClaude ? (
        <img
          src={claudeSrc}
          alt=""
          style={{
            width: "42%",
            height: "48%",
            objectFit: "contain",
            opacity: Math.min(1, 0.35 + p * 0.65),
          }}
        />
      ) : null}
      {showPill ? (
        <div style={{ width: "42%", height: "48%" }}>
          <PillHero layer={layer} props={{ topColor: "#FFFFFF", bottomColor: accent, color: accent, spin: 360, float: 0, tilt: 0 }} progress={Math.min(1, 0.35 + p * 0.65)} brand={brand} jobId={jobId} assets={assets} />
        </div>
      ) : null}
      <div style={{ fontSize: Math.min(layer.width * 0.08, 48), fontWeight: 800, letterSpacing: -1 }}>{wordmark}</div>
      {tagline ? <div style={{ fontSize: Math.min(layer.width * 0.035, 18), opacity: 0.75 }}>{tagline}</div> : null}
    </div>
  );
}

export function Wordmark({ layer, props, brand }: MotionComponentProps) {
  // Both spellings are documented in the catalog, and `props.text` is seeded to
  // "" upstream — so this must fall through on empty, not merely on missing.
  // asString returns "" verbatim rather than its fallback, which would have
  // dropped a wordmark that arrived under the other name.
  //
  // No placeholder at the end: the merge step fills this from the project title,
  // and if that ever fails again an empty lockup reads as "something is
  // missing", whereas the old "Brand" default shipped a confident, wrong name.
  const text = asString(props.text).trim() || asString(props.wordmark).trim();
  const accent = asString(props.color, brandAccent(brand));
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: accent, fontWeight: 900, fontSize: fitFont(layer.width, layer.height, 0.22, 64), letterSpacing: -1.5 }}>
      {text}
    </div>
  );
}

export function IconGrid({ layer, props, progress, brand }: MotionComponentProps) {
  const items = asStringArray(props.items).slice(0, 8);
  const list = items.length ? items : ["A", "B", "C", "D", "E", "F"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  const cols = list.length <= 4 ? 2 : 3;
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 12 }), display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
      {list.map((it, i) => (
        <div key={i} style={{ aspectRatio: "1", borderRadius: 12, background: `${accent}22`, border: `1px solid ${accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, opacity: progressReveal(p, i, list.length) }}>
          {it.slice(0, 3)}
        </div>
      ))}
    </div>
  );
}

export function TrustBadge({ layer, props, brand }: MotionComponentProps) {
  const label = asString(props.label, "Trusted by 2,000+ teams");
  const accent = brandAccent(brand);
  return (
    <div style={{ ...cardChrome(brand, { glass: true, shadow: false, accent, pad: "10px 16px", radius: 999 }), display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: fitFont(layer.width, layer.height, 0.1, 15), fontWeight: 600 }}>
      <span style={{ color: "#4ade80" }}>●</span> {label}
    </div>
  );
}

export function CompanyLogoRow({ layer, props, progress, brand }: MotionComponentProps) {
  const logos = asStringArray(props.logos).concat(asStringArray(props.items)).slice(0, 6);
  const list = logos.length ? logos : ["Acme", "Nova", "Pulse", "Orbit", "Stack"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-evenly", gap: 8, padding: 8, boxSizing: "border-box" }}>
      {list.map((name, i) => (
        <div key={i} style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: fitFont(layer.width, layer.height, 0.06, 16), opacity: 0.35 + 0.55 * progressReveal(p, i, list.length), color: brandFg(brand), borderBottom: `2px solid ${accent}44`, paddingBottom: 4 }}>
          {name}
        </div>
      ))}
    </div>
  );
}

export function SocialProofRow({ layer, props, progress, brand }: MotionComponentProps) {
  const stats = asStringArray(props.stats).slice(0, 4);
  const list = stats.length ? stats : ["4.9★", "12k users", "98% retention"];
  const accent = brandAccent(brand);
  const p = clamp01(progress);
  return (
    <div style={{ ...cardChrome(brand, { ...readChromeProps(props), accent, pad: 12 }), display: "flex", alignItems: "center", justifyContent: "space-around", gap: 8 }}>
      {list.map((s, i) => (
        <div key={i} style={{ textAlign: "center", opacity: progressReveal(p, i, list.length) }}>
          <div style={{ fontSize: fitFont(layer.width, layer.height, 0.09, 20), fontWeight: 800, color: accent }}>{s}</div>
        </div>
      ))}
    </div>
  );
}
