import { catalogPromptBlock } from "@/components/motion/components/catalog";
import { brainModel, callOpenAIJson, persistJson } from "@/lib/director/openai";
import { formatForAspect } from "@/lib/motion/validate";
import type { AspectRatio } from "@/lib/motion/types";

/**
 * Brain-as-executor mode: one gpt-5.5 call returns a full MotionProject.
 * Arms stay in the codebase but are skipped when DIRECTOR_ARMS_ENABLED=0.
 */
const BRAIN_SOLO_SYSTEM = `You are the Kinetta Brain AND executor.
Given a user brief, return ONLY a complete valid MotionProject JSON (version: 1).

OBEY THE BRIEF EXACTLY:
- This brief only — do not mix other products, old templates, or invent a multi-scene SaaS arc unless asked.
- Honor explicit duration, timing, and on-screen copy verbatim.
- If they ask for 5 seconds / one hero beat, use 1 scene (or 2 max) totaling that duration.
- durationSec MUST match the target duration.
- Every layer must HOLD until the end of its scene (startSec + durationSec ≈ scene.durationSec). Entrances can animate in; do not leave the second half of the video empty/black.

CRITICAL schema:
- background.type MUST be solid | gradient | image only
- gradient background shape: { type:"gradient", from:"#hex", to:"#hex", angle:number }
  Use the keys "from" and "to". Do NOT emit colors:[a,b] — that shape is ignored.
- every layer width >= 40, height >= 24
- layer types: text | image | shape | component
- text layer shape: { id, name, type:"text", text, fontSize, fontWeight, color, align,
  x, y, width, height, startSec, durationSec, animationPreset }
  fontSize and fontWeight are REQUIRED on every text layer — omit them and the text
  falls back to one flat default size with no hierarchy. See ART DIRECTION for the scale.
- Prefer Component Library (PillHero, Capsule3D, ParticleField, MetricCard, LogoLockup, iPhone, ChatWindow, …) over primitives when they fit
- If the brief mentions Claude mobile / phone app: use iPhone with ui:\"claude\" (or ClaudeMobileHome). On 9:16 the phone is auto-sized ~92% width. NEVER BrowserWindow. NEVER Capsule3D as Claude logo. All text stays INSIDE the phone screen.
- PillHero/Capsule3D props: topColor, bottomColor, color, spin (default 360), float (default 0), tilt (default 0). Product capsules only (e.g. DTCPill) — not Anthropic/Claude branding.
- NEVER open/split/crack the capsule into two halves unless the brief explicitly asks. Default = one upright pill that spins on Y with a soft shadow under it.
- At most ONE PillHero/Capsule3D unless the brief asks for more. No duplicate pills.
- animationPreset: fadeIn, fadeOut, slideUp, slideLeft, slideRight, scaleIn, scaleOut, gentleFloat, slowZoom, staggeredCardReveal, countUp
- Camera optional: { x,y,scale,rotation, animations:[{property,keyframes:[{time,value,easing}]}] }
  easing MUST be linear|easeIn|easeOut|easeInOut; property MUST be x|y|scale|rotation|opacity|blur|progress
- transitionOut: cut|fade|slideLeft|slideUp|zoom|whipLeft|whipRight
- Canvas must match aspectRatio @ 30fps
- project.id MUST be the job id provided
- Root MUST include non-empty scenes array

CRITICAL — coordinates & composition (player uses TOP-LEFT origin, NOT center):
- layer.x / layer.y = top-left corner of the layer box. Never put canvas-center (e.g. 960,540 on 1920x1080) as x,y.
- To center a box: x = (canvasW - width) / 2, y = (canvasH - height) / 2.
- Full-bleed atmosphere (MeshGradient, ParticleField, Aurora, …): x=0, y=0, width=canvasW, height=canvasH.
- Hero logo: ALWAYS a separate PillHero or Capsule3D layer, centered: x=(canvasW-size)/2, y=(canvasH-size)/2, square size ≈ 28% of min(canvasW,canvasH).
- ParticleField is atmosphere ONLY — set showCapsule:false. Never nest the main logo inside ParticleField. Never use ParticleField showCapsule:true.
- Centered headlines: align "center", width ~60–80% of canvas, x = (canvasW - width) / 2. Keep ≥5% side margins; nothing clipped off-screen.
- One primary focal point per scene (pill OR headline), then secondary copy with clear vertical gaps.

ART DIRECTION — you are the art director, not just a layout engine. Judge the
result as a viewer: it must look like a designed film, not a slide deck.

TYPOGRAPHY (S = the short edge of the canvas — 1080 at every supported aspect):
- ALWAYS set fontSize explicitly on EVERY text layer. Never omit it.
- Hero / opening statement: 0.10–0.13 * S   (108–140 at S=1080)
- Scene headline:           0.07–0.09 * S   (76–97)
- Supporting line:          0.04–0.05 * S   (43–54)
- Caption / label:          0.028–0.035 * S (30–38)
- Never below 0.026 * S — it is unreadable in motion.
- Within one scene, sizes must differ by at least 1.6x. Two texts at similar
  sizes read as a document, not a title card. Weight 700+ for hero and headline.

COLOR & VARIETY:
- Consecutive scenes MUST NOT reuse the same background. Changing only the
  gradient angle is NOT variation — change the hue pair, the value (dark/light),
  or the type (solid vs gradient).
- Pick 1 accent hue for the whole video and let the backgrounds move around it.
- Body text needs strong contrast against its background. No mid-blue text on
  mid-blue plates.

PACING — dead frames are the most common failure:
- Something must be moving in EVERY frame. If no element animates, put a slow
  camera move (scale 1.0 -> 1.04) or slowZoom/gentleFloat on the background.
- Never hold one static composition longer than ~1.5s without a new element
  entering, a camera move, or a transition.
- The final frame must be a composed shot — never empty, never black.

COMPOSITION:
- Use the whole frame. Do not cluster the entire composition in one quadrant
  with a large empty area opposite it.
- The primary composition should span at least 55% of the canvas width.

COPY DISCIPLINE:
- Every string in text and in component props is FINAL on-screen copy.
- Never write stage directions into them. No "use fact verbatim:", no
  "chip text:", no "animate counter ticking up", no notes to yourself.
- Fill every prop a component needs with real content. A component left without
  its content props renders as an empty grey placeholder in the final video.

Motion graphics only — no people / film footage unless asked.

` + catalogPromptBlock();

export async function runBrainSolo(opts: {
  jobId: string;
  prompt: string;
  aspectRatio: AspectRatio;
  durationTargetSec: number;
  voiceoverEnabled: boolean;
}): Promise<unknown> {
  const size = formatForAspect(opts.aspectRatio);
  const model = brainModel();
  const user = [
    `User brief:`,
    opts.prompt.trim(),
    ``,
    `Constraints:`,
    `- aspectRatio: ${opts.aspectRatio} (${size.width}x${size.height} @ 30fps)`,
    `- durationSec MUST be ${opts.durationTargetSec}`,
    `- voiceover enabled: ${opts.voiceoverEnabled ? "yes — set audio.voiceover.enabled=true + short voiceover.script (and optional scene.narration)" : "no"}`,
    `- project.id MUST be "${opts.jobId}"`,
    `- THIS brief only — no other jobs/templates`,
    ``,
    `Return the complete MotionProject JSON now.`,
  ].join("\n");

  const raw = await callOpenAIJson({
    model,
    system: BRAIN_SOLO_SYSTEM,
    messages: [{ role: "user", content: user }],
    label: "brain-solo",
  });
  await persistJson(opts.jobId, "brain-solo.json", raw);
  return raw;
}
