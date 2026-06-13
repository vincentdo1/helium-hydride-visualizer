"use client";

// Shared visual primitives for the molecule scenes: the electron swarm
// (SoftPoints), glowing nuclei (Atom), floating labels (AtomLabel), and the
// faint density envelope (CloudShell).

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  FrontSide,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type Points,
  type ShaderMaterial,
} from "three";

/* ----------------------------- electron swarm --------------------------- */

const pointsVert = /* glsl */ `
  uniform float uScale;   // (height_px/2) / tan(fov/2)
  uniform float uSize;    // particle world diameter
  uniform float uTime;
  attribute float aRnd;   // per-particle phase for the shimmer
  attribute vec3 aColor;  // per-particle tint (white = untinted)
  varying float vTw;
  varying vec3 vColor;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vTw = 0.55 + 0.45 * sin(uTime * (0.7 + aRnd * 1.7) + aRnd * 6.2831);
    vColor = aColor;
    gl_PointSize = clamp(uSize * uScale / max(-mv.z, 0.001), 1.0, 90.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const pointsFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vTw;
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    a = pow(a, 1.7);
    gl_FragColor = vec4(uColor * vColor, a * uOpacity * vTw);
  }
`;

export function SoftPoints({
  pointsRef,
  count,
  color = "#bfe3ff",
  size = 0.05,
  opacity = 0.5,
}: {
  pointsRef: RefObject<Points | null>;
  count: number;
  color?: string;
  size?: number;
  opacity?: number;
}) {
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const colors = useMemo(() => new Float32Array(count * 3).fill(1), [count]);
  // Index-hash phase instead of Math.random(): keeps render pure.
  const rnd = useMemo(() => {
    const a = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const s = Math.sin(i * 12.9898) * 43758.5453;
      a[i] = s - Math.floor(s);
    }
    return a;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uScale: { value: 600 },
      uSize: { value: size },
      uTime: { value: 0 },
      uColor: { value: new Color(color) },
      uOpacity: { value: opacity },
    }),
    // created once; live values are pushed through the material ref each frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const mat = pts.material as ShaderMaterial;
    const h = state.gl.domElement.height; // physical px
    const cam = state.camera as unknown as { fov?: number };
    const fov = ((cam.fov ?? 42) * Math.PI) / 180;
    mat.uniforms.uScale.value = (h * 0.5) / Math.tan(fov * 0.5);
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uSize.value = size;
    mat.uniforms.uOpacity.value = opacity;
    (mat.uniforms.uColor.value as Color).set(color);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aRnd" args={[rnd, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={pointsVert}
        fragmentShader={pointsFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

/* ----------------------------- fresnel shader ---------------------------- */

const glowVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vV = normalize(cameraPosition - wp.xyz);
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const glowFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uOpacity;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - clamp(dot(vN, vV), 0.0, 1.0), uPower);
    gl_FragColor = vec4(uColor, f * uOpacity);
  }
`;

/* -------------------------------- atom ---------------------------------- */

export function Atom({
  radius,
  color,
  coreColor,
  grab = false,
  pulse = false,
  haloScale = 2.0,
  haloOpacity = 0.85,
  beacon = false,
  beaconOpacity = 0.4,
}: {
  radius: number;
  color: string;
  coreColor: string;
  grab?: boolean;
  /** breathe the glow so the nucleus reads through a dense cloud */
  pulse?: boolean;
  haloScale?: number;
  haloOpacity?: number;
  /** additive pip drawn on top of everything (depthTest off) */
  beacon?: boolean;
  beaconOpacity?: number;
}) {
  const coreRef = useRef<MeshStandardMaterial>(null);
  const haloRef = useRef<ShaderMaterial>(null);
  const beaconRef = useRef<MeshBasicMaterial>(null);

  const glowUniforms = useMemo(
    () => ({
      uColor: { value: new Color(color) },
      uPower: { value: 2.4 },
      uOpacity: { value: haloOpacity },
    }),
    [color, haloOpacity],
  );

  useFrame((state) => {
    if (!pulse) return;
    const p = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 2.1);
    if (coreRef.current) coreRef.current.emissiveIntensity = 2.3 + p * 1.9;
    if (haloRef.current)
      haloRef.current.uniforms.uOpacity.value = haloOpacity * (0.7 + 0.5 * p);
    if (beaconRef.current)
      beaconRef.current.opacity = beaconOpacity * (0.8 + 0.7 * p);
  });

  return (
    <group>
      {grab && (
        // invisible, forgiving pointer hit-area
        <mesh>
          <sphereGeometry args={[radius * 2.6, 12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      {/* emissive core, unclamped so the bloom pass lifts it */}
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          ref={coreRef}
          color={coreColor}
          emissive={color}
          emissiveIntensity={2.6}
          roughness={0.3}
          metalness={0}
          toneMapped={false}
        />
      </mesh>
      {/* fresnel rim halo outside the densest part of the cloud */}
      <mesh scale={haloScale}>
        <sphereGeometry args={[radius, 32, 32]} />
        <shaderMaterial
          ref={haloRef}
          vertexShader={glowVert}
          fragmentShader={glowFrag}
          uniforms={glowUniforms}
          transparent
          depthWrite={false}
          side={BackSide}
          blending={AdditiveBlending}
        />
      </mesh>
      {/* beacon keeps the nucleus visible through the cloud */}
      {beacon && (
        <mesh renderOrder={20}>
          <sphereGeometry args={[radius * 0.82, 24, 24]} />
          <meshBasicMaterial
            ref={beaconRef}
            color={color}
            transparent
            opacity={beaconOpacity}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
            blending={AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}

/* ----------------------------- atom label -------------------------------- */

// Small billboard label rendered to a canvas texture (no font fetch needed).
export function AtomLabel({
  text,
  color,
  position = [0, 0.3, 0],
  scale = 0.3,
  opacity = 0.55,
}: {
  text: string;
  color: string;
  position?: [number, number, number];
  scale?: number;
  opacity?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.font = "600 76px 'JetBrains Mono', ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = color;
      ctx.fillText(text, 128, 70);
    }
    return new CanvasTexture(canvas);
  }, [text, color]);

  return (
    <sprite position={position} scale={[scale, scale / 2, 1]} renderOrder={30}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}

/* ----------------------------- cloud shell ------------------------------ */

// Faint translucent envelope around the electron gas; the parent positions and
// scales the mesh each frame via the ref.
export function CloudShell({
  shellRef,
  color = "#9fe0ff",
  opacity = 0.14,
  power = 2.0,
}: {
  shellRef: RefObject<Mesh | null>;
  color?: string;
  opacity?: number;
  power?: number;
}) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(color) },
      uPower: { value: power },
      uOpacity: { value: opacity },
    }),
    // created once; uOpacity is driven by the parent through the material ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <mesh ref={shellRef}>
      <sphereGeometry args={[1, 48, 48]} />
      <shaderMaterial
        vertexShader={glowVert}
        fragmentShader={glowFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={FrontSide}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}
