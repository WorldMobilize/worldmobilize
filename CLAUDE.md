# Kinetta

Turn a natural-language brief into a finished MP4 ad. Not slides with text over a
gradient — real branded motion components, composed and animated.

```
prompt → Director (LLM) → MotionProject (JSON) → React renderer
       → Playwright frame capture → ffmpeg → final.mp4
```

The `MotionProject` JSON is the spine of the whole system. It is the contract between
"what the video is" and "how it gets drawn", and it is what makes the editor, the
per-scene re-render, and the Director-free rerender possible. Do not route around it.

---

## Running it — read this before anything else

**Build and start. Never export from `next dev`.**

```bash
npm run build
npm start          # serves on 3000, or -p <port>
```

This is not a preference. Under `next dev` + Turbopack, hydration never completes in
headless Chromium (see the comment at `src/lib/export/frameExport.ts:102`). When
hydration fails the exporter falls back to one **full page load per frame** — 540 loads
for an 18s video — which pins the dev server's main thread at 100% CPU and makes every
HTTP request take ~40s. Measured on the same machine: **10,039s of CPU under `next dev`
vs 9s under `next start`.** WebGL layers (`PillHero`, `Capsule3D`) also silently vanish
from the output, because they mount behind `dynamic(ssr: false)` and only exist after
hydration.

If you see `[export] … page never hydrated` in the server log, the video you are about
to get is wrong. Stop and fix the server, don't ship the render.

**Run exactly one server at a time.** `ensureWorker()` starts a `setInterval` that polls
the job queue every 1.5s (`src/lib/jobs/worker.ts:49`). Two servers means two workers
racing `claimNextQueuedJob()` on the same SQLite file: a job submitted on one port can be
claimed and rendered by the other, and the logs will lie to you about which.

**`KINETTA_BASE_URL` must point at the server that serves `/render/[jobId]`.** Playwright
loads that page to capture frames. It defaults to `http://127.0.0.1:3000`
(`frameExport.ts:16`), so if you run on another port and don't set this, the exporter
drives the wrong server — or nothing at all.

**Code changes need a rebuild.** `next start` serves `.next`, not `src`. Editing a file
and refreshing does nothing until you `npm run build` and restart.

---

## Setup

| Requirement | Why |
|---|---|
| `ffmpeg` + `ffprobe` on PATH | encoding and probing; required, health check fails without them |
| `npx playwright install chromium` | frame capture; export cannot run without it |
| `npm rebuild better-sqlite3` | native module, breaks after Node upgrades (`npm run rebuild:native`) |
| `.env.local` from `.env.example` | `OPENAI_API_KEY` is required; ElevenLabs is optional |

Verify with `GET /api/health` — it must return `ok: true`. It probes OpenAI, ffmpeg,
ffprobe and ElevenLabs independently and tells you which one is broken.

---

## Map

| Path | Role |
|---|---|
| `src/lib/pipeline/runJob.ts` | orchestrates one job end to end |
| `src/lib/jobs/` | SQLite store + the polling worker |
| `src/lib/director/` | `brain.ts` plans, `arms.ts` fans out 5 facets, `merge.ts` stitches |
| `src/lib/motion/` | the IR: `types.ts`, `timing.ts`, `validate.ts` |
| `src/components/motion/` | the renderer; `components/` is the ~80-entry library |
| `src/lib/export/` | `frameExport.ts` (Playwright) → `encodeVideo.ts` (ffmpeg) |
| `src/app/render/[jobId]/` | the headless page the exporter screenshots |

**Data model.** A project has scenes; a scene has layers; a layer is `text`, `image`,
`shape`, or `component`. Components come from `components/catalog.ts` and are resolved
through `components/registry.tsx`. Layout is **absolute pixels on a 1920×1080 canvas, and
`x`/`y` are TOP-LEFT, not centre.**

**Components must be deterministic.** Every visual derives from `progress` (0..1) and
`props`. No `Math.random()`, no `Date.now()`, no wall-clock. The exporter seeks to
arbitrary timestamps and screenshots; anything non-deterministic tears or flickers across
frames. An unregistered component renders as a dashed placeholder box with its own name
in it — so a missing component is visible, not silent.

---

## Known problems

Ranked by how much they hurt the output. All confirmed by measurement, not inspection.

**1 — All text renders as serif.** `src/components/motion/MotionCanvas.tsx:98` does
`project.brand.fontFamily ?? "Inter, system-ui, sans-serif"`. The `??` only guards
null/undefined, so a real-but-unloaded family name like `"Inter Tight"` **replaces the
entire fallback chain** and the browser drops to its default serif. The app only loads
`Inter` (`src/app/layout.tsx`). Fix by concatenating, not substituting.

**2 — `PillHero` sits high in its box and gets clipped.** Measured in isolation on a
400×400 box: horizontal offset −0.5px (fine), vertical **−17.5px**, and the cap touches
the top edge with 0px clearance, so `overflow: hidden` cuts it. Cause: the camera aims at
`lookAt(0, -0.18, 0)` (`PillMesh.tsx:96`, duplicated at `:190`) while the content group
sits at `[0, -0.08, 0]` (`:115`) — 0.10 world units of disagreement. The `ContactShadows`
those 0.10 units were reserved for are invisible on a dark stage.

**3 — The Director produces atmosphere, not content.** This is structural, not a prompting
accident. In `catalog.ts`, `backgrounds` is the **only** category where all 10 components
have entirely optional props; every content component demands real data. Meanwhile no
stage owns that data: the copy arm *may* return `props?` (`arms.ts:137`), only PillHero's
props are documented to the arms (`:149`), and `merge.ts` fills defaults plus hand-written
special cases for exactly two prop names, `label` and `wordmark` (`:301-463`). Nothing
produces `question`, `answer`, `items[]`, `titles[]`, `values[]`.

The result is predictable: on a real 5-scene run the Director picked 8 components, **6 of
them from the all-optional set**, and shipped the only two that needed data — `ChatWindow`
and `Wordmark` — as `{}`. One scene was 4 seconds of empty background. The system is not
being lazy; it is correctly avoiding components it cannot fill.

**4 — `validate.ts` is 950 lines, the largest file in the repo,** and almost all of it is
repairing model output after the fact: `normalizeLayerGeometry` (154 lines), `repairLayer`,
`clampLayer`, `stretchLayersToFillScene`, `repairSceneHeroComposition`, plus per-component
special cases (`IPHONE_FRAME_ASPECT`, `HERO_PILL_COMPONENTS`, `FULL_BLEED_COMPONENTS`).
Treat its size as a symptom of the missing upstream contract, not as normal.

**5 — Prompt rules are accreting as prose.** `catalog.ts:125` is a paragraph of
Claude-mobile-specific bug fixes living inside a generic catalog. Every regression adds a
sentence, and a longer prompt gets followed less. Enforceable rules belong in validation.

---

## Where this is heading

Keep: the JSON IR, one renderer for both preview and export, deterministic components,
the semantic library.

Change, in order of value:

1. **Give props a real schema**, declared next to each component. Generate the catalog
   from it, hand it to the Director as structured schemas, reject empty props and let the
   existing repair loop (`DIRECTOR_MAX_ATTEMPTS`) fix them. This unlocks ~70 components
   that are dead today and deletes a chunk of `validate.ts`.
2. **Mark backgrounds as insufficient alone** — every scene needs at least one content
   layer with non-empty props.
3. **Fan out per scene, not per facet.** Scenes are independent; layout, copy and props
   within one scene are not, which is why `merge.ts` has to reconcile contradictions.
4. **Anchor/slot layout** resolved in code, keeping raw x/y as an editor escape hatch.
   LLMs are bad at pixel arithmetic, and items 4 above and the overlap bugs both trace
   back to asking them to do it.

---

## Staying in sync

Two people work on this repo, both with Claude attached. `.claude/settings.json`
registers a `SessionStart` hook (`.claude/hooks/git-sync-check.sh`) that fetches and
reports whether the checkout is behind `origin/main`.

It is **read-only on purpose** — it never checks out, merges or pulls. An automatic
`git checkout main` would yank whoever is mid-feature onto another branch, and an
unattended `git pull` can stop halfway through a conflict with nobody watching. The hook
makes staleness visible; acting on it stays a human decision. It also stays silent when
there is nothing to report, so the one time it does speak is worth reading.

If it says you are behind, pull before you start — and re-read this file afterwards, since
it may have changed.

## Conventions

- Tests: `npm test` (vitest). `npm run typecheck`, `npm run lint`.
- Duration comes from the brief when stated: `src/lib/motion/duration.ts`. Scene
  timecodes like `(0–3s)` are markers and must never be read as the total.
- Generated media lives in `public/generated/<jobId>/` and is gitignored, as is
  `data/motionvid.db` and every `.env*` except `.env.example`.
- The dev fixture (`localDemo: true`) builds a project with no AI and no paid providers.
  Use it to test the render path without spending credits.
