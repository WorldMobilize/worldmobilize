import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { assetsDir } from "@/lib/motion/assets";
import type { MotionProject } from "@/lib/motion/types";
import { runFfmpeg } from "@/lib/render/ffmpegExpressions";

const TTS_TIMEOUT_MS = Number(process.env.ELEVENLABS_TIMEOUT_MS) || 45_000;

export async function generateNarration(args: {
  text: string;
  jobId: string;
  fileName?: string;
}): Promise<{ audioPath: string; url: string } | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (!apiKey || !voiceId) return null;

  const text = args.text.trim();
  if (!text) return null;

  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text, model_id: modelId }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`ElevenLabs timeout after ${TTS_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const dir = assetsDir(args.jobId);
  await mkdir(dir, { recursive: true });
  const fileName = args.fileName ?? "voiceover.mp3";
  const filePath = path.join(dir, fileName);
  await writeFile(filePath, buffer);

  return {
    audioPath: filePath,
    url: `/generated/${args.jobId}/assets/${fileName}`,
  };
}

/** Build one audio track with per-section narration aligned to scene startSec. */
export async function buildSectionVoiceover(args: {
  project: MotionProject;
  jobId: string;
  onProgress?: (msg: string) => void;
}): Promise<{ audioPath: string; url: string } | null> {
  const scenes = args.project.scenes.filter((s) => s.enabled !== false && s.narration?.trim());
  if (scenes.length === 0) return null;

  const clips: { path: string; startSec: number }[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]!;
    args.onProgress?.(
      `ElevenLabs: scena ${i + 1}/${scenes.length} "${scene.name}" (${scene.narration!.trim().slice(0, 48)}…)`,
    );
    const fileName = `narration_${scene.id}.mp3`;
    const audio = await generateNarration({
      text: scene.narration!,
      jobId: args.jobId,
      fileName,
    });
    if (!audio) {
      args.onProgress?.(`ElevenLabs: scena ${i + 1}/${scenes.length} saltata (nessun audio)`);
      return null;
    }
    args.onProgress?.(`ElevenLabs: scena ${i + 1}/${scenes.length} OK`);
    clips.push({ path: audio.audioPath, startSec: scene.startSec });
  }

  args.onProgress?.(`ElevenLabs: mix timeline (${clips.length} clip)…`);
  const outPath = path.join(assetsDir(args.jobId), "voiceover_timeline.mp3");

  // Hard ceiling on output length. `amix=duration=longest` is unbounded: a single
  // bad startSec (large, or accidentally already in ms) makes `adelay` push a clip
  // hours out, and the mix then runs for hours — that is how failed jobs left
  // multi-GB voiceover_timeline.mp3 files on disk. Audio past the video end is
  // discarded in the final mux anyway, so capping at the project duration (plus a
  // small tail for a last-scene narration) is both safe and correct.
  const projectSec =
    Number.isFinite(args.project.durationSec) && args.project.durationSec > 0
      ? args.project.durationSec
      : 600;
  const maxOutSec = Math.ceil(projectSec + 5);
  const delayCeilingSec = projectSec; // no clip may start after the video ends

  if (clips.length === 1) {
    await runFfmpeg(
      ["-y", "-i", clips[0]!.path, "-t", String(maxOutSec), "-c:a", "libmp3lame", "-q:a", "4", outPath],
      { jobId: args.jobId, sceneId: "voice" },
    );
    return { audioPath: outPath, url: `/generated/${args.jobId}/assets/voiceover_timeline.mp3` };
  }

  // adelay alone — do NOT use apad (infinite pad → amix hangs forever).
  const inputs = clips.flatMap((c) => ["-i", c.path]);
  const filters = clips.map((c, i) => {
    // Guard against NaN/negative/oversized startSec before it reaches adelay.
    const safeSec = Math.min(delayCeilingSec, Math.max(0, Number(c.startSec) || 0));
    const ms = Math.round(safeSec * 1000);
    return `[${i}:a]adelay=${ms}|${ms}[a${i}]`;
  });
  const mixInputs = clips.map((_, i) => `[a${i}]`).join("");
  const filterComplex = `${filters.join(";")};${mixInputs}amix=inputs=${clips.length}:duration=longest:dropout_transition=0:normalize=0[aout]`;

  await runFfmpeg(
    [
      "-y",
      ...inputs,
      "-filter_complex",
      filterComplex,
      "-map",
      "[aout]",
      // Belt-and-suspenders: even if a delay slips through, output can't exceed this.
      "-t",
      String(maxOutSec),
      "-c:a",
      "libmp3lame",
      "-q:a",
      "4",
      outPath,
    ],
    { jobId: args.jobId, sceneId: "voice-mix" },
  );

  return { audioPath: outPath, url: `/generated/${args.jobId}/assets/voiceover_timeline.mp3` };
}

export function elevenLabsConfigured(): boolean {
  return !!(process.env.ELEVENLABS_API_KEY?.trim() && process.env.ELEVENLABS_VOICE_ID?.trim());
}
