import type { AspectRatio, MotionProject } from "@/lib/motion/types";
import { formatForAspect, normalizeMotionProject } from "@/lib/motion/validate";

/**
 * DTCPill acceptance fixture — a deterministic 6-scene MotionProject that
 * exercises every headline feature of the rewrite: all component types
 * (ParticleField, MetricCard w/ countUp, BookCoverStream, BrandChip, ChatDemo,
 * LogoLockup), animated per-scene cameras, and the full transition set
 * (whipLeft/whipRight/zoom/slideLeft/fade/cut). No AI, no paid providers.
 *
 * Used by the dev fixture path and the integration test that proves the
 * pipeline resolves and exports without regressions.
 */
export function createDtcpillFixture(opts: {
  jobId: string;
  aspectRatio?: AspectRatio;
  voiceoverEnabled?: boolean;
}): MotionProject {
  const aspect = opts.aspectRatio ?? "16:9";
  const size = formatForAspect(aspect);
  const W = size.width;
  const H = size.height;
  const voiceOn = opts.voiceoverEnabled === true;

  const brand = {
    primaryColor: "#7c3aed",
    secondaryColor: "#0f0720",
    backgroundColor: "#0a0514",
    foregroundColor: "#f5f3ff",
    accentColor: "#a855f7",
    fontFamily: "Inter",
    style: "futuristic" as const,
    cornerRadius: 20,
  };

  const raw = {
    version: 1 as const,
    id: opts.jobId,
    title: "dtcpill",
    description: "Your unfair advantage in DTC.",
    format: { ...size, fps: 30, aspectRatio: aspect },
    durationSec: 18,
    brand,
    audio: {
      voiceover: {
        enabled: voiceOn,
        script: voiceOn
          ? "1,400 marketing secrets. One pill. Real DTC brand breakdowns, distilled. Ask anything, get the exact framework. Your unfair advantage in DTC."
          : "",
        provider: "elevenlabs" as const,
      },
    },
    scenes: [
      // Scene 1 — particle materialize + slam-in headline, camera push-in.
      {
        id: "scene_01",
        name: "Hook",
        purpose: "Capsule materializes from particles",
        startSec: 0,
        durationSec: 3,
        narration: voiceOn ? "1,400 marketing secrets. One pill." : "",
        background: { type: "gradient" as const, from: "#0a0514", to: "#2a1055", angle: 160 },
        camera: {
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          animations: [
            {
              property: "scale" as const,
              keyframes: [
                { time: 0, value: 1, easing: "easeOut" as const },
                { time: 2.9, value: 1.12, easing: "easeInOut" as const },
              ],
            },
          ],
        },
        layers: [
          {
            id: "particles",
            name: "Particle field",
            type: "component" as const,
            component: "ParticleField",
            // Atmosphere only, full-bleed: the hero pill is its own PillHero layer.
            props: { mode: "converge", count: 64, color: "#a855f7", seed: "dtcpill", showCapsule: false },
            startSec: 0,
            durationSec: 3,
            x: 0,
            y: 0,
            width: W,
            height: H,
            opacity: 1,
            rotation: 0,
            scale: 1,
            zIndex: 1,
            animations: [],
          },
          {
            id: "hero_pill",
            name: "Hero Pill",
            type: "component" as const,
            component: "PillHero",
            props: {
              topColor: "#FFFFFF",
              bottomColor: "#a855f7",
              color: "#a855f7",
              spin: 120,
              float: 1,
              tilt: 18,
            },
            startSec: 0,
            durationSec: 3,
            x: (W - Math.min(W, H) * 0.28) / 2,
            y: (H - Math.min(W, H) * 0.28) / 2,
            width: Math.min(W, H) * 0.28,
            height: Math.min(W, H) * 0.28,
            opacity: 1,
            rotation: 0,
            scale: 1,
            zIndex: 5,
            animations: [],
            animationPreset: "scaleIn" as const,
          },
          {
            id: "hook_text",
            name: "Headline",
            type: "text" as const,
            text: "1,400+ marketing secrets.\nOne pill.",
            fontSize: 68,
            fontWeight: 800,
            color: "#f5f3ff",
            align: "center" as const,
            startSec: 0.8,
            durationSec: 2.2,
            x: W * 0.1,
            y: H * 0.62,
            width: W * 0.8,
            height: 180,
            opacity: 1,
            rotation: 0,
            scale: 1,
            zIndex: 2,
            animations: [],
            animationPreset: "scaleIn",
          },
        ],
        transitionOut: { type: "whipLeft" as const, durationSec: 0.4 },
      },
      // Scene 2 — five metric cards with count-up.
      {
        id: "scene_02",
        name: "Categories",
        purpose: "Category cards with animated counters",
        startSec: 3,
        durationSec: 3.5,
        narration: "",
        background: { type: "solid" as const, color: "#0a0514" },
        camera: { x: 0, y: 0, scale: 1, rotation: 0, animations: [] },
        layers: [
          metric("m1", "Copywriting", "764", 0.05, W * 0.03, W, H),
          metric("m2", "Marketing", "453", 0.15, W * 0.213, W, H),
          metric("m3", "Psychology", "106", 0.25, W * 0.396, W, H),
          metric("m4", "Design", "66", 0.35, W * 0.579, W, H),
          metric("m5", "Case Studies", "29", 0.45, W * 0.762, W, H),
        ],
        transitionOut: { type: "whipRight" as const, durationSec: 0.4 },
      },
      // Scene 3 — book/course cover stream with motion blur.
      {
        id: "scene_03",
        name: "Library",
        purpose: "Streaming book covers",
        startSec: 6.5,
        durationSec: 3,
        narration: "",
        background: { type: "gradient" as const, from: "#130826", to: "#0a0514", angle: 120 },
        layers: [
          {
            id: "stream",
            name: "Cover stream",
            type: "component" as const,
            component: "BookCoverStream",
            props: {
              titles: [
                "Breakthrough Advertising",
                "$100M Leads",
                "Cashvertising",
                "Influence",
                "Ecom Playbook",
              ],
              seed: "covers",
            },
            startSec: 0,
            durationSec: 3,
            x: 0,
            y: H * 0.28,
            width: W,
            height: H * 0.44,
            opacity: 1,
            rotation: 0,
            scale: 1,
            zIndex: 1,
            animations: [],
          },
          {
            id: "stream_caption",
            name: "Caption",
            type: "text" as const,
            text: "100+ courses & books, distilled.",
            fontSize: 40,
            fontWeight: 700,
            color: "#f5f3ff",
            align: "center" as const,
            startSec: 0.3,
            durationSec: 2.7,
            x: W * 0.1,
            y: H * 0.8,
            width: W * 0.8,
            height: 60,
            opacity: 1,
            rotation: 0,
            scale: 1,
            zIndex: 2,
            animations: [],
            animationPreset: "fadeIn",
          },
        ],
        transitionOut: { type: "slideLeft" as const, durationSec: 0.4 },
      },
      // Scene 4 — brand chips grid.
      {
        id: "scene_04",
        name: "Brands",
        purpose: "DTC brand chips",
        startSec: 9.5,
        durationSec: 2.5,
        narration: "",
        background: { type: "solid" as const, color: "#0a0514" },
        layers: [
          chip("b1", "Gymshark", 0.05, W * 0.08, H * 0.32, W, H),
          chip("b2", "Liquid Death", 0.12, W * 0.38, H * 0.32, W, H),
          chip("b3", "Glossier", 0.19, W * 0.68, H * 0.32, W, H),
          chip("b4", "SKIMS", 0.26, W * 0.23, H * 0.52, W, H),
          chip("b5", "Dr. Squatch", 0.33, W * 0.53, H * 0.52, W, H),
          {
            id: "brands_caption",
            name: "Caption",
            type: "text" as const,
            text: "Real DTC brand breakdowns.",
            fontSize: 38,
            fontWeight: 700,
            color: "#f5f3ff",
            align: "center" as const,
            startSec: 0.4,
            durationSec: 2.1,
            x: W * 0.1,
            y: H * 0.74,
            width: W * 0.8,
            height: 56,
            opacity: 1,
            rotation: 0,
            scale: 1,
            zIndex: 3,
            animations: [],
            animationPreset: "slideUp",
          },
        ],
        transitionOut: { type: "zoom" as const, durationSec: 0.4 },
      },
      // Scene 5 — chat demo with streamed answer + sources.
      {
        id: "scene_05",
        name: "Ask",
        purpose: "Chat interface answer with sources",
        startSec: 12,
        durationSec: 3.5,
        narration: "",
        background: { type: "gradient" as const, from: "#0a0514", to: "#1a0b33", angle: 150 },
        layers: [
          {
            id: "chat",
            name: "Chat demo",
            type: "component" as const,
            component: "ChatDemo",
            props: {
              question: "What's the best hook for a DTC skincare launch?",
              answer:
                "Lead with the transformation, not the ingredients. Open on the before/after, then stack proof.",
              sources: ["Breakthrough Advertising", "Glossier teardown", "$100M Offers"],
            },
            startSec: 0.1,
            durationSec: 3.4,
            x: W * 0.2,
            y: H * 0.12,
            width: W * 0.6,
            height: H * 0.72,
            opacity: 1,
            rotation: 0,
            scale: 1,
            zIndex: 1,
            animations: [],
            animationPreset: "slideUp",
          },
        ],
        transitionOut: { type: "fade" as const, durationSec: 0.4 },
      },
      // Scene 6 — logo lockup end card with glow pulse.
      {
        id: "scene_06",
        name: "End card",
        purpose: "Logo lockup + tagline",
        startSec: 15.5,
        durationSec: 2.5,
        narration: voiceOn ? "Your unfair advantage in DTC." : "",
        background: { type: "gradient" as const, from: "#0a0514", to: "#2a1055", angle: 140 },
        layers: [
          {
            id: "lockup",
            name: "Logo lockup",
            type: "component" as const,
            component: "LogoLockup",
            props: {
              logo: "capsule",
              wordmark: "dtcpill",
              tagline: "Your unfair advantage in DTC.",
              color: "#a855f7",
            },
            startSec: 0.1,
            durationSec: 2.4,
            x: W * 0.2,
            y: H * 0.28,
            width: W * 0.6,
            height: H * 0.44,
            opacity: 1,
            rotation: 0,
            scale: 1,
            zIndex: 1,
            animations: [],
            animationPreset: "scaleIn",
          },
        ],
        transitionOut: { type: "cut" as const, durationSec: 0 },
      },
    ],
  };

  return normalizeMotionProject(raw, { jobId: opts.jobId, aspectRatio: aspect });
}

function metric(
  id: string,
  label: string,
  value: string,
  delay: number,
  x: number,
  W: number,
  H: number,
) {
  return {
    id,
    name: label,
    type: "component" as const,
    component: "MetricCard",
    props: { label, value, accent: "#a855f7" },
    startSec: 0.1 + delay,
    durationSec: 3.2 - delay,
    x,
    y: H * 0.28,
    width: W * 0.175,
    height: H * 0.38,
    opacity: 1,
    rotation: 0,
    scale: 1,
    zIndex: 1,
    animations: [],
    animationPreset: "staggeredCardReveal",
  };
}

function chip(
  id: string,
  label: string,
  delay: number,
  x: number,
  y: number,
  W: number,
  H: number,
) {
  return {
    id,
    name: label,
    type: "component" as const,
    component: "BrandChip",
    props: { label, color: "#a855f7" },
    startSec: 0.1 + delay,
    durationSec: 2.3 - delay,
    x,
    y,
    width: W * 0.24,
    height: H * 0.12,
    opacity: 1,
    rotation: 0,
    scale: 1,
    zIndex: 2,
    animations: [],
    animationPreset: "scaleIn",
  };
}
