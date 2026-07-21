/**
 * Resolve target duration for a job from the user brief and/or explicit UI value.
 * The brief wins when it states a length ("5-second", "5s", …).
 */

/** A clock position: bare seconds ("7") or mm:ss ("0:07"). */
const TIME = String.raw`(?:(\d{1,2}):)?(\d{1,2}(?:\.\d+)?)`;
const SEC_UNIT = String.raw`(?:seconds?|secs?|s)`;

/**
 * Scene timecode markers — "Scene 2 (3–7s)" or "(0:03–0:07)". These state *where a
 * scene sits on the timeline*, never how long the video is, so they must not be read
 * as a duration: the leftmost-match rule below would otherwise let "(0–3s)" beat an
 * explicit "make it 8 seconds total" later in the same brief.
 */
const SCENE_TIMECODE_RES = [
  // Parenthesised: "(0–3s)", "Scene 2 (0:03–0:07s)"
  new RegExp(String.raw`\([^)]*?${TIME}\s*[–—-]\s*${TIME}\s*${SEC_UNIT}\b[^)]*\)`, "gi"),
  // Bare, but anchored to a scene label: "Scene 1: 0-3s"
  new RegExp(String.raw`\bscene\s*\d+\s*[:,-]?\s*${TIME}\s*[–—-]\s*${TIME}\s*${SEC_UNIT}\b`, "gi"),
];

const DURATION_RE =
  /(?:^|[^\d])(\d{1,2}(?:\.\d+)?)\s*(?:-|–)?\s*(?:second(?:s)?|sec(?:s)?|s)\b/i;
const DURATION_RE_ALT =
  /(?:duration|length|runtime|lasts?|for)\s*(?:of\s*)?(?:about\s*|~|≈)?\s*(\d{1,2}(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)\b/i;

function toSeconds(minutes: string | undefined, seconds: string): number {
  return (minutes ? Number(minutes) * 60 : 0) + Number(seconds);
}

/**
 * Strip scene timecodes from the brief and report where the storyboard ends.
 * `endSec` is the latest timecode end seen — the storyboard's own total runtime.
 */
function extractSceneTimecodes(text: string): { stripped: string; endSec: number | null } {
  let stripped = text;
  let endSec: number | null = null;

  for (const re of SCENE_TIMECODE_RES) {
    stripped = stripped.replace(re, (...args) => {
      // Groups: 1/2 = start mm/ss, 3/4 = end mm/ss.
      const [, startMin, startSec, endMin, endSecStr] = args as [
        string,
        string | undefined,
        string,
        string | undefined,
        string,
      ];
      const start = toSeconds(startMin, startSec);
      const end = toSeconds(endMin, endSecStr);
      // A range that runs backwards is not a timecode; leave it for the duration
      // matcher rather than silently swallowing it.
      if (end <= start) return args[0] as string;
      if (endSec == null || end > endSec) endSec = end;
      return " ";
    });
  }

  return { stripped, endSec };
}

export function parseDurationFromPrompt(prompt: string): number | null {
  const text = prompt.trim();
  if (!text) return null;

  const { stripped, endSec } = extractSceneTimecodes(text);

  const m = stripped.match(DURATION_RE) || stripped.match(DURATION_RE_ALT);
  if (m?.[1]) {
    const n = Number(m[1]);
    // An explicit total always wins, wherever it sits in the brief.
    if (Number.isFinite(n) && n > 0) return n;
  }

  // No explicit total, but the storyboard timed itself: "Scene 5 (14–18s)" means
  // the video runs to 18s. Honour that instead of truncating to the fallback.
  return endSec;
}

/** Allowed project length: short heroes (3s) up to 30s. */
export function clampDurationSec(sec: number): number {
  return Math.min(30, Math.max(3, Math.round(sec * 10) / 10));
}

/**
 * Pick duration. User wording in the prompt is law.
 * Explicit body duration is used only when the prompt does not specify one.
 */
export function resolveDurationTargetSec(opts: {
  prompt: string;
  bodyDuration?: unknown;
  fallbackSec?: number;
}): number {
  const fromPrompt = parseDurationFromPrompt(opts.prompt);
  if (fromPrompt != null) return clampDurationSec(fromPrompt);

  const fromBody = Number(opts.bodyDuration);
  if (Number.isFinite(fromBody) && fromBody > 0) return clampDurationSec(fromBody);

  return clampDurationSec(opts.fallbackSec ?? 12);
}
