/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { framesDir } from "@/lib/motion/assets";
import { projectDurationMs } from "@/lib/motion/timing";
import type { MotionProject } from "@/lib/motion/types";

export type FrameExportResult = {
  framesDir: string;
  frameCount: number;
  fps: number;
  startFrame: number;
};

/** Resolve the base URL of the running Next server for headless rendering. */
export function renderBaseUrl(): string {
  return (
    process.env.KINETTA_BASE_URL?.trim() ||
    `http://127.0.0.1:${process.env.PORT?.trim() || "3000"}`
  );
}

/** Lazily load Playwright's chromium. Returns null if not installed. */
async function loadChromium(): Promise<any | null> {
  try {
    const specifier = "playwright";
    const mod: any = await import(specifier);
    return mod.chromium ?? null;
  } catch {
    return null;
  }
}

export async function playwrightAvailable(): Promise<boolean> {
  return (await loadChromium()) != null;
}

/**
 * Render every frame of a MotionProject by driving the headless /render page
 * with Playwright and screenshotting the canvas. Frames are pixel-identical to
 * the in-editor MotionPlayer because they use the same React renderer.
 */
export async function exportFrames(opts: {
  jobId: string;
  project: MotionProject;
  baseUrl?: string;
  onProgress?: (done: number, total: number) => void;
  timeRangeMs?: { startMs: number; endMs: number };
  /** Override the frames output directory (keeps concurrent exports isolated). */
  outDir?: string;
}): Promise<FrameExportResult> {
  const chromium = await loadChromium();
  if (!chromium) {
    throw new Error(
      "Playwright is not installed. Run `npm i -D playwright` and `npx playwright install chromium`.",
    );
  }

  const { jobId, project } = opts;
  const { width, height, fps } = project.format;
  const baseUrl = opts.baseUrl ?? renderBaseUrl();

  const durationMs = projectDurationMs(project);
  const startMs = opts.timeRangeMs?.startMs ?? 0;
  const endMs = opts.timeRangeMs?.endMs ?? durationMs;
  const frameStep = 1000 / fps;
  const startFrame = Math.round(startMs / frameStep);
  const totalFrames = Math.max(1, Math.ceil((endMs - startMs) / frameStep));

  const dir = opts.outDir ?? framesDir(jobId);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const browser = await chromium.launch({
    args: [
      "--force-color-profile=srgb",
      "--use-gl=angle",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
    ],
  });
  try {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });

    // Preferred path: load the page once, wait for hydration, then seek. Client-
    // only layers (the WebGL PillHero/Capsule3D mount behind `dynamic ssr:false`)
    // exist only after hydration, so the per-frame `?t=` reload below screenshots
    // before they ever appear — it captured a video with no hero pill in it.
    // Hydration does not complete under `next dev` + Turbopack HMR in headless
    // Chromium, so that reload path stays as the fallback.
    await page.goto(`${baseUrl}/render/${jobId}?t=${startMs}`, {
      waitUntil: "load",
      timeout: 60000,
    });
    const hydrated = await page
      .waitForFunction(() => window.__motionReady === true, undefined, { timeout: 20000 })
      .then(() => true)
      .catch(() => false);
    if (!hydrated) {
      console.warn(
        `[export] ${jobId}: page never hydrated — falling back to per-frame SSR. ` +
          `WebGL layers (PillHero, Capsule3D) will be missing. Export against \`next start\`, not \`next dev\`.`,
      );
    }

    /** Let images, fonts and demand-framed R3F canvases settle before capture. */
    const settle = () =>
      page
        .evaluate(async () => {
          await Promise.all(
            Array.from(document.images).map((img) =>
              img.complete ? Promise.resolve() : img.decode().catch(() => undefined),
            ),
          );
          if (document.fonts?.ready) await document.fonts.ready;
          // Two RAFs so demand-framed R3F canvases paint after progress sync.
          await new Promise<void>((r) =>
            requestAnimationFrame(() => requestAnimationFrame(() => r())),
          );
          await new Promise((r) => setTimeout(r, 16));
        })
        .catch(() => undefined);

    const stage = page.locator("[data-render-root]");
    for (let f = 0; f < totalFrames; f++) {
      const globalFrame = startFrame + f;
      const ms = Math.round(globalFrame * frameStep);

      if (hydrated) {
        await page.evaluate((at: number) => window.__motionSeek?.(at), ms);
      } else {
        await page.goto(`${baseUrl}/render/${jobId}?t=${ms}`, {
          waitUntil: "load",
          timeout: 60000,
        });
      }
      await settle();

      const file = path.join(dir, `frame_${String(globalFrame).padStart(6, "0")}.png`);
      await stage.screenshot({ path: file, clip: { x: 0, y: 0, width, height } });
      opts.onProgress?.(f + 1, totalFrames);
    }

    return { framesDir: dir, frameCount: totalFrames, fps, startFrame };
  } finally {
    await browser.close();
  }
}
