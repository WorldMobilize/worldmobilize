"use client";

import type { ComponentType } from "react";
import type { BrandSystem, ComponentLayer, ProjectAsset } from "@/lib/motion/types";

export type MotionComponentProps = {
  layer: ComponentLayer;
  props: Record<string, unknown>;
  /** 0..1 progress through the layer lifetime. */
  progress: number;
  brand?: BrandSystem;
  jobId?: string;
  assets?: ProjectAsset[];
};

/**
 * Registry of semantic motion components the Director can emit.
 * Populated by the component library (Phase 6). Deterministic by design:
 * components must derive all visuals from `progress` + `props`, never Math.random().
 */
export const MOTION_COMPONENTS: Record<string, ComponentType<MotionComponentProps>> = {};

export function registerMotionComponent(id: string, component: ComponentType<MotionComponentProps>) {
  MOTION_COMPONENTS[id] = component;
}

export function getMotionComponent(id: string): ComponentType<MotionComponentProps> | null {
  return MOTION_COMPONENTS[id] ?? null;
}
