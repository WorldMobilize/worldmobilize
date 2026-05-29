"use client";

import Link from "next/link";

type LiveEvent = {
  title: string;
  subtitle: string;
  tag: string;
};

type Highlight = {
  title: string;
  subtitle: string;
  duration: string;
};

type WarNight = {
  title: string;
  window: string;
  note: string;
};

const FEATURED_EVENTS: LiveEvent[] = [
  { title: "France attacks Italy", subtitle: "Frontline pressure surges across the Alps.", tag: "LIVE" },
  { title: "Last Stand in Rome", subtitle: "Capital defenses hold under sustained assault.", tag: "CRITICAL" },
  { title: "Reinforcements arriving", subtitle: "Allies mobilize as the border collapses.", tag: "BREAKING" },
  { title: "Capital under threat", subtitle: "Momentum swings toward the defender’s core.", tag: "ALERT" },
];

const HIGHLIGHTS: Highlight[] = [
  { title: "Rome Last Stand", subtitle: "The war room rallies in the final minutes.", duration: "0:38" },
  { title: "Belgium Reinforcement Surge", subtitle: "A sudden push turns a collapse into a fight.", duration: "0:27" },
  { title: "France Breaks The Frontline", subtitle: "A coordinated push cracks the defense.", duration: "0:42" },
  { title: "Final Minute Counterpush", subtitle: "Defenders claw back momentum at the buzzer.", duration: "0:31" },
];

const WAR_NIGHTS: WarNight[] = [
  { title: "Friday Siege Night", window: "Fri · 20:00–23:00", note: "Prime-time capital pressure." },
  { title: "Europe Conflict Window", window: "Wed · 19:00–22:00", note: "High density wars, fast rotations." },
  { title: "Capital Assault Weekend", window: "Sat–Sun · 18:00–01:00", note: "Long arcs, bigger moments." },
];

function TagPill(props: { children: string; tone?: "orange" | "cyan" | "zinc" }) {
  const tone = props.tone ?? "zinc";
  const cls =
    tone === "orange"
      ? "border-orange-400/25 bg-orange-500/10 text-orange-100"
      : tone === "cyan"
        ? "border-cyan-400/25 bg-cyan-500/10 text-cyan-100"
        : "border-white/10 bg-white/5 text-zinc-200";
  return (
    <span className={["inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", cls].join(" ")}>
      {props.children}
    </span>
  );
}

export default function TwitchLiveHubPage() {
  const channel = "brandarena_official"; // placeholder; no Twitch API yet
  const embedSrc = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=localhost`;

  return (
    <div className="arena-backdrop min-h-screen w-full max-w-[100vw] overflow-x-hidden text-zinc-100">
      <header className="border-b border-white/5 px-4 py-5 lg:px-6">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight text-zinc-100">BrandArena</div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-zinc-50">BrandArena Live</div>
            <div className="mt-1 text-sm text-zinc-300">
              Watch the wars, follow the biggest moments, and join the next global conflict.
            </div>
          </div>

          <div className="shrink-0">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-50 backdrop-blur hover:bg-cyan-500/15"
            >
              Enter the arena
            </Link>
          </div>
        </div>
      </header>

      <main className="px-4 pb-10 pt-6 lg:px-6">
        <div className="mx-auto w-full max-w-[1100px] space-y-6">
          {/* Twitch embed placeholder */}
          <section className="glass-panel overflow-hidden rounded-3xl border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/25 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <TagPill tone="orange">Official stream</TagPill>
                  <TagPill tone="zinc">Twitch</TagPill>
                </div>
                <div className="mt-2 text-sm font-semibold text-zinc-100">Live broadcast</div>
                <div className="mt-0.5 text-[11px] text-zinc-400">
                  Embedded player placeholder — add the real channel later (no integrations in MVP).
                </div>
              </div>

              <div className="shrink-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-zinc-300">
                Channel: <span className="font-semibold text-zinc-100">{channel}</span>
              </div>
            </div>

            <div className="relative aspect-video w-full bg-black">
              {/* iframe-ready structure (disabled by default in MVP to avoid parent-domain issues) */}
              <div className="absolute inset-0 grid place-items-center p-6">
                <div className="max-w-[720px] text-center">
                  <div className="text-lg font-bold text-zinc-50">Stream offline</div>
                  <div className="mt-2 text-sm text-zinc-300">
                    When we go live, this panel becomes the official broadcast. Until then, follow the event feed and
                    highlights below.
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Embed URL preview</div>
                    <div className="mt-1 break-all font-mono text-[11px] text-zinc-300">{embedSrc}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Live War Events */}
          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="glass-panel rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-orange-200/80">Live war events</div>
                  <div className="mt-1 text-sm font-semibold text-zinc-100">Featured moments</div>
                </div>
                <TagPill tone="orange">LIVE</TagPill>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {FEATURED_EVENTS.map((e) => (
                  <div
                    key={e.title}
                    className="rounded-2xl border border-white/10 bg-black/25 p-4 shadow-[0_0_40px_rgba(0,0,0,0.25)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{e.tag}</div>
                      <span className="h-2 w-2 animate-pulse rounded-full bg-orange-400" />
                    </div>
                    <div className="mt-2 text-sm font-bold text-zinc-50">{e.title}</div>
                    <div className="mt-1 text-[11px] leading-relaxed text-zinc-400">{e.subtitle}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming War Nights */}
            <div className="glass-panel rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-cyan-200/80">Upcoming war nights</div>
                  <div className="mt-1 text-sm font-semibold text-zinc-100">Schedule</div>
                </div>
                <TagPill tone="cyan">Calendar</TagPill>
              </div>

              <div className="mt-4 space-y-3">
                {WAR_NIGHTS.map((w) => (
                  <div key={w.title} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-zinc-50">{w.title}</div>
                        <div className="mt-1 text-[11px] text-zinc-400">{w.note}</div>
                      </div>
                      <div className="shrink-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] font-semibold text-zinc-200">
                        {w.window}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-[11px] text-zinc-400">
                  Times are placeholders for MVP. The live page is designed to feel like an event hub before we add real
                  streaming integrations.
                </div>
              </div>
            </div>
          </section>

          {/* Highlights grid */}
          <section className="glass-panel rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Highlights</div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">Recent clips</div>
              </div>
              <TagPill tone="zinc">Rewatch</TagPill>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {HIGHLIGHTS.map((h) => (
                <div
                  key={h.title}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-white/15 hover:bg-black/30"
                >
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="absolute -inset-24 bg-[radial-gradient(circle_at_40%_30%,rgba(34,211,238,0.18),transparent_55%)]" />
                    <div className="absolute -inset-24 bg-[radial-gradient(circle_at_70%_70%,rgba(249,115,22,0.12),transparent_55%)]" />
                  </div>

                  <div className="relative">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Highlight</div>
                      <div className="rounded-full border border-white/10 bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-zinc-200">
                        {h.duration}
                      </div>
                    </div>
                    <div className="mt-2 text-sm font-bold text-zinc-50">{h.title}</div>
                    <div className="mt-1 text-[11px] leading-relaxed text-zinc-400">{h.subtitle}</div>
                    <div className="mt-3 text-[11px] font-semibold text-cyan-100/90">Watch clip →</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Footer note */}
          <section className="rounded-3xl border border-white/10 bg-black/20 p-5 text-[11px] text-zinc-400">
            BrandArena Live is an MVP event hub. No Twitch API, OAuth, or backend — just a cinematic home for wars,
            highlights, and upcoming conflict nights.
          </section>
        </div>
      </main>
    </div>
  );
}

