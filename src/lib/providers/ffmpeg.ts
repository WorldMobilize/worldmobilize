/**
 * Legacy concat helper — superseded by src/lib/render/*.
 * Kept only so older imports do not break; active pipeline does not use this.
 */
export async function composeFinalVideo(args: {
  jobId: string;
  clipUrls: string[];
  audioUrl: string | null;
  aspectRatio: string;
}): Promise<{ outputUrl: string; montaged: boolean }> {
  void args;
  throw new Error(
    "composeFinalVideo is deprecated. Use renderMotionProject from @/lib/render/renderProject.",
  );
}
