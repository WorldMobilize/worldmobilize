import { spawn } from "node:child_process";

export function ffmpegBin() {
  return process.env.FFMPEG_PATH?.trim() || "ffmpeg";
}

export function ffprobeBin() {
  return process.env.FFPROBE_PATH?.trim() || "ffprobe";
}

export function runFfmpeg(args: string[], meta?: { jobId?: string; sceneId?: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = ffmpegBin();
    const child = spawn(bin, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });
    child.on("error", (e) => {
      reject(
        new Error(
          `FFmpeg spawn failed (${meta?.jobId ?? "?"} ${meta?.sceneId ?? ""}): ${e.message}`,
        ),
      );
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else {
        reject(
          new Error(
            [
              `FFmpeg failed code=${code}`,
              `job=${meta?.jobId ?? "?"}`,
              `scene=${meta?.sceneId ?? "?"}`,
              `args=${JSON.stringify(args.slice(0, 24))}…`,
              `stderr=${stderr.slice(-1200)}`,
            ].join(" | "),
          ),
        );
      }
    });
  });
}

export async function assertFfmpegAvailable(): Promise<void> {
  await runFfmpeg(["-version"]);
}

/** Sample a property value at time t from keyframes (piecewise linear). */
export function sampleKeyframes(
  keyframes: { time: number; value: number }[],
  t: number,
): number {
  if (keyframes.length === 0) return 0;
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (t <= sorted[0]!.time) return sorted[0]!.value;
  const last = sorted[sorted.length - 1]!;
  if (t >= last.time) return last.value;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (t >= a.time && t <= b.time) {
      const u = (t - a.time) / Math.max(1e-6, b.time - a.time);
      return a.value + (b.value - a.value) * u;
    }
  }
  return last.value;
}
