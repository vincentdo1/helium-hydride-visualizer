"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Data3DTexture,
  LinearFilter,
  RedFormat,
  UnsignedByteType,
  ClampToEdgeWrapping,
  Vector3,
  type Mesh,
  type ShaderMaterial,
} from "three";
import type { DensityGrid } from "@/lib/physics/density";

export type VolumeMode = "density" | "difference";

const vertexShader = /* glsl */ `
  varying vec3 vObjPos;
  void main() {
    vObjPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Front-to-back ray marching of a 3D density texture inside a unit cube
// [-0.5, 0.5]³. Camera position is supplied in object space each frame so the
// march is correct even while OrbitControls rotates the mesh.
const fragmentShader = /* glsl */ `
  precision highp float;
  precision highp sampler3D;

  varying vec3 vObjPos;

  uniform sampler3D uVolume;
  uniform vec3 uCameraPosObj;
  uniform float uSteps;
  uniform float uDensityScale;
  uniform float uThreshold;
  uniform int uMode;          // 0 = density, 1 = difference

  // Ray/box intersection for the unit cube centred at origin.
  vec2 intersectBox(vec3 orig, vec3 dir) {
    vec3 boxMin = vec3(-0.5);
    vec3 boxMax = vec3(0.5);
    vec3 invDir = 1.0 / dir;
    vec3 tMin = (boxMin - orig) * invDir;
    vec3 tMax = (boxMax - orig) * invDir;
    vec3 t1 = min(tMin, tMax);
    vec3 t2 = max(tMin, tMax);
    float tNear = max(max(t1.x, t1.y), t1.z);
    float tFar  = min(min(t2.x, t2.y), t2.z);
    return vec2(tNear, tFar);
  }

  // Emerald transfer function for ρ (matches the portfolio's neon-green accent).
  vec3 densityColor(float d) {
    vec3 lo = vec3(0.06, 0.32, 0.18);
    vec3 hi = vec3(0.62, 1.0, 0.77);
    return mix(lo, hi, d);
  }

  // Diverging map for Δρ: data centred at 0.5 → red (loss) … teal (gain).
  vec3 differenceColor(float v) {
    float s = (v - 0.5) * 2.0;            // [-1, 1]
    vec3 loss = vec3(1.0, 0.35, 0.30);
    vec3 gain = vec3(0.35, 0.95, 0.95);
    return s < 0.0 ? loss : gain;
  }

  void main() {
    vec3 rayDir = normalize(vObjPos - uCameraPosObj);
    vec2 t = intersectBox(uCameraPosObj, rayDir);
    if (t.x > t.y) discard;
    t.x = max(t.x, 0.0);

    float steps = uSteps;
    float dt = (t.y - t.x) / steps;
    vec3 pos = uCameraPosObj + rayDir * t.x;
    vec3 step = rayDir * dt;

    vec4 acc = vec4(0.0);
    for (int i = 0; i < 512; i++) {
      if (float(i) >= steps) break;
      vec3 uvw = pos + 0.5;                 // [-0.5,0.5] → [0,1]
      float raw = texture(uVolume, uvw).r;

      float sample;
      vec3 col;
      if (uMode == 1) {
        sample = abs(raw - 0.5) * 2.0;      // magnitude of change
        col = differenceColor(raw);
      } else {
        sample = max(raw - uThreshold, 0.0) / max(1.0 - uThreshold, 1e-3);
        col = densityColor(raw);
      }

      float alpha = sample * uDensityScale * dt;
      alpha = clamp(alpha, 0.0, 1.0);
      acc.rgb += (1.0 - acc.a) * col * alpha;
      acc.a   += (1.0 - acc.a) * alpha;
      if (acc.a > 0.97) break;

      pos += step;
    }

    if (acc.a < 0.002) discard;
    gl_FragColor = acc;
  }
`;

function makeTexture(grid: DensityGrid): Data3DTexture {
  const bytes = new Uint8Array(grid.data.length);
  for (let i = 0; i < grid.data.length; i++) {
    bytes[i] = Math.max(0, Math.min(255, Math.round(grid.data[i] * 255)));
  }
  const tex = new Data3DTexture(bytes, grid.size, grid.size, grid.size);
  tex.format = RedFormat;
  tex.type = UnsignedByteType;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.wrapS = ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  tex.wrapR = ClampToEdgeWrapping;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
}

export function VolumeRenderer({
  grid,
  mode = "density",
  size = 2.4,
  steps = 128,
  densityScale = 6,
  threshold = 0.04,
}: {
  grid: DensityGrid;
  mode?: VolumeMode;
  size?: number;
  steps?: number;
  densityScale?: number;
  threshold?: number;
}) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);
  const camObj = useMemo(() => new Vector3(), []);
  const texture = useMemo(() => makeTexture(grid), [grid]);

  // Stable uniforms object (created once). Per-frame values are written through
  // the material ref in useFrame, so the material is never rebuilt and we never
  // mutate this memoized object directly.
  const uniforms = useMemo(
    () => ({
      uVolume: { value: texture },
      uCameraPosObj: { value: new Vector3() },
      uSteps: { value: steps },
      uDensityScale: { value: densityScale },
      uThreshold: { value: threshold },
      uMode: { value: mode === "difference" ? 1 : 0 },
    }),
    // create once; live values are pushed via matRef each frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Free the old GPU texture when the grid changes.
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ camera }) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uVolume.value = texture;
    mat.uniforms.uSteps.value = steps;
    mat.uniforms.uDensityScale.value = densityScale;
    mat.uniforms.uThreshold.value = threshold;
    mat.uniforms.uMode.value = mode === "difference" ? 1 : 0;

    const mesh = meshRef.current;
    if (!mesh) return;
    camObj.copy(camera.position);
    mesh.worldToLocal(camObj);
    // object space is the unit cube before the mesh scale, so divide by size
    (mat.uniforms.uCameraPosObj.value as Vector3)
      .copy(camObj)
      .divideScalar(size);
  });

  return (
    <mesh ref={meshRef} scale={size}>
      <boxGeometry args={[1, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
