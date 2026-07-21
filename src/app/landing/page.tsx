"use client";

/**
 * Kinetta — marketing landing (v1, draft).
 *
 * Isolated on /landing so it never collides with the studio workbench on `/`
 * or the shared root layout. Fully self-contained: all keyframes/utilities live
 * in the <style> block below, so no shared CSS is touched. Copy is intentionally
 * grounded in what the engine actually ships today (prompt → MotionProject →
 * browser-parity preview → narrated MP4). Palette: cyan / blue / teal (no purple).
 */

import Link from "next/link";
import { useEffect } from "react";

const STUDIO_HREF = "/"; // the workbench lives at the root today

export default function LandingPage() {
  // Lightweight scroll-reveal. Content is visible by default; JS opts into the
  // hidden-first state only after mount, so no-JS / crawlers still see everything.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".kinetta-landing");
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!("IntersectionObserver" in window) || els.length === 0) return;
    root?.classList.add("kl-reveal-ready");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="kinetta-landing relative min-h-screen overflow-hidden bg-[#07070b] text-zinc-100 antialiased">
      <style>{CSS}</style>

      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="kl-grid absolute inset-0" />
        <div className="kl-orb kl-orb-a" />
        <div className="kl-orb kl-orb-b" />
        <div className="kl-orb kl-orb-c" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>

      <Nav />

      <main className="relative">
        <Hero />
        <StylesStrip />
        <HowItWorks />
        <Features />
        <Showcase />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>

      <Footer />
    </div>
  );
}

/* ---------------------------------------------------------------- Nav */

function Nav() {
  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/landing" className="flex items-center gap-2.5">
          <Mark />
          <span className="text-[15px] font-semibold tracking-tight">Kinetta</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
          <a className="transition hover:text-white" href="#how">How it works</a>
          <a className="transition hover:text-white" href="#features">Features</a>
          <a className="transition hover:text-white" href="#pricing">Pricing</a>
          <a className="transition hover:text-white" href="#faq">FAQ</a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={STUDIO_HREF}
            className="hidden rounded-full px-4 py-2 text-sm text-zinc-300 transition hover:text-white sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href={STUDIO_HREF}
            className="kl-cta-sheen rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
          >
            Start creating
          </Link>
        </div>
      </div>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </header>
  );
}

function Mark() {
  return (
    <span className="relative grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-cyan-400 to-blue-500 shadow-[0_0_24px_-4px_rgba(34,211,238,0.7)]">
      <span className="kl-mark-spark absolute h-3.5 w-3.5 rounded-full bg-white/90" />
    </span>
  );
}

/* --------------------------------------------------------------- Hero */

function Hero() {
  return (
    <section className="relative mx-auto max-w-6xl px-5 pb-10 pt-16 sm:pt-24">
      <div className="mx-auto max-w-3xl text-center">
        <span
          data-reveal
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 backdrop-blur"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          AI motion studio · now in early access
        </span>

        <h1
          data-reveal
          style={{ ["--d" as string]: "60ms" }}
          className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
        >
          Turn a prompt into a{" "}
          <span className="kl-gradient-text">motion video</span>.
        </h1>

        <p
          data-reveal
          style={{ ["--d" as string]: "120ms" }}
          className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-zinc-400 sm:text-lg"
        >
          Kinetta&apos;s AI director writes, animates and narrates studio-grade motion
          graphics. Refine every scene right in the browser — what you preview is exactly
          what you export. No design skills needed.
        </p>

        <div
          data-reveal
          style={{ ["--d" as string]: "180ms" }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href={STUDIO_HREF}
            className="kl-cta-sheen group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
          >
            Start creating — free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="transition group-hover:translate-x-0.5">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-6 py-3 text-sm font-medium text-zinc-200 backdrop-blur transition hover:border-white/25 hover:bg-white/10"
          >
            See how it works
          </a>
        </div>

        <p data-reveal style={{ ["--d" as string]: "240ms" }} className="mt-4 text-xs text-zinc-500">
          No credit card · export your first video in minutes
        </p>
      </div>

      <div data-reveal style={{ ["--d" as string]: "300ms" }} className="mt-14">
        <ProductMock />
      </div>
    </section>
  );
}

/* Faux product screenshot — pure CSS, no image assets. */
function ProductMock() {
  // Heights (%) for the growth chart — an upward trend that matches the copy.
  const bars = [34, 48, 44, 66, 88];
  return (
    <div className="kl-mock relative mx-auto max-w-4xl">
      <div className="kl-mock-glow" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c12]/90 shadow-2xl backdrop-blur">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <div className="ml-3 flex items-center gap-2 rounded-md bg-white/5 px-2.5 py-1 text-[11px] text-zinc-400">
            <Mark2 />
            kinetta · studio
          </div>
          <span className="ml-auto rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-medium text-zinc-200">
            Export MP4
          </span>
        </div>

        <div className="grid gap-0 sm:grid-cols-[1fr_220px]">
          {/* canvas / preview */}
          <div className="relative min-h-[260px] overflow-hidden bg-[radial-gradient(120%_120%_at_20%_0%,#0b1e33_0%,#080810_55%)] p-6">
            <div className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="relative z-10 flex h-full items-start justify-between gap-6">
              <div className="max-w-[56%]">
                <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-300/80">Scene 02</div>
                <div className="mt-2 text-2xl font-semibold leading-tight text-white sm:text-3xl">
                  Growth that speaks for itself
                </div>
                <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-zinc-400">Monthly revenue</div>
                    <div className="kl-count text-xl font-semibold text-white">€128,400</div>
                  </div>
                  <div className="rounded-md bg-emerald-400/15 px-2 py-1 text-[11px] font-medium text-emerald-300">
                    +32%
                  </div>
                </div>
              </div>

              {/* Animated growth chart — reads clearly as data motion */}
              <div className="relative hidden h-[150px] w-[190px] shrink-0 sm:block">
                <div className="absolute inset-x-0 bottom-6 top-0 flex items-end justify-between gap-2.5">
                  {bars.map((h, i) => (
                    <div key={i} className="relative flex h-full flex-1 items-end">
                      <div
                        className="kl-bar w-full rounded-t-md bg-gradient-to-t from-blue-500/70 via-cyan-400/80 to-cyan-300"
                        style={{ height: `${h}%`, ["--bd" as string]: `${i * 140}ms` }}
                      />
                    </div>
                  ))}
                </div>
                {/* baseline + axis labels */}
                <div className="absolute inset-x-0 bottom-6 h-px bg-white/15" />
                <div className="absolute inset-x-0 bottom-0 flex justify-between text-[9px] text-zinc-500">
                  <span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span><span>Q5</span>
                </div>
                <div className="absolute -right-1 top-1 rounded bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300">
                  ↑ trend
                </div>
              </div>
            </div>
          </div>

          {/* editor rail */}
          <div className="hidden border-l border-white/8 bg-[#0a0a10] p-4 sm:block">
            <div className="text-[11px] font-medium text-zinc-400">Scenes</div>
            <div className="mt-3 space-y-2">
              {["Intro hook", "Metric reveal", "Product shot", "Call to action"].map((s, i) => (
                <div
                  key={s}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] ${
                    i === 1
                      ? "border-cyan-400/40 bg-cyan-500/10 text-white"
                      : "border-white/8 bg-white/[0.03] text-zinc-400"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${i === 1 ? "bg-cyan-400" : "bg-zinc-600"}`} />
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* timeline */}
        <div className="relative border-t border-white/8 bg-[#08080d] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500">0:00</span>
            <div className="relative h-8 flex-1 overflow-hidden rounded-md bg-white/[0.04]">
              <div className="absolute inset-y-1 left-[2%] w-[22%] rounded bg-gradient-to-r from-cyan-500/50 to-cyan-500/20" />
              <div className="absolute inset-y-1 left-[26%] w-[28%] rounded bg-gradient-to-r from-sky-500/50 to-sky-500/20" />
              <div className="absolute inset-y-1 left-[56%] w-[20%] rounded bg-gradient-to-r from-teal-500/50 to-teal-500/20" />
              <div className="absolute inset-y-1 left-[78%] w-[18%] rounded bg-gradient-to-r from-blue-500/50 to-blue-500/20" />
              <div className="kl-playhead absolute inset-y-0 w-px bg-white/80 shadow-[0_0_8px_2px_rgba(255,255,255,0.4)]" />
            </div>
            <span className="text-[11px] text-zinc-500">0:24</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Mark2() {
  return <span className="h-3 w-3 rounded-[4px] bg-gradient-to-br from-cyan-400 to-blue-500" />;
}

/* ------------------------------------------------------- Styles strip */

const STYLES = [
  "Explainers",
  "Product demos",
  "Ad creatives",
  "Social shorts",
  "Data stories",
  "Launch videos",
  "Onboarding",
  "Pitch decks",
];

function StylesStrip() {
  return (
    <section className="relative border-y border-white/6 py-8">
      <p className="mb-5 text-center text-xs uppercase tracking-[0.25em] text-zinc-500">
        One prompt. Any format.
      </p>
      <div className="kl-marquee-mask relative overflow-hidden">
        <div className="kl-marquee flex w-max gap-3">
          {[...STYLES, ...STYLES].map((s, i) => (
            <span
              key={`${s}-${i}`}
              className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-300"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- How it works */

const STEPS = [
  {
    n: "01",
    title: "Describe it",
    body: "Type what you want — scenes, data, tone, aspect ratio. The AI director turns your brief into a fully structured motion project.",
  },
  {
    n: "02",
    title: "Preview & refine",
    body: "Watch it play live in the browser and scrub the timeline. Edit any scene, layer, text or animation — the preview is the render.",
  },
  {
    n: "03",
    title: "Narrate & export",
    body: "Add AI narration in 30+ languages, then export a clean MP4 in 16:9, 9:16 or 1:1. Ready to publish anywhere.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="relative mx-auto max-w-6xl px-5 py-24">
      <SectionHead
        eyebrow="How it works"
        title="From idea to finished video in three steps"
        sub="No timelines to wrangle from scratch, no motion-design degree required."
      />
      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <div
            key={s.n}
            data-reveal
            style={{ ["--d" as string]: `${i * 90}ms` }}
            className="kl-card group relative rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >
            <div className="kl-gradient-text text-4xl font-semibold tracking-tight">{s.n}</div>
            <h3 className="mt-4 text-lg font-semibold text-white">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.body}</p>
            {i < STEPS.length - 1 && (
              <div className="absolute -right-2 top-1/2 hidden h-px w-4 bg-white/15 md:block" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Features */

const FEATURES = [
  {
    title: "AI motion director",
    body: "A multi-agent director plans structure, layout, copy and animation — then assembles a complete, editable project.",
    icon: IconSpark,
  },
  {
    title: "Browser-parity preview",
    body: "The live preview uses the exact same renderer as the final export. What you see is precisely what you get.",
    icon: IconEye,
  },
  {
    title: "Timeline scene editor",
    body: "Scrub, reorder and fine-tune every scene and layer. Change text, animation presets and timing in real time.",
    icon: IconLayers,
  },
  {
    title: "AI narration",
    body: "Studio-quality voiceover in 30+ languages, timed to your scenes and baked straight into the MP4.",
    icon: IconWave,
  },
  {
    title: "Motion component library",
    body: "KPI tiles, pricing cards, device mockups, charts and more — production-ready blocks the director composes for you.",
    icon: IconGrid,
  },
  {
    title: "Every aspect ratio",
    body: "Export in 16:9, 9:16 or 1:1 without redoing the work. One project, ready for every platform.",
    icon: IconFrame,
  },
];

function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl px-5 py-24">
      <SectionHead
        eyebrow="Features"
        title="A real studio, powered by AI"
        sub="Everything you need to go from a sentence to a polished, on-brand motion video."
      />
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              data-reveal
              style={{ ["--d" as string]: `${(i % 3) * 80}ms` }}
              className="kl-card group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-cyan-500/20 to-blue-400/10 text-cyan-200">
                <Icon />
              </div>
              <h3 className="text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Showcase */

function Showcase() {
  return (
    <section className="relative mx-auto max-w-6xl px-5 py-24">
      <div
        data-reveal
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.01] p-8 sm:p-12"
      >
        <div className="kl-orb kl-orb-show" aria-hidden />
        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHead
              align="left"
              eyebrow="Made for every channel"
              title="One project, every format"
              sub="Design once and let Kinetta reflow your scenes for landscape, vertical and square — pixel-perfect, every time."
            />
            <Link
              href={STUDIO_HREF}
              className="kl-cta-sheen mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
            >
              Try the studio
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

          <div className="flex items-end justify-center gap-4">
            <RatioCard label="16:9" className="aspect-video w-full max-w-[220px]" />
            <RatioCard label="9:16" className="aspect-[9/16] w-[92px]" featured />
            <RatioCard label="1:1" className="aspect-square w-[110px]" />
          </div>
        </div>
      </div>
    </section>
  );
}

function RatioCard({ label, className, featured }: { label: string; className?: string; featured?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${
        featured ? "border-cyan-400/40 shadow-[0_0_40px_-12px_rgba(34,211,238,0.55)]" : "border-white/12"
      } bg-[radial-gradient(120%_120%_at_30%_0%,#0e2036_0%,#0b0b14_60%)] ${className ?? ""}`}
    >
      <div className="kl-float absolute right-3 top-3 h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400/70 to-blue-500/50" />
      <div className="absolute bottom-3 left-3 right-3">
        <div className="h-1.5 w-2/3 rounded-full bg-white/70" />
        <div className="mt-1.5 h-1.5 w-1/2 rounded-full bg-white/25" />
      </div>
      <span className="absolute right-2 top-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white/80">
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------- Pricing */

const PLANS = [
  {
    name: "Starter",
    price: "€0",
    period: "/mo",
    tagline: "Kick the tires",
    features: ["Up to 3 projects", "720p exports", "Watermark", "Community support"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    price: "€29",
    period: "/mo",
    tagline: "For solo creators",
    features: ["Unlimited projects", "1080p exports", "AI narration", "No watermark", "Priority rendering"],
    cta: "Go Pro",
    featured: true,
  },
  {
    name: "Studio",
    price: "€99",
    period: "/mo",
    tagline: "For teams & agencies",
    features: ["Everything in Pro", "4K exports", "Brand kits", "API access", "Priority support"],
    cta: "Get Studio",
    featured: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="relative mx-auto max-w-6xl px-5 py-24">
      <SectionHead
        eyebrow="Pricing"
        title="Simple plans that scale with you"
        sub="Start free. Upgrade when you're shipping videos every week."
      />
      <div className="mt-14 grid gap-4 lg:grid-cols-3">
        {PLANS.map((p, i) => (
          <div
            key={p.name}
            data-reveal
            style={{ ["--d" as string]: `${i * 90}ms` }}
            className={`relative flex flex-col rounded-2xl border p-7 ${
              p.featured
                ? "border-cyan-400/40 bg-gradient-to-b from-cyan-500/10 to-white/[0.02] shadow-[0_0_60px_-24px_rgba(34,211,238,0.75)]"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            {p.featured && (
              <span className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-3 py-1 text-[11px] font-semibold text-zinc-950">
                Most popular
              </span>
            )}
            <div className="text-sm font-medium text-zinc-300">{p.name}</div>
            <div className="mt-1 text-xs text-zinc-500">{p.tagline}</div>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight text-white">{p.price}</span>
              <span className="text-sm text-zinc-500">{p.period}</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-zinc-300">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-cyan-300">
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={STUDIO_HREF}
              className={`mt-8 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition ${
                p.featured
                  ? "kl-cta-sheen bg-white text-zinc-950 hover:bg-zinc-200"
                  : "border border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
              }`}
            >
              {p.cta}
            </Link>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-zinc-600">
        Prices are indicative and being finalized during early access.
      </p>
    </section>
  );
}

/* ----------------------------------------------------------------- FAQ */

const FAQS = [
  {
    q: "Do I need design or video editing experience?",
    a: "No. You describe what you want in plain language and the AI director builds a complete, structured motion project. You only step in to refine — everything is visual and drag-free.",
  },
  {
    q: "Is the preview the same as the final export?",
    a: "Yes. Kinetta renders the browser preview with the exact same engine as the exported MP4, so there are no surprises between what you see and what you ship.",
  },
  {
    q: "What formats can I export?",
    a: "MP4 in 16:9, 9:16 and 1:1. The same project reflows to each aspect ratio, so you can publish to YouTube, Reels, TikTok and feeds without rebuilding.",
  },
  {
    q: "Can I add a voiceover?",
    a: "Yes — AI narration in 30+ languages, automatically timed to your scenes and mixed into the final video.",
  },
  {
    q: "Can I edit individual scenes?",
    a: "Absolutely. Scrub the timeline, select any scene or layer, and adjust text, timing and animation presets. You can also re-render a single scene without redoing the whole video.",
  },
];

function Faq() {
  return (
    <section id="faq" className="relative mx-auto max-w-3xl px-5 py-24">
      <SectionHead eyebrow="FAQ" title="Questions, answered" />
      <div className="mt-12 divide-y divide-white/8 border-y border-white/8">
        {FAQS.map((f) => (
          <details key={f.q} className="kl-faq group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-[15px] font-medium text-white">
              {f.q}
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/15 text-zinc-400 transition group-open:rotate-45 group-open:border-cyan-400/50 group-open:text-cyan-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
            </summary>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Final CTA */

function FinalCta() {
  return (
    <section className="relative mx-auto max-w-6xl px-5 pb-28">
      <div
        data-reveal
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/20 via-cyan-600/10 to-teal-500/10 px-8 py-16 text-center sm:py-20"
      >
        <div className="kl-orb kl-orb-cta" aria-hidden />
        <h2 className="relative mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Your next video is one sentence away
        </h2>
        <p className="relative mx-auto mt-4 max-w-lg text-sm text-zinc-300 sm:text-base">
          Describe it, preview it, export it. Kinetta handles the motion so you can focus on the message.
        </p>
        <div className="relative mt-8 flex justify-center">
          <Link
            href={STUDIO_HREF}
            className="kl-cta-sheen inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            Start creating — free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- Footer */

function Footer() {
  return (
    <footer className="relative border-t border-white/8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <Mark />
          <span className="text-sm font-semibold tracking-tight">Kinetta</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-500">
          <a className="transition hover:text-white" href="#features">Features</a>
          <a className="transition hover:text-white" href="#pricing">Pricing</a>
          <a className="transition hover:text-white" href="#faq">FAQ</a>
          <Link className="transition hover:text-white" href={STUDIO_HREF}>Studio</Link>
        </nav>
        <p className="text-xs text-zinc-600">© {new Date().getFullYear()} Kinetta. All rights reserved.</p>
      </div>
    </footer>
  );
}

/* --------------------------------------------------------- Shared bits */

function SectionHead({
  eyebrow,
  title,
  sub,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  align?: "center" | "left";
}) {
  const alignCls = align === "center" ? "mx-auto text-center" : "text-left";
  return (
    <div data-reveal className={`max-w-2xl ${alignCls}`}>
      <span className="text-xs font-medium uppercase tracking-[0.25em] text-cyan-300/80">{eyebrow}</span>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-pretty text-sm leading-relaxed text-zinc-400 sm:text-base">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------- Icons */

function IconSpark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconLayers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="m12 3 9 5-9 5-9-5 9-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m3 13 9 5 9-5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
function IconWave() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 12h1M8 8v8M12 5v14M16 8v8M20 12h0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconGrid() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function IconFrame() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18M8 6v12" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
    </svg>
  );
}

/* -------------------------------------------------------------- Styles */

const CSS = `
.kinetta-landing { --accent: #22d3ee; --accent-2: #38bdf8; }

.kl-gradient-text {
  background: linear-gradient(100deg, #38bdf8 0%, #22d3ee 45%, #2dd4bf 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}

.kl-grid {
  background-image:
    linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(120% 80% at 50% 0%, #000 0%, transparent 70%);
  -webkit-mask-image: radial-gradient(120% 80% at 50% 0%, #000 0%, transparent 70%);
}

.kl-orb { position: absolute; border-radius: 9999px; filter: blur(80px); opacity: 0.5; }
.kl-orb-a { top: -120px; left: 8%; width: 420px; height: 420px; background: radial-gradient(circle, #2563eb 0%, transparent 70%); animation: kl-drift 18s ease-in-out infinite; }
.kl-orb-b { top: 120px; right: 4%; width: 360px; height: 360px; background: radial-gradient(circle, #0891b2 0%, transparent 70%); animation: kl-drift 22s ease-in-out infinite reverse; }
.kl-orb-c { top: 640px; left: 40%; width: 300px; height: 300px; background: radial-gradient(circle, #14b8a6 0%, transparent 70%); opacity: 0.28; animation: kl-drift 26s ease-in-out infinite; }
.kl-orb-show { top: -60px; right: -40px; width: 340px; height: 340px; background: radial-gradient(circle, rgba(34,211,238,0.45) 0%, transparent 70%); filter: blur(70px); }
.kl-orb-cta { top: 50%; left: 50%; width: 520px; height: 320px; transform: translate(-50%,-50%); background: radial-gradient(circle, rgba(34,211,238,0.3) 0%, transparent 70%); filter: blur(70px); }

@keyframes kl-drift {
  0%, 100% { transform: translate(0,0) scale(1); }
  50% { transform: translate(30px, 24px) scale(1.08); }
}

.kl-mock-glow {
  position: absolute; inset: -1px -1px auto -1px; height: 40%;
  background: linear-gradient(180deg, rgba(34,211,238,0.22), transparent);
  filter: blur(30px); z-index: -1;
}
.kl-mock { transform: perspective(1400px) rotateX(2deg); }

.kl-float { animation: kl-float 6s ease-in-out infinite; }
@keyframes kl-float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-12px) rotate(4deg); }
}

.kl-bar { transform-origin: bottom; animation: kl-grow 900ms cubic-bezier(.2,.8,.2,1) both; animation-delay: var(--bd, 0ms); }
@keyframes kl-grow { from { transform: scaleY(0); opacity: 0.35; } to { transform: scaleY(1); opacity: 1; } }

.kl-playhead { animation: kl-play 6s linear infinite; }
@keyframes kl-play {
  0% { left: 2%; } 100% { left: 96%; }
}

.kl-mark-spark { animation: kl-pulse 3s ease-in-out infinite; }
@keyframes kl-pulse {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(0.7); opacity: 0.6; }
}

.kl-marquee-mask {
  mask-image: linear-gradient(to right, transparent, #000 10%, #000 90%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, #000 10%, #000 90%, transparent);
}
.kl-marquee { animation: kl-marquee 32s linear infinite; }
@keyframes kl-marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.kl-card { transition: transform .3s ease, border-color .3s ease, background-color .3s ease; }
.kl-card:hover { transform: translateY(-3px); border-color: rgba(255,255,255,0.2); background-color: rgba(255,255,255,0.05); }

.kl-cta-sheen { position: relative; overflow: hidden; }
.kl-cta-sheen::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%);
  transform: translateX(-120%); transition: transform .7s ease;
}
.kl-cta-sheen:hover::after { transform: translateX(120%); }

.kl-faq summary::-webkit-details-marker { display: none; }

.kl-reveal-ready [data-reveal] {
  opacity: 0; transform: translateY(18px);
  transition: opacity .7s cubic-bezier(.2,.7,.2,1) var(--d, 0ms), transform .7s cubic-bezier(.2,.7,.2,1) var(--d, 0ms);
  will-change: opacity, transform;
}
.kl-reveal-ready [data-reveal].is-visible { opacity: 1; transform: none; }

@media (prefers-reduced-motion: reduce) {
  .kl-orb, .kl-float, .kl-playhead, .kl-mark-spark, .kl-marquee, .kl-bar { animation: none !important; }
  .kl-bar { transform: none !important; }
  .kl-reveal-ready [data-reveal] { opacity: 1 !important; transform: none !important; transition: none !important; }
  .kl-mock { transform: none; }
}
`;
