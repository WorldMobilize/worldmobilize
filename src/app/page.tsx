"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MotionPlayer, type MotionPlayerHandle } from "@/components/motion/MotionPlayer";
import { LayerInspector } from "@/components/editor/LayerInspector";
import { ProjectTimeline } from "@/components/editor/ProjectTimeline";
import type { AspectRatio, JobStatus, MotionJob, MotionLayer, MotionScene } from "@/lib/motion/types";

const STATUS_LABEL: Record<JobStatus, string> = {
  queued: "In coda…",
  directing: "Director IA…",
  preparing_assets: "Preparazione…",
  rendering_scenes: "Render scene…",
  composing: "Composizione…",
  ready: "Pronto",
  failed: "Errore",
};

const EXAMPLE_PROMPT = `Scene 1 (0–3s): A glowing capsule/pill icon materializes from particles in the center. Bold text slams in: "1,400+ marketing secrets. One pill."

Scene 2 (3–7s): Five category cards fly in and stack, each with a counter ticking up: Copywriting 764 · Marketing 453 · Psychology 106 · Design 66 · Case Studies 29.

Scene 3 (7–11s): A stream of book/course covers rushes past with motion blur — overlay: "100+ courses & books, distilled."

Scene 4 (11–14s): Brand chips pop in a grid: Gymshark, Liquid Death, Glossier, SKIMS — overlay: "Real DTC brand breakdowns."

Scene 5 (14–18s): A chat mockup: a user asks, an answer streams in with cited sources. Overlay: "Ask anything. Get the exact framework."

Final: capsule logo + "dtcpill" wordmark, tagline "Your unfair advantage in DTC." Subtle glow pulse.

Camera: dynamic push-ins and whip pans, premium tech-brand feel.`;

function layerLabel(layer: MotionLayer): string {
  if (layer.type === "text") return `“${layer.text.slice(0, 24)}”`;
  if (layer.type === "image") return layer.assetId.replace("builtin:", "");
  if (layer.type === "component") return layer.component;
  return layer.shape;
}

export default function Home() {
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPT);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [localDemo, setLocalDemo] = useState(false);
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(false);
  const [job, setJob] = useState<MotionJob | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const pollRef = useRef<number | null>(null);
  const playerRef = useRef<MotionPlayerHandle | null>(null);

  const project = job?.project ?? null;

  useEffect(() => {
    if (!job || job.status === "ready" || job.status === "failed") return;
    const t = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [job?.id, job?.status]);

  const stopPolling = useCallback(() => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startPolling = useCallback(
    (id: string) => {
      stopPolling();
      pollRef.current = window.setInterval(async () => {
        try {
          const res = await fetch(`/api/jobs/${id}`);
          if (!res.ok) return;
          const next = (await res.json()) as MotionJob;
          setJob(next);
          const firstScene = next.project?.scenes[0]?.id ?? null;
          setSelectedSceneId((prev) =>
            prev && next.project?.scenes.some((s) => s.id === prev) ? prev : firstScene,
          );
          if (next.status === "ready" || next.status === "failed") {
            stopPolling();
            setSubmitting(false);
          }
        } catch {
          /* keep polling */
        }
      }, 800);
    },
    [stopPolling],
  );

  const generateVideo = async () => {
    const brief = prompt.trim();
    if (!brief && !localDemo) {
      setError("Scrivi un prompt o attiva la demo locale");
      return;
    }
    setSubmitting(true);
    setError(null);
    setJob(null);
    setSelectedSceneId(null);
    setSelectedLayerId(null);
    stopPolling();
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: brief, aspectRatio, localDemo, voiceoverEnabled }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Generazione fallita");
      }
      const { id } = (await res.json()) as { id: string };
      startPolling(id);
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Errore");
    }
  };

  const patchProject = async (body: Record<string, unknown>) => {
    if (!job) return;
    const res = await fetch(`/api/jobs/${job.id}/project`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Modifica fallita");
      return;
    }
    const data = (await res.json()) as { project: MotionJob["project"] };
    setJob((prev) => (prev ? { ...prev, project: data.project } : prev));
  };

  const onRerender = async () => {
    if (!job) return;
    setSubmitting(true);
    setError(null);
    await fetch(`/api/jobs/${job.id}/render`, { method: "POST" });
    startPolling(job.id);
  };

  const [scenePreviewUrl, setScenePreviewUrl] = useState<string | null>(null);
  const [renderingScene, setRenderingScene] = useState(false);
  const onRenderScene = async (sceneId: string) => {
    if (!job) return;
    setRenderingScene(true);
    setError(null);
    setScenePreviewUrl(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/render-scene/${sceneId}`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as
        | { outputUrl?: string; error?: string }
        | null;
      if (!res.ok || !data?.outputUrl) {
        throw new Error(data?.error ?? "Render scena fallito");
      }
      setScenePreviewUrl(`${data.outputUrl}?t=${Date.now()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setRenderingScene(false);
    }
  };

  const scene: MotionScene | null =
    project?.scenes.find((s) => s.id === selectedSceneId) ?? project?.scenes[0] ?? null;

  const selectedLayer: MotionLayer | null =
    scene?.layers.find((l) => l.id === selectedLayerId) ?? null;

  const bgColors = useMemo(() => {
    const bg = scene?.background;
    if (bg?.type === "gradient") return { from: bg.from, to: bg.to };
    if (bg?.type === "solid") return { from: bg.color, to: bg.color };
    return { from: "#0b1220", to: "#1e3a5f" };
  }, [scene]);

  const onSelectLayer = (layerId: string) => {
    const owner = project?.scenes.find((s) => s.layers.some((l) => l.id === layerId));
    if (owner) setSelectedSceneId(owner.id);
    setSelectedLayerId(layerId);
  };

  const onPatchLayer = (layerId: string, patch: Record<string, unknown>) => {
    if (!scene) return;
    void patchProject({ sceneId: scene.id, layerId, layerPatch: patch });
  };

  const onDeleteLayer = (layerId: string) => {
    if (!scene) return;
    if (selectedLayerId === layerId) setSelectedLayerId(null);
    void patchProject({ sceneId: scene.id, layerId, deleteLayer: true });
  };

  const onPatchPreset = (layerId: string, preset: string) => {
    if (!scene) return;
    void patchProject({ sceneId: scene.id, layerId, animationPreset: preset });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 bg-zinc-950 px-4 py-6 text-zinc-100">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Kinetta</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Un prompt → il Director crea un MotionProject che vedi, scrubbi e modifichi nel browser.
          Player ed export finale sono identici.
        </p>
      </header>

      {/* Prompt / generation */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={8}
          disabled={submitting}
          placeholder="Descrivi il video: scene, testi, dati, transizioni, camera…"
          className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 disabled:opacity-50"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {(["16:9", "9:16", "1:1"] as AspectRatio[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAspectRatio(a)}
              className={`rounded-full border px-3 py-1 text-xs ${
                aspectRatio === a ? "border-white bg-white text-zinc-900" : "border-zinc-600 text-zinc-400"
              }`}
            >
              {a}
            </button>
          ))}
          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={voiceoverEnabled}
              onChange={(e) => setVoiceoverEnabled(e.target.checked)}
            />
            Voce (ElevenLabs) — obbligatoria se vuoi audio nel MP4
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={localDemo} onChange={(e) => setLocalDemo(e.target.checked)} />
            Demo locale (fixture, no OpenAI)
          </label>
          <button
            type="button"
            onClick={() => void generateVideo()}
            disabled={submitting || (!prompt.trim() && !localDemo)}
            className="ml-auto rounded-xl bg-white px-5 py-2 text-sm font-medium text-zinc-900 disabled:opacity-40"
          >
            {submitting ? "Generazione…" : "Genera video"}
          </button>
        </div>
      </section>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {project ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            {/* Live browser preview — same renderer used for export */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-medium text-zinc-200">Anteprima live (browser)</h2>
                <span className="text-[11px] text-zinc-500">
                  {project.scenes.length} scene · {project.durationSec}s · {job?.status}
                </span>
              </div>
              <MotionPlayer
                ref={playerRef}
                project={project}
                jobId={job?.id}
                selectable
                selectedLayerId={selectedLayerId}
                onSelectLayer={onSelectLayer}
                onBackgroundClick={() => setSelectedLayerId(null)}
                onTimeUpdate={setCurrentMs}
              />
              <ProjectTimeline
                project={project}
                currentMs={currentMs}
                selectedSceneId={selectedSceneId}
                selectedLayerId={selectedLayerId}
                onSeek={(ms) => playerRef.current?.seek(ms)}
                onSelectScene={(id) => setSelectedSceneId(id)}
                onSelectLayer={onSelectLayer}
              />
            </section>

            {/* Final export result */}
            {job?.status === "ready" && job.outputUrl ? (
              <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-black p-2">
                <p className="px-1 pb-2 text-[11px] text-zinc-500">Export finale (MP4)</p>
                <video
                  key={job.outputUrl + String(job.updatedAt)}
                  src={job.outputUrl}
                  controls
                  className="w-full rounded-lg"
                />
              </section>
            ) : null}
          </div>

          {/* Editor sidebar */}
          <div className="flex flex-col gap-4">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-medium">Scene</h2>
                <div className="flex gap-2">
                  {scene ? (
                    <button
                      type="button"
                      onClick={() => void onRenderScene(scene.id)}
                      disabled={renderingScene || submitting}
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
                    >
                      {renderingScene ? "Scena…" : "Render scena"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void onRerender()}
                    disabled={submitting}
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 disabled:opacity-40"
                  >
                    {submitting ? "Render…" : "Esporta MP4"}
                  </button>
                </div>
              </div>
              {scenePreviewUrl ? (
                <video
                  key={scenePreviewUrl}
                  src={scenePreviewUrl}
                  controls
                  autoPlay
                  loop
                  className="mt-3 w-full rounded-lg border border-zinc-800"
                />
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {project.scenes.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedSceneId(s.id);
                      setSelectedLayerId(null);
                      playerRef.current?.seek(s.startSec * 1000 + 10);
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-xs ${
                      s.id === selectedSceneId
                        ? "border-blue-400 bg-blue-500/10 text-blue-200"
                        : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    {i + 1}. {s.name}
                  </button>
                ))}
              </div>
            </section>

            {scene ? (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <h2 className="mb-2 text-sm font-medium">Scena: {scene.name}</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-zinc-400">
                    Nome
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                      value={scene.name}
                      onChange={(e) => void patchProject({ sceneId: scene.id, sceneName: e.target.value })}
                    />
                  </label>
                  <label className="text-xs text-zinc-400">
                    Durata (s)
                    <input
                      type="number"
                      min={1}
                      max={8}
                      step={0.5}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                      value={scene.durationSec}
                      onChange={(e) =>
                        void patchProject({ sceneId: scene.id, sceneDurationSec: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="text-xs text-zinc-400">
                    Sfondo (da)
                    <input
                      type="color"
                      className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800"
                      value={bgColors.from}
                      onChange={(e) =>
                        void patchProject({
                          sceneId: scene.id,
                          backgroundFrom: e.target.value,
                          backgroundTo: bgColors.to,
                        })
                      }
                    />
                  </label>
                  <label className="text-xs text-zinc-400">
                    Sfondo (a)
                    <input
                      type="color"
                      className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800"
                      value={bgColors.to}
                      onChange={(e) =>
                        void patchProject({
                          sceneId: scene.id,
                          backgroundFrom: bgColors.from,
                          backgroundTo: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="text-xs text-zinc-400 sm:col-span-2">
                    Transizione
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                      value={scene.transitionOut?.type ?? "fade"}
                      onChange={(e) => void patchProject({ sceneId: scene.id, transitionType: e.target.value })}
                    >
                      {["cut", "fade", "slideLeft", "slideUp", "zoom", "whipLeft", "whipRight"].map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-zinc-400 sm:col-span-2">
                    Narrazione (voce)
                    <textarea
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                      value={scene.narration ?? ""}
                      onChange={(e) => void patchProject({ sceneId: scene.id, sceneNarration: e.target.value })}
                      placeholder="Testo parlato per questa scena…"
                    />
                  </label>
                </div>

                {/* Layer list */}
                <h3 className="mt-4 mb-2 text-xs font-medium text-zinc-400">Layer</h3>
                <ul className="space-y-1">
                  {[...scene.layers]
                    .sort((a, b) => b.zIndex - a.zIndex)
                    .map((l) => (
                      <li key={l.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectLayer(l.id)}
                          className={`flex min-w-0 flex-1 items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs ${
                            l.id === selectedLayerId
                              ? "border-blue-400 bg-blue-500/10 text-blue-100"
                              : "border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                          }`}
                        >
                          <span className="truncate">{layerLabel(l)}</span>
                          <span className="ml-2 shrink-0 text-[10px] text-zinc-500">{l.type}</span>
                        </button>
                        <button
                          type="button"
                          title="Rimuovi layer"
                          onClick={() => onDeleteLayer(l.id)}
                          className="shrink-0 rounded-lg border border-zinc-800 px-2 py-1.5 text-[11px] text-zinc-500 hover:border-red-800 hover:bg-red-950/40 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                </ul>
              </section>
            ) : null}

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <h2 className="mb-2 text-sm font-medium">Inspector</h2>
              {scene ? (
                <LayerInspector
                  scene={scene}
                  layer={selectedLayer}
                  onPatchLayer={onPatchLayer}
                  onPatchPreset={onPatchPreset}
                  onDeleteLayer={onDeleteLayer}
                />
              ) : null}
            </section>
          </div>
        </div>
      ) : (
        <section className="flex aspect-video items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-sm text-zinc-500">
          {submitting ? STATUS_LABEL[job?.status ?? "queued"] : "Genera un video per iniziare"}
        </section>
      )}

      {job ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-200">
              Log pipeline · {STATUS_LABEL[job.status] ?? job.status}
            </h2>
            <span className="text-[11px] text-zinc-500">
              {job.status !== "ready" && job.status !== "failed"
                ? (() => {
                    const ageSec = Math.max(0, Math.round((nowTick - job.updatedAt) / 1000));
                    if (ageSec > 60) {
                      return (
                        <span className="text-amber-400">
                          nessun aggiornamento da {ageSec}s — possibile blocco
                        </span>
                      );
                    }
                    return <span>ultimo update {ageSec}s fa</span>;
                  })()
                : null}
            </span>
          </div>
          {job.error ? (
            <p className="mb-2 rounded-lg border border-red-900/60 bg-red-950/40 px-2 py-1 text-xs text-red-300">
              {job.error}
            </p>
          ) : null}
          <ul className="max-h-48 space-y-0.5 overflow-auto font-mono text-[11px] text-zinc-400">
            {job.logs.map((line, i) => (
              <li
                key={`${i}-${line.slice(0, 40)}`}
                className={i === job.logs.length - 1 ? "text-zinc-200" : undefined}
              >
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
