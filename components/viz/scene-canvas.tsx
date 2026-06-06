"use client";

import { Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { ACESFilmicToneMapping } from "three";
import { SceneEffects } from "@/components/viz/fx";

// Shared R3F canvas for the 3D scenes. Sets up filmic tone-mapping (so the
// emissive cores roll off nicely instead of clipping), a deep 3D starfield for
// parallax depth, gentle auto-rotation for life, and the shared bloom/vignette
// post stack. Children are the scene contents.
export function SceneCanvas({
  children,
  enableZoom = true,
  enablePan = true,
  autoRotate = false,
  bloomIntensity = 0.9,
}: {
  children: ReactNode;
  enableZoom?: boolean;
  enablePan?: boolean;
  autoRotate?: boolean;
  bloomIntensity?: number;
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.35, 3.4], fov: 42 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        // Lets the framebuffer be read back (screenshots / pixel checks) even
        // though the swarm animates every frame. Negligible cost here.
        preserveDrawingBuffer: true,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
    >
      {/* soft key + cool rim, low ambient so the glow reads against the dark */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <directionalLight
        position={[-4, -2, -3]}
        intensity={0.4}
        color="#88aaff"
      />

      <Stars
        radius={60}
        depth={40}
        count={2600}
        factor={3.2}
        saturation={0}
        fade
        speed={0.6}
      />

      <Suspense fallback={null}>{children}</Suspense>

      {/* Viewer-style controls: left-drag rotate, right-drag pan, wheel zoom
          (OrbitControls' default mouse mapping — the user drives it, no
          auto-spin). */}
      <OrbitControls
        makeDefault
        enablePan={enablePan}
        enableZoom={enableZoom}
        autoRotate={autoRotate}
        autoRotateSpeed={0.45}
        minDistance={1.8}
        maxDistance={7}
        dampingFactor={0.08}
      />

      <SceneEffects bloomIntensity={bloomIntensity} />
    </Canvas>
  );
}
