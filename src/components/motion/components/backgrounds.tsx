"use client";

import type { MotionComponentProps } from "@/components/motion/components/registry";
import { asNumber, asString, brandAccent, hexAlpha } from "@/components/motion/components/chrome";
import { clamp01, seededRng } from "@/components/motion/components/rng";
import { Capsule3D } from "@/components/motion/components/Capsule3D";

export function ParticleField({ layer, props, progress, brand, jobId, assets }: MotionComponentProps) {
  const count = Math.max(6, Math.min(120, asNumber(props.count, 48)));
  const color = asString(props.color, brandAccent(brand));
  const mode = asString(props.mode, "converge");
  // Opt-in only — hero pills belong on a separate PillHero/Capsule3D layer.
  const showCapsule = props.showCapsule === true;
  const rng = seededRng(String(props.seed ?? layer.id));
  const p = clamp01(progress);
  const t = mode === "disperse" ? p : 1 - p;
  const particles = Array.from({ length: count }, () => ({
    angle: rng() * Math.PI * 2,
    radius: 0.25 + rng() * 0.75,
    size: 2 + rng() * 5,
  }));
  const capsuleProgress = mode === "converge" ? clamp01((p - 0.15) / 0.55) : clamp01(1 - p / 0.6);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {particles.map((pt, i) => {
        const spread = 48 * t * pt.radius;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${50 + Math.cos(pt.angle) * spread}%`,
              top: `${50 + Math.sin(pt.angle) * spread}%`,
              width: pt.size,
              height: pt.size,
              borderRadius: "50%",
              background: color,
              boxShadow: `0 0 ${pt.size * 2}px ${color}`,
              opacity: mode === "disperse" ? 1 - p * 0.7 : 0.25 + (1 - t) * 0.7,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
      {showCapsule && capsuleProgress > 0 ? (
        <div style={{ position: "absolute", left: "50%", top: "50%", width: "55%", height: "70%", transform: "translate(-50%, -50%)", pointerEvents: "none" }}>
          <Capsule3D layer={layer} props={{ color, topColor: "#FFFFFF", bottomColor: color, spin: 120, float: 1 }} progress={capsuleProgress} brand={brand} jobId={jobId} assets={assets} />
        </div>
      ) : null}
    </div>
  );
}

export function GradientBlob({ layer, props, progress, brand }: MotionComponentProps) {
  const accent = asString(props.color, brandAccent(brand));
  const p = clamp01(progress);
  const x = 30 + 20 * Math.sin(p * Math.PI * 2);
  const y = 40 + 15 * Math.cos(p * Math.PI * 2);
  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          width: "70%",
          height: "70%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${hexAlpha(accent, 0.55)} 0%, transparent 70%)`,
          filter: "blur(28px)",
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
}

export function AnimatedGrid({ props, progress, brand }: MotionComponentProps) {
  const accent = asString(props.color, brandAccent(brand));
  const p = clamp01(progress);
  const offset = p * 24;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundImage: `linear-gradient(${hexAlpha(accent, 0.25)} 1px, transparent 1px), linear-gradient(90deg, ${hexAlpha(accent, 0.25)} 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
        backgroundPosition: `${offset}px ${offset}px`,
        opacity: 0.7,
      }}
    />
  );
}

export function OrbitalLines({ layer, props, progress, brand }: MotionComponentProps) {
  const accent = asString(props.color, brandAccent(brand));
  const p = clamp01(progress);
  const size = Math.min(layer.width, layer.height);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {[0.45, 0.7, 0.95].map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: size * s,
            height: size * s,
            borderRadius: "50%",
            border: `1px solid ${hexAlpha(accent, 0.35 - i * 0.08)}`,
            transform: `rotate(${p * (40 + i * 25)}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function FloatingShapes({ layer, props, progress, brand }: MotionComponentProps) {
  const rng = seededRng(layer.id + "-shapes");
  const accent = asString(props.color, brandAccent(brand));
  const p = clamp01(progress);
  const shapes = Array.from({ length: 10 }, () => ({
    x: rng() * 90,
    y: rng() * 90,
    s: 8 + rng() * 28,
    r: rng() * 360,
    round: rng() > 0.5,
  }));
  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      {shapes.map((sh, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${sh.x}%`,
            top: `${sh.y}%`,
            width: sh.s,
            height: sh.s,
            borderRadius: sh.round ? "50%" : 6,
            background: hexAlpha(accent, 0.25),
            border: `1px solid ${hexAlpha(accent, 0.45)}`,
            transform: `translateY(${Math.sin(p * Math.PI * 2 + i) * 10}px) rotate(${sh.r + p * 40}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function NoiseOverlay(_props: MotionComponentProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        opacity: 0.12,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        mixBlendMode: "overlay",
      }}
    />
  );
}

export function GlowField({ props, progress, brand }: MotionComponentProps) {
  const accent = asString(props.color, brandAccent(brand));
  const p = clamp01(progress);
  const pulse = 0.45 + 0.35 * (0.5 + 0.5 * Math.sin(p * Math.PI * 2));
  return (
    <div style={{ width: "100%", height: "100%", background: `radial-gradient(circle at 50% 45%, ${hexAlpha(accent, pulse)} 0%, transparent 60%)` }} />
  );
}

export function MeshGradient({ props, progress, brand }: MotionComponentProps) {
  const a = asString(props.color, brandAccent(brand));
  const b = asString(props.secondary, brand?.secondaryColor ?? "#1e3a5f");
  const p = clamp01(progress);
  const x = 40 + 20 * Math.sin(p * Math.PI * 2);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: `radial-gradient(circle at ${x}% 30%, ${hexAlpha(a, 0.7)}, transparent 50%), radial-gradient(circle at 70% 70%, ${hexAlpha(b, 0.7)}, transparent 45%), ${brand?.backgroundColor ?? "#0b1220"}`,
      }}
    />
  );
}

export function Aurora({ props, progress, brand }: MotionComponentProps) {
  const a = asString(props.color, brandAccent(brand));
  const p = clamp01(progress);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: `
          linear-gradient(${120 + p * 40}deg, transparent 20%, ${hexAlpha(a, 0.35)} 45%, transparent 70%),
          linear-gradient(${200 - p * 30}deg, transparent 30%, ${hexAlpha("#22d3ee", 0.25)} 55%, transparent 75%),
          ${brand?.backgroundColor ?? "#020617"}
        `,
        filter: "blur(0.2px)",
      }}
    />
  );
}

export function BlueprintGrid({ props, brand }: MotionComponentProps) {
  const accent = asString(props.color, brandAccent(brand));
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: brand?.backgroundColor ?? "#07111f",
        backgroundImage: `
          linear-gradient(${hexAlpha(accent, 0.2)} 1px, transparent 1px),
          linear-gradient(90deg, ${hexAlpha(accent, 0.2)} 1px, transparent 1px),
          linear-gradient(${hexAlpha(accent, 0.08)} 1px, transparent 1px),
          linear-gradient(90deg, ${hexAlpha(accent, 0.08)} 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px, 80px 80px, 16px 16px, 16px 16px",
      }}
    />
  );
}
