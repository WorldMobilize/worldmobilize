import { createMotionProject } from "@/lib/director";
import { exportProjectVideo, playwrightAvailable } from "@/lib/export/exportProject";
import { appendJobLog, clearDirtyScenes, getJob, updateJob } from "@/lib/jobs/store";
import { assetsDir } from "@/lib/motion/assets";
import { clampVoiceoverToDuration } from "@/lib/motion/validate";
import type { MotionProject } from "@/lib/motion/types";
import { buildSectionVoiceover, generateNarration, elevenLabsConfigured } from "@/lib/providers/elevenlabs";
import { renderMotionProject } from "@/lib/render/renderProject";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * Produce the final MP4. Prefers the browser-parity Playwright frame exporter;
 * falls back to the legacy FFmpeg scene renderer when Playwright is unavailable.
 */
async function renderFinalVideo(args: {
  jobId: string;
  project: MotionProject;
  voicePath: string | null;
}): Promise<string> {
  const { jobId, project, voicePath } = args;

  if (await playwrightAvailable()) {
    appendJobLog(jobId, "Export: Playwright frame capture (browser-parity)…");
    const result = await exportProjectVideo({
      project,
      voicePath,
      onProgress: (p) => {
        if (p.stage === "frames") {
          if (p.done === 1 || p.done === p.total || p.done % 30 === 0) {
            appendJobLog(jobId, `Frames ${p.done}/${p.total}`);
          }
        } else if (p.stage === "encoding") {
          appendJobLog(jobId, p.done === 0 ? "FFmpeg: encoding MP4…" : "FFmpeg: encoding done");
        }
        updateJob(jobId, {
          progress: {
            stage: p.stage === "encoding" ? "composing" : "rendering_scenes",
            completedScenes: p.done,
            totalScenes: p.total,
            currentScene: p.stage,
          },
        });
      },
    });
    appendJobLog(jobId, `Export OK — ${result.frameCount} frames`);
    return result.outputUrl;
  }

  appendJobLog(jobId, "Playwright non disponibile — fallback FFmpeg scene renderer…");
  const rendered = await renderMotionProject({
    project,
    voicePath,
    onProgress: (p) => {
      updateJob(jobId, {
        status: "rendering_scenes",
        progress: {
          stage: "rendering_scenes",
          completedScenes: p.completedScenes,
          totalScenes: p.totalScenes,
          currentScene: p.currentScene,
        },
      });
    },
  });
  return rendered.outputUrl;
}

/**
 * Unified Kinetta pipeline — single project format, single render path.
 * Director (or explicit dev fixture) → MotionProject → assets → optional
 * ElevenLabs → browser-parity frame export → final.mp4
 */
export async function runJob(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) return;

  try {
    updateJob(jobId, { status: "directing", error: null });

    if (job.localDemo) {
      appendJobLog(jobId, "Dev fixture: building MotionProject (no AI, no paid providers)…");
    } else {
      const brain = process.env.DIRECTOR_BRAIN_MODEL?.trim() || process.env.DIRECTOR_MODEL?.trim() || "gpt-5.5";
      const armsOff =
        ["0", "false", "off", "no"].includes(
          (process.env.DIRECTOR_ARMS_ENABLED?.trim().toLowerCase() || ""),
        );
      if (armsOff) {
        appendJobLog(jobId, `Director brain-solo: ${brain} (arms off)…`);
      } else {
        const arms = process.env.DIRECTOR_ARM_MODEL?.trim() || "gpt-4o-mini";
        appendJobLog(jobId, `Director multi-agent: brain ${brain} + arms ${arms} (structure/layout/copy/motion/images)…`);
      }
    }

    const directed = await createMotionProject({
      jobId,
      prompt: job.prompt,
      aspectRatio: job.aspectRatio,
      durationTargetSec: job.durationTargetSec,
      voiceoverEnabled: job.voiceoverEnabled,
      localDemo: job.localDemo,
      onLog: (msg) => appendJobLog(jobId, msg),
    });
    const project: MotionProject = directed.project;
    if (directed.source === "fixture") {
      appendJobLog(jobId, `Fixture ready — "${project.title}"`);
    } else {
      appendJobLog(
        jobId,
        `Director OK — "${project.title}" (${directed.mode ?? "openai"}${directed.attempts ? `, ${directed.attempts} pass(es)` : ""})`,
      );
    }

    updateJob(jobId, {
      status: "preparing_assets",
      project,
      progress: {
        stage: "preparing_assets",
        completedScenes: 0,
        totalScenes: project.scenes.filter((s) => s.enabled !== false).length,
        currentScene: null,
      },
    });
    appendJobLog(
      jobId,
      `Project ready — "${project.title}" · ${project.scenes.length} scenes · ${project.durationSec}s`,
    );

    let voicePath: string | null = null;
    const vo = project.audio.voiceover;
    let hasSectionNarration = project.scenes.some((s) => s.narration?.trim());

    // Brain-solo often forgets narration/script even when the job asked for voice.
    if (job.voiceoverEnabled) {
      project.audio.voiceover = {
        ...vo,
        enabled: true,
        provider: "elevenlabs",
        script: vo?.script?.trim() || "",
      };
      if (!hasSectionNarration && !project.audio.voiceover.script.trim()) {
        const fallback = [
          project.title,
          ...project.scenes.map((s) => s.narration?.trim() || s.purpose || s.name),
        ]
          .filter(Boolean)
          .join(". ");
        project.audio.voiceover.script = clampVoiceoverToDuration(
          fallback || job.prompt.slice(0, 280),
          project.durationSec,
        );
        appendJobLog(
          jobId,
          "Voiceover: nessun narration dal Director — uso script di fallback dal progetto",
        );
      }
      hasSectionNarration = project.scenes.some((s) => s.narration?.trim());
    }

    if (job.voiceoverEnabled && hasSectionNarration) {
      if (!elevenLabsConfigured()) {
        appendJobLog(jobId, "ElevenLabs: chiavi mancanti — voiceover saltato");
      } else {
        const n = project.scenes.filter((s) => s.narration?.trim()).length;
        appendJobLog(jobId, `ElevenLabs: narrazione per ${n} sezioni…`);
        try {
          const audio = await buildSectionVoiceover({
            project,
            jobId,
            onProgress: (msg) => appendJobLog(jobId, msg),
          });
          if (audio) {
            voicePath = audio.audioPath;
            appendJobLog(jobId, `ElevenLabs: voiceover pronto → ${audio.url}`);
          } else {
            appendJobLog(jobId, "ElevenLabs: generazione fallita — continuo senza voce");
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          appendJobLog(jobId, `ElevenLabs: errore (${msg}) — continuo senza voce`);
        }
      }
    } else if (job.voiceoverEnabled && project.audio.voiceover?.script.trim()) {
      const script = clampVoiceoverToDuration(
        project.audio.voiceover.script,
        project.durationSec,
      );
      appendJobLog(jobId, "ElevenLabs: generating narration…");
      try {
        const audio = await generateNarration({ text: script, jobId });
        if (audio) {
          voicePath = audio.audioPath;
          appendJobLog(jobId, `ElevenLabs: ready → ${audio.url}`);
        } else {
          appendJobLog(jobId, "ElevenLabs: skipped (missing key/voice or disabled)");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        appendJobLog(jobId, `ElevenLabs: errore (${msg}) — continuo senza voce`);
      }
    } else if (job.voiceoverEnabled) {
      appendJobLog(jobId, "Voiceover: ON ma nessuno script/narration — saltato");
    } else {
      appendJobLog(jobId, "Voiceover: OFF (spunta «Voce (ElevenLabs)» in homepage per attivarlo)");
    }

    appendJobLog(jobId, "Export: avvio render video…");
    updateJob(jobId, { status: "rendering_scenes" });
    const outputUrl = await renderFinalVideo({ jobId, project, voicePath });
    clearDirtyScenes(jobId);

    updateJob(jobId, {
      status: "ready",
      outputUrl,
      error: null,
      project,
      progress: {
        stage: "ready",
        completedScenes: project.scenes.length,
        totalScenes: project.scenes.length,
        currentScene: null,
      },
    });
    appendJobLog(jobId, `Ready: ${outputUrl}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pipeline failed";
    updateJob(jobId, { status: "failed", error: message });
    appendJobLog(jobId, `Failed: ${message}`);
  }
}

/** Rerender from stored project.json without Director. */
export async function rerenderJob(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (!job?.project) {
    updateJob(jobId, { status: "failed", error: "No project to rerender" });
    return;
  }

  try {
    updateJob(jobId, { status: "preparing_assets", error: null });
    appendJobLog(jobId, "Rerender: skipping Director, using project.json");

    await mkdir(assetsDir(jobId), { recursive: true });
    let voicePath: string | null = null;
    const hasSectionNarration = job.project.scenes.some((s) => s.narration?.trim());

    if (job.voiceoverEnabled && hasSectionNarration && elevenLabsConfigured()) {
      appendJobLog(jobId, "Rerender: rigenero voiceover sezioni…");
      try {
        const audio = await buildSectionVoiceover({
          project: job.project,
          jobId,
          onProgress: (msg) => appendJobLog(jobId, msg),
        });
        voicePath = audio?.audioPath ?? null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        appendJobLog(jobId, `ElevenLabs: errore (${msg}) — continuo senza voce`);
      }
    } else {
      for (const name of ["voiceover_timeline.mp3", "voiceover.mp3"]) {
        const p = path.join(assetsDir(jobId), name);
        try {
          await access(p);
          voicePath = p;
          break;
        } catch {
          /* try next */
        }
      }
    }

    updateJob(jobId, { status: "rendering_scenes" });
    const outputUrl = await renderFinalVideo({ jobId, project: job.project, voicePath });
    clearDirtyScenes(jobId);

    updateJob(jobId, {
      status: "ready",
      outputUrl,
      error: null,
      progress: {
        stage: "ready",
        completedScenes: job.project.scenes.length,
        totalScenes: job.project.scenes.length,
        currentScene: null,
      },
    });
    appendJobLog(jobId, `Rerender ready: ${outputUrl}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rerender failed";
    updateJob(jobId, { status: "failed", error: message });
    appendJobLog(jobId, `Failed: ${message}`);
  }
}
