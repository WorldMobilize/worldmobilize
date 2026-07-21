"use client";

import type { JobStatus, MotionJob } from "@/lib/motion/types";

/**
 * What the user watches for the three-to-five minutes a generation takes.
 *
 * The data was always there — job.progress carries a live frame count and the
 * logs narrate every stage — but it rendered as an 11px grey monospace list
 * below a 700px empty rectangle. People read that as "nothing is happening":
 * it is the reason a stalled job and a working one looked identical.
 *
 * While the video does not exist yet, progress IS the content of this page.
 */

type Step = {
  id: string;
  label: string;
  /** Statuses during which this step is the one currently running. */
  active: JobStatus[];
  /** Statuses by which this step is finished. */
  done: JobStatus[];
};

const STEPS: Step[] = [
  {
    id: "direct",
    label: "Scrivo la regia",
    active: ["queued", "directing"],
    done: ["preparing_assets", "rendering_scenes", "composing", "ready"],
  },
  {
    id: "assets",
    label: "Preparo voce e immagini",
    active: ["preparing_assets"],
    done: ["rendering_scenes", "composing", "ready"],
  },
  {
    id: "render",
    label: "Disegno i fotogrammi",
    active: ["rendering_scenes"],
    done: ["composing", "ready"],
  },
  {
    id: "encode",
    label: "Monto il video",
    active: ["composing"],
    done: ["ready"],
  },
];

function mmss(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * `compact` is for the second half of a generation. The project appears well
 * before the video does — roughly a minute in on a real job, instantly on the
 * fixture — and rendering its 540 frames is the longest stage of all. Handing
 * the screen to the editor at that moment and dropping the progress entirely
 * left the longest wait as the one with no feedback, so the bar stays, slimmed
 * down, above the editor.
 */
export function GenerationProgress({
  job,
  nowMs,
  compact = false,
}: {
  job: MotionJob;
  nowMs: number;
  compact?: boolean;
}) {
  const elapsedSec = Math.max(0, Math.round((nowMs - job.createdAt) / 1000));
  // updatedAt moves on every log line, so a long gap is a genuine warning sign
  // rather than an artefact of a quiet stage.
  const sinceUpdateSec = Math.max(0, Math.round((nowMs - job.updatedAt) / 1000));
  const stalled = sinceUpdateSec > 90;

  const { completedScenes: done, totalScenes: total } = job.progress;
  const rendering = job.status === "rendering_scenes" && total > 0;
  const pct = rendering ? Math.min(100, Math.round((done / total) * 100)) : 0;


  if (job.status === "failed") {
    return (
      <section className="rounded-2xl border border-red-900/60 bg-red-950/20 p-6">
        <h2 className="text-base font-medium text-red-200">Non ce l&apos;ho fatta</h2>
        <p className="mt-2 text-sm text-red-300/90">{job.error ?? "Errore sconosciuto"}</p>
        <p className="mt-4 text-xs text-red-300/60">
          Il brief resta scritto qui sopra: puoi correggerlo e riprovare.
        </p>
      </section>
    );
  }

  if (compact) {
    const current = STEPS.find((s) => !s.done.includes(job.status) && s.active.includes(job.status));
    return (
      <section className="rounded-2xl border border-white/10 bg-zinc-900/60 px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-2 text-sm text-zinc-100">
            <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-100" />
            {current?.label ?? "Ci sono quasi"}
          </span>
          {rendering ? (
            <span className="text-xs tabular-nums text-zinc-500">
              {done} di {total} fotogrammi · {pct}%
            </span>
          ) : null}
          <span className="ml-auto text-xs tabular-nums text-zinc-500">{mmss(elapsedSec)}</span>
        </div>
        {rendering ? (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : null}
        {stalled ? (
          <p className="mt-2 text-xs text-amber-400">
            Nessun avanzamento da {sinceUpdateSec}s.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-medium text-zinc-100">Sto creando il tuo video</h2>
        <span className="text-xs tabular-nums text-zinc-500">
          {mmss(elapsedSec)} trascorsi · di solito 3-5 minuti
        </span>
      </div>

      <ol className="mt-5 space-y-3">
        {STEPS.map((step) => {
          const isDone = step.done.includes(job.status);
          const isActive = !isDone && step.active.includes(job.status);
          return (
            <li key={step.id} className="flex items-start gap-3">
              <span
                aria-hidden
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                  isDone
                    ? "border-emerald-500/70 bg-emerald-500/20 text-emerald-300"
                    : isActive
                      ? "animate-pulse border-zinc-300 bg-zinc-300/20 text-zinc-100"
                      : "border-zinc-700 text-transparent"
                }`}
              >
                {isDone ? "✓" : "•"}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm ${
                    isActive ? "text-zinc-100" : isDone ? "text-zinc-400" : "text-zinc-600"
                  }`}
                >
                  {step.label}
                </p>

                {isActive && rendering ? (
                  <div className="mt-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs tabular-nums text-zinc-500">
                      {done} di {total} fotogrammi · {pct}%
                    </p>
                  </div>
                ) : null}

                {/* Deliberately no raw log line here. The pipeline logs are
                    internal English ("Job created", "Director multi-agent:
                    brain gpt-5.5 + arms gpt-4o…") and putting them under a
                    plain-language step undoes the point of having one. They
                    stay one panel down, under the technical details. */}
              </div>
            </li>
          );
        })}
      </ol>

      {stalled ? (
        <p className="mt-5 rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
          Nessun avanzamento da {sinceUpdateSec}s. Può capitare sulle attese lunghe, ma se resta
          fermo conviene ricaricare e rilanciare.
        </p>
      ) : (
        <p className="mt-5 text-xs text-zinc-600">
          Puoi lasciare questa pagina aperta: il lavoro continua anche se cambi scheda.
        </p>
      )}
    </section>
  );
}
