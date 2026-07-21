import path from "node:path";
import { access } from "node:fs/promises";
import { runFfmpeg } from "@/lib/render/ffmpegExpressions";

/**
 * Encode a directory of PNG frames (frame_000000.png …) into an MP4, optionally
 * muxing a voiceover track. Produces a web-friendly H.264/yuv420p file.
 */
export async function encodeFramesToMp4(args: {
  framesDir: string;
  fps: number;
  outPath: string;
  audioPath?: string | null;
  jobId?: string;
  /** Lowest frame index on disk (frames may not start at 0 for scene exports). */
  startNumber?: number;
}): Promise<void> {
  const { framesDir, fps, outPath } = args;
  const pattern = path.join(framesDir, "frame_%06d.png");

  let audioOk = false;
  if (args.audioPath) {
    try {
      await access(args.audioPath);
      audioOk = true;
    } catch {
      audioOk = false;
    }
  }

  const ffArgs = ["-y", "-framerate", String(fps)];
  if (args.startNumber && args.startNumber > 0) {
    ffArgs.push("-start_number", String(args.startNumber));
  }
  ffArgs.push("-i", pattern);
  if (audioOk) ffArgs.push("-i", args.audioPath!);

  ffArgs.push(
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(fps),
    "-movflags",
    "+faststart",
  );

  if (audioOk) {
    ffArgs.push("-c:a", "aac", "-b:a", "192k", "-shortest");
  }

  ffArgs.push(outPath);

  await runFfmpeg(ffArgs, { jobId: args.jobId });
}
