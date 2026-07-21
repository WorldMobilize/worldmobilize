"use client";

import { ContactShadows, Environment } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type PillMeshProps = {
  /** 0..1 layer progress — all motion derives from this (export-safe). */
  progress: number;
  topColor: string;
  bottomColor: string;
  /** Degrees of Y spin across the full lifetime. */
  spin: number;
  /** Max float amplitude in world units (0 = no bob). */
  float: number;
  /** Extra X tilt in degrees (0 = upright). */
  tilt?: number;
};

/**
 * Y offset of the whole stage (capsule + contact shadow) below the origin.
 *
 * The camera must aim at exactly this height. It used to aim at -0.18 while the
 * group sat at -0.08, and those 0.10 world units pushed the capsule 17.5px above
 * the centre of a 400px layer box — far enough that `overflow: hidden` sheared
 * the top off the white cap. Both values now derive from this constant so they
 * cannot drift apart again.
 */
const STAGE_Y = -0.08;

function glossyMaterial(color: string) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.18,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    reflectivity: 0.6,
    envMapIntensity: 1.15,
  });
}

/**
 * Two-tone pharmaceutical capsule. Default motion = Y spin only (no open/split).
 */
function CapsuleModel({ progress, topColor, bottomColor, spin, float, tilt = 0 }: PillMeshProps) {
  const { invalidate } = useThree();
  const p = Math.max(0, Math.min(1, progress));

  const topMat = useMemo(() => glossyMaterial(topColor), [topColor]);
  const bottomMat = useMemo(() => glossyMaterial(bottomColor), [bottomColor]);

  useEffect(() => {
    invalidate();
  }, [progress, topColor, bottomColor, spin, float, tilt, invalidate]);

  useEffect(() => {
    return () => {
      topMat.dispose();
      bottomMat.dispose();
    };
  }, [topMat, bottomMat]);

  const bob = Math.sin(p * Math.PI * 2) * float;
  const rotY = THREE.MathUtils.degToRad(spin) * p;
  const rotX = THREE.MathUtils.degToRad(tilt);

  const R = 0.42;
  const bodyH = 0.95;

  return (
    <group position={[0, bob * 0.08, 0]} rotation={[rotX, rotY, 0]} scale={1}>
      <mesh position={[0, bodyH / 2, 0]} material={topMat}>
        <sphereGeometry args={[R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, bodyH / 4, 0]} material={topMat}>
        <cylinderGeometry args={[R, R, bodyH / 2, 48]} />
      </mesh>
      <mesh position={[0, -bodyH / 4, 0]} material={bottomMat}>
        <cylinderGeometry args={[R, R, bodyH / 2, 48]} />
      </mesh>
      <mesh position={[0, -bodyH / 2, 0]} rotation={[Math.PI, 0, 0]} material={bottomMat}>
        <sphereGeometry args={[R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[R * 0.995, 0.012, 12, 64]} />
        <meshStandardMaterial color="#e8eef8" roughness={0.4} metalness={0.1} />
      </mesh>
    </group>
  );
}

/** Force camera aspect from measured CSS box so the mesh stays centered. */
function FitCamera({ width, height }: { width: number; height: number }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);

  useLayoutEffect(() => {
    if (width < 1 || height < 1) return;
    gl.setSize(width, height, false);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = width / height;
      camera.position.set(0, 0, 3.15);
      // Aim at the stage centre, so the capsule lands in the middle of the box.
      camera.lookAt(0, STAGE_Y, 0);
      camera.updateProjectionMatrix();
    }
    invalidate();
  }, [camera, gl, width, height, invalidate]);

  return null;
}

function Scene(props: PillMeshProps & { width: number; height: number }) {
  const { width, height, ...mesh } = props;
  return (
    <>
      <FitCamera width={width} height={height} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={1.35} />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} />
      <spotLight position={[2, 5, 2]} angle={0.4} penumbra={0.6} intensity={0.7} />
      <Environment preset="studio" />
      <group position={[0, STAGE_Y, 0]}>
        <CapsuleModel {...mesh} />
        <ContactShadows
          position={[0, -1.02, 0]}
          opacity={0.42}
          scale={2.4}
          blur={2.4}
          far={2.6}
        />
      </group>
    </>
  );
}

/**
 * WebGL capsule stage.
 * Measures the layer box with ResizeObserver and passes explicit pixel size to
 * R3F — percentage CSS alone left a default ~300×150 canvas stuck top-left.
 */
export function PillCanvas(props: PillMeshProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(0, Math.round(r.width));
      const h = Math.max(0, Math.round(r.height));
      setBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ready = box.w >= 8 && box.h >= 8;

  return (
    <div
      ref={wrapRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {ready ? (
        <Canvas
          key={`${box.w}x${box.h}`}
          frameloop="demand"
          dpr={[1, 2]}
          resize={{ scroll: false, debounce: 0 }}
          gl={{
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
            powerPreference: "high-performance",
          }}
          camera={{ position: [0, 0, 3.15], fov: 34, near: 0.1, far: 50 }}
          style={{
            display: "block",
            width: box.w,
            height: box.h,
            background: "transparent",
          }}
          onCreated={({ gl, camera }) => {
            gl.setClearColor(0x000000, 0);
            gl.setSize(box.w, box.h, false);
            camera.lookAt(0, STAGE_Y, 0);
          }}
        >
          <Scene {...props} width={box.w} height={box.h} />
        </Canvas>
      ) : null}
    </div>
  );
}
