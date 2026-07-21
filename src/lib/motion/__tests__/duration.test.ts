import { describe, expect, it } from "vitest";
import {
  clampDurationSec,
  parseDurationFromPrompt,
  resolveDurationTargetSec,
} from "@/lib/motion/duration";

const STORYBOARD = [
  "Scene 1 (0–3s): A glowing capsule materializes from particles.",
  "Scene 2 (3–7s): Five category cards fly in and stack.",
  "Scene 3 (7–11s): A stream of book covers rushes past.",
  "Scene 4 (11–14s): Brand chips pop in a grid.",
  "Scene 5 (14–18s): A chat mockup, an answer streams in.",
].join("\n\n");

describe("parseDurationFromPrompt", () => {
  it("reads an explicit total", () => {
    expect(parseDurationFromPrompt("6-second product video for dtcpill")).toBe(6);
    expect(parseDurationFromPrompt("15s vertical 9:16. One scene only.")).toBe(15);
    expect(parseDurationFromPrompt("VOICEOVER (clear male voice, ~10s): upgrade your AI")).toBe(10);
  });

  it("takes the upper bound of an unparenthesised duration range", () => {
    expect(parseDurationFromPrompt("Create an 8–12 second 9:16 motion video")).toBe(12);
  });

  it("returns null when no duration is stated", () => {
    expect(parseDurationFromPrompt("A video about pills with 1,400+ secrets")).toBeNull();
    expect(parseDurationFromPrompt("   ")).toBeNull();
  });

  // The regression: a scene timecode used to win because it matched leftmost.
  it("does not mistake a scene timecode for the total", () => {
    expect(
      parseDurationFromPrompt("Scene 1 (0–3s): pill appears. Make the whole video 8 seconds total."),
    ).toBe(8);
    expect(parseDurationFromPrompt("Scene 1: 0-3s pill appears. Total length 8 seconds.")).toBe(8);
  });

  it("keeps honouring an explicit total that comes first", () => {
    expect(parseDurationFromPrompt("8 second video. Scene 1 (0–3s): pill appears.")).toBe(8);
  });

  it("falls back to the end of the last scene timecode", () => {
    expect(parseDurationFromPrompt(STORYBOARD)).toBe(18);
    expect(parseDurationFromPrompt("Scene 1 (0:03–0:07s): cards fly in.")).toBe(7);
  });

  it("ignores a backwards range instead of swallowing it", () => {
    // "7-3s" runs backwards, so it is not a timecode and never sets the storyboard
    // end. It stays visible to the duration matcher, which reads the only token
    // actually carrying a unit — "3s".
    expect(parseDurationFromPrompt("weird (7-3s) marker")).toBe(3);
  });
});

describe("resolveDurationTargetSec", () => {
  it("lets the prompt beat the body value", () => {
    expect(resolveDurationTargetSec({ prompt: STORYBOARD, bodyDuration: 12 })).toBe(18);
  });

  it("uses the body value when the prompt is silent", () => {
    expect(resolveDurationTargetSec({ prompt: "a pill video", bodyDuration: 8 })).toBe(8);
  });

  it("falls back when neither is given", () => {
    expect(resolveDurationTargetSec({ prompt: "a pill video", fallbackSec: 12 })).toBe(12);
  });

  it("clamps to the 3–30s window", () => {
    expect(clampDurationSec(1)).toBe(3);
    expect(clampDurationSec(99)).toBe(30);
    expect(resolveDurationTargetSec({ prompt: "a 60 second epic" })).toBe(30);
  });
});
