export type AspectRatio = "16:9" | "9:16" | "1:1";

export type BrandStyle =
  | "premium-saas"
  | "editorial"
  | "bold"
  | "minimal"
  | "futuristic";

export type BrandSystem = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  foregroundColor: string;
  accentColor: string;
  fontFamily: string;
  style: BrandStyle;
  cornerRadius: number;
};

export type Easing = "linear" | "easeIn" | "easeOut" | "easeInOut";

export type AnimProperty = "x" | "y" | "scale" | "rotation" | "opacity" | "blur" | "progress";

export type MotionKeyframe = {
  time: number;
  value: number;
  easing: Easing;
};

export type AnimationTrack = {
  property: AnimProperty;
  keyframes: MotionKeyframe[];
};

export type TransitionType =
  | "cut"
  | "fade"
  | "slideLeft"
  | "slideUp"
  | "zoom"
  | "whipLeft"
  | "whipRight";

export type TransitionSpec = {
  type: TransitionType;
  durationSec: number;
};

export type SceneBackground =
  | { type: "solid"; color: string }
  | { type: "gradient"; from: string; to: string; angle: number }
  | { type: "image"; assetId: string; fit: "cover" | "contain" };

export type LayerBase = {
  id: string;
  name: string;
  startSec: number;
  durationSec: number;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  scale: number;
  zIndex: number;
  animations: AnimationTrack[];
  /** Optional named preset applied at normalize time */
  animationPreset?: string;
  /** Optional exit preset played near the end of the layer lifetime */
  exitPreset?: string;
  /** Gaussian blur in px (0 = none) */
  blur?: number;
  enabled?: boolean;
};

export type TextLayer = LayerBase & {
  type: "text";
  text: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: "left" | "center" | "right";
  maxWidth?: number;
};

export type ImageLayer = LayerBase & {
  type: "image";
  assetId: string;
  fit: "cover" | "contain";
  borderRadius?: number;
  shadow?: boolean;
  /** Flux / gen prompt — mute imagery only (no baked text). */
  imagePrompt?: string;
};

export type ShapeLayer = LayerBase & {
  type: "shape";
  shape: "rectangle" | "circle" | "line";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
};

/** Registry key for the built-in semantic component library (V1). */
export type MotionComponentId = string;

export type ComponentLayer = LayerBase & {
  type: "component";
  component: MotionComponentId | string;
  props: Record<string, unknown>;
};

export type MotionLayer = TextLayer | ImageLayer | ShapeLayer | ComponentLayer;

/** Per-scene 2D camera. Applied as a transform over the entire scene content. */
export type SceneCamera = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  animations: AnimationTrack[];
};

export type MotionScene = {
  id: string;
  name: string;
  purpose: string;
  startSec: number;
  durationSec: number;
  enabled?: boolean;
  background: SceneBackground;
  camera?: SceneCamera;
  layers: MotionLayer[];
  transitionIn?: TransitionSpec;
  transitionOut?: TransitionSpec;
  /** Spoken line for this section (ElevenLabs) */
  narration?: string;
  /** Section layout template (video-demo composer) */
  layout?: "intro-logo" | "stat-cards" | "centered";
};

export type ProjectAudio = {
  voiceover?: {
    enabled: boolean;
    script: string;
    provider: "elevenlabs";
  };
  music?: {
    enabled: boolean;
    assetId?: string;
    volume: number;
  };
};

export type MotionProject = {
  version: 1;
  id: string;
  title: string;
  description?: string;
  format: {
    width: number;
    height: number;
    fps: number;
    aspectRatio: AspectRatio;
  };
  durationSec: number;
  brand: BrandSystem;
  scenes: MotionScene[];
  audio: ProjectAudio;
};

export type ProjectAsset = {
  id: string;
  type: "image" | "audio";
  source: "uploaded" | "generated" | "builtin";
  path: string;
  mimeType: string;
  width?: number;
  height?: number;
  durationSec?: number;
  /** Web-servable URL under /public. */
  url?: string;
  /** Availability of the asset on disk. */
  status?: "ready" | "missing" | "fallback";
  /** When missing, the builtin asset id used as a visual placeholder. */
  fallbackId?: string;
};

export type JobStatus =
  | "queued"
  | "directing"
  | "preparing_assets"
  | "rendering_scenes"
  | "composing"
  | "ready"
  | "failed";

export type JobProgress = {
  stage: JobStatus;
  completedScenes: number;
  totalScenes: number;
  currentScene: string | null;
};

export type MotionJob = {
  id: string;
  prompt: string;
  status: JobStatus;
  project: MotionProject | null;
  progress: JobProgress;
  logs: string[];
  outputUrl: string | null;
  error: string | null;
  aspectRatio: AspectRatio;
  durationTargetSec: number;
  voiceoverEnabled: boolean;
  /** Skip OpenAI — use local fixture project (free render test). */
  localDemo: boolean;
  /** Scene ids edited since the last full export (for incremental re-render). */
  dirtySceneIds: string[];
  createdAt: number;
  updatedAt: number;
};
