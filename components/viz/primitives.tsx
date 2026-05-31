"use client";

// Shared, reusable visual primitives for the molecule scenes. Centralising the
// "look" here keeps the bonded viewer and the formation interactive in sync.
//
//  • SoftPoints  — the electron swarm as soft, round, twinkling glowing sprites
//                  (a custom point shader; far nicer than square gl.POINTS dots).
//  • Atom        — a luminous nucleus: a bright bloom-ready core + a fresnel
//                  atmosphere halo, so it reads like a glowing ion / tiny star.
//  • CloudShell  — a faint fresnel "membrane" that gives the electron gas a
//                  visible 3D body (a cheap stand-in for a density isosurface).

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BackSide,
  Color,
  FrontSide,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type Points,
  type ShaderMaterial,
} from "three";

/* ----------------------- soft glowing electron points ------------------- */

const pointsVert = /* glsl */ `
  uniform float uScale;   // (height_px/2) / tan(fov/2): physically-correct size
  uniform float uSize;    // particle world diameter
  uniform float uTime;
  attribute float aRnd;   // per-particle random, for shimmer
  varying float vTw;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vTw = 0.55 + 0.45 * sin(uTime * (0.7 + aRnd * 1.7) + aRnd * 6.2831);
    gl_PointSize = clamp(uSize * uScale / max(-mv.z, 0.001), 1.0, 90.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const pointsFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vTw;
  void main() {
    // round, soft-edged sprite
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    a = pow(a, 1.7);               // tighter, glowier core
    gl_FragColor = vec4(uColor, a * uOpacity * vTw);
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
  // Per-particle random phase for the shimmer. Deterministic (a hash of the
  // index) rather than Math.random() so it's pure — the React Compiler forbids
  // impure calls during render, and the exact values don't matter visually.
  const rnd = useMemo(() => {
    const a = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const s = Math.sin(i * 12.9898) * 43758.5453;
      a[i] = s - Math.floor(s); // fract → [0,1)
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

/* --------------------------- fresnel glow shader ------------------------- */

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
}: {
  radius: number;
  color: string;
  coreColor: string;
  grab?: boolean;
  /** gently breathe the glow so the nucleus reads through a dense cloud */
  pulse?: boolean;
  haloScale?: number;
  haloOpacity?: number;
  /** soft additive pip drawn ON TOP of everything — guarantees the nucleus is
   *  never fully buried by the electron cloud (use for the He atom) */
  beacon?: boolean;
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
    if (coreRef.current) coreRef.current.emissiveIntensity = 2.1 + p * 1.8;
    if (haloRef.current)
      haloRef.current.uniforms.uOpacity.value = haloOpacity * (0.7 + 0.5 * p);
    if (beaconRef.current) beaconRef.current.opacity = 0.32 + 0.28 * p;
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
      {/* bright core — emissive, unclamped so the Bloom pass lifts it */}
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          ref={coreRef}
          color={coreColor}
          emissive={color}
          emissiveIntensity={2.4}
          roughness={0.3}
          metalness={0}
          toneMapped={false}
        />
      </mesh>
      {/* atmospheric halo — fresnel rim, additive. Sits OUTSIDE the densest part
          of the electron cloud so the atom's colour always rings through. */}
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
      {/* beacon — soft additive glow drawn on top (depthTest off) so a dense
          electron cloud can never completely hide the nucleus */}
      {beacon && (
        <mesh renderOrder={20}>
          <sphereGeometry args={[radius * 0.82, 24, 24]} />
          <meshBasicMaterial
            ref={beaconRef}
            color={color}
            transparent
            opacity={0.4}
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

/* ----------------------------- cloud shell ------------------------------ */

// A faint translucent envelope around the electron gas. The parent positions /
// scales the mesh (an ellipsoid) and sets uOpacity each frame via its material.
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
