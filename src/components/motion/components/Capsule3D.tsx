"use client";

import { PillHero } from "@/components/motion/components/PillHero";
import type { MotionComponentProps } from "@/components/motion/components/registry";

/**
 * Capsule3D — WebGL two-tone pill (alias of PillHero).
 * Director can set topColor / bottomColor / color / spin / float / tilt.
 */
export function Capsule3D(props: MotionComponentProps) {
  const color =
    typeof props.props.color === "string"
      ? props.props.color
      : (props.brand?.primaryColor ?? "#2244c6");
  return (
    <PillHero
      {...props}
      props={{
        topColor: "#FFFFFF",
        bottomColor: color,
        color,
        spin: 360,
        float: 0,
        tilt: 0,
        ...props.props,
      }}
    />
  );
}
