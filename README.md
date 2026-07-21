# Kinetta

Turn a natural-language brief into a finished MP4 motion ad.

You write "a 15-second product video for X, dark premium feel, five category cards, a chat
demo, end on the logo". Kinetta plans it, composes it from a library of branded motion
components, renders it frame by frame in a real browser, and encodes an MP4.

```
prompt → Director (LLM) → MotionProject (JSON) → React renderer
       → Playwright frame capture → ffmpeg → final.mp4
```

## Requirements

Beyond Node 20+, three things must exist on your machine before anything works:

| | Install | Why |
|---|---|---|
| **ffmpeg** | [ffmpeg.org](https://ffmpeg.org/download.html) — `ffmpeg` and `ffprobe` must be on your PATH | encodes the video |
| **Chromium for Playwright** | `npx playwright install chromium` | captures the frames |
| **API key** | an OpenAI key with access to the Director model | plans the video |

ElevenLabs (voiceover), Flux (image generation) and Gemini/Veo are optional — the pipeline
skips them cleanly when their keys are absent.

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env.local        # then put your real keys in it
npm run rebuild:native            # only if better-sqlite3 complains
```

`.env.local` is gitignored and must never be committed. `OPENAI_API_KEY` is the only key
strictly required.

## Running

```bash
npm run build
npm start
```

Then open http://localhost:3000 and check http://localhost:3000/api/health — it must
report `ok: true`. If it doesn't, it names the failing dependency.

### Do not use `npm run dev` to render

`next dev` will serve the UI, but **exporting a video through it produces a broken result
and pins your CPU at 100%**. Under Turbopack, hydration never completes in headless
Chromium, so the exporter falls back to reloading the whole page once per frame — 540
reloads for an 18-second video — and the WebGL layers silently disappear from the output.

Always `npm run build && npm start` before rendering. If you change code, rebuild: `next
start` serves the compiled bundle, not your source files.

Run **one** server at a time. Two instances share the same SQLite database and both poll
the job queue, so they will steal each other's jobs.

If you run on a non-default port, set `KINETTA_BASE_URL` in `.env.local` to that server's
address — the exporter uses it to find the page it screenshots.

## Trying it without spending credits

The homepage has a dev-fixture toggle that builds a full project with no AI calls and no
paid providers. Use it to verify your setup end to end before burning tokens.

## Scripts

| | |
|---|---|
| `npm run build` / `npm start` | production build and server — **use this to render** |
| `npm run dev` | UI development only, not for export |
| `npm test` | vitest |
| `npm run typecheck` / `npm run lint` | tsc and eslint |
| `npm run rebuild:native` | rebuild better-sqlite3 after a Node upgrade |

## Notes for contributors

`CLAUDE.md` holds the architecture overview, the known problems with file references, and
where the project is heading. Read it before touching the Director or the renderer — it
documents several failure modes that are expensive to rediscover.

Generated media (`public/generated/`) and the local job database (`data/`) are gitignored.
