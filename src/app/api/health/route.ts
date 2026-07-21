import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import OpenAI from "openai";

type CheckResult = { ok: boolean; detail: string; required?: boolean };

async function checkOpenAI(): Promise<CheckResult> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { ok: false, detail: "OPENAI_API_KEY missing", required: true };
  try {
    const client = new OpenAI({ apiKey: key });
    const model = process.env.DIRECTOR_MODEL?.trim() || "gpt-4o";
    const res = await client.chat.completions.create({
      model,
      max_completion_tokens: 16,
      messages: [{ role: "user", content: 'Reply in JSON with exactly: {"ok":true}' }],
      response_format: { type: "json_object" },
    });
    return {
      ok: true,
      required: true,
      detail: `Director model ${model} ok (${(res.choices[0]?.message?.content ?? "").slice(0, 40)})`,
    };
  } catch (err) {
    return {
      ok: false,
      required: true,
      detail: err instanceof Error ? err.message : "OpenAI failed",
    };
  }
}

function checkBinary(bin: string, required: boolean): Promise<CheckResult> {
  return new Promise((resolve) => {
    const child = spawn(bin, ["-version"], { windowsHide: true });
    let out = "";
    child.stdout.on("data", (d) => {
      out += String(d);
    });
    child.stderr.on("data", (d) => {
      out += String(d);
    });
    child.on("error", () => resolve({ ok: false, required, detail: `${bin} not found` }));
    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          ok: true,
          required,
          detail: (out.split(/\r?\n/).find((l) => l.trim()) ?? `${bin} OK`).trim(),
        });
      } else resolve({ ok: false, required, detail: `${bin} exit ${code}` });
    });
  });
}

async function checkElevenLabs(): Promise<CheckResult> {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (!key || !voiceId) {
    return { ok: false, required: false, detail: "optional — key/voice not set" };
  }
  try {
    // Test the exact capability the pipeline uses: Text to Speech. A 1-char
    // request costs negligible quota and needs only the `text_to_speech` scope
    // (NOT voices_read / user_read, which the voiceover never uses).
    const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2";
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text: ".", model_id: modelId }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        required: false,
        detail: `TTS failed (${res.status}): ${body.slice(0, 500)}`,
      };
    }
    return { ok: true, required: false, detail: `TTS OK — voice ${voiceId}, model ${modelId}` };
  } catch (err) {
    return {
      ok: false,
      required: false,
      detail: err instanceof Error ? err.message : "ElevenLabs failed",
    };
  }
}

export async function GET() {
  const ffmpegPath = process.env.FFMPEG_PATH?.trim() || "ffmpeg";
  const ffprobePath = process.env.FFPROBE_PATH?.trim() || "ffprobe";

  const [openai, ffmpeg, ffprobe, elevenlabs] = await Promise.all([
    checkOpenAI(),
    checkBinary(ffmpegPath, true),
    checkBinary(ffprobePath, true),
    checkElevenLabs(),
  ]);

  const checks = {
    openai,
    ffmpeg,
    ffprobe,
    elevenlabs,
  };

  const ok = openai.ok && ffmpeg.ok && ffprobe.ok;
  return NextResponse.json({
    ok,
    composeReady: ffmpeg.ok && ffprobe.ok,
    message: ok
      ? "Core OK (OpenAI + FFmpeg). ElevenLabs optional."
      : "Required checks failed (need OpenAI + FFmpeg)",
    checks,
  });
}
