import { access } from "node:fs/promises";
import path from "node:path";
import { createDtcpillFixture } from "../src/lib/fixtures/dtcpill";
import { renderMotionProject } from "../src/lib/render/renderProject";

async function main() {
  const jobId = `smoke_${Date.now().toString(36)}`;
  console.log("Smoke: DTCPill acceptance fixture", jobId);

  const project = createDtcpillFixture({ jobId, aspectRatio: "16:9" });

  if (project.scenes.length !== 6) {
    throw new Error(`Expected 6 scenes, got ${project.scenes.length}`);
  }

  // Offline export verification via the legacy FFmpeg renderer (no server /
  // Playwright required). Confirms the fixture encodes to a full-length MP4.
  const result = await renderMotionProject({ project, voicePath: null });
  await access(result.finalPath);
  for (const p of result.scenePaths) await access(p);

  const projectJson = path.join(process.cwd(), "public", "generated", jobId, "project.json");
  await access(projectJson);

  console.log("Smoke OK");
  console.log(" scenes:", result.scenePaths.length);
  console.log(" final:", result.outputUrl);
  console.log(" duration:", project.durationSec, "s");
  console.log(" no paid providers required");
}

main().catch((err) => {
  console.error("Smoke FAILED", err);
  process.exit(1);
});
