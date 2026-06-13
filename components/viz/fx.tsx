"use client";

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

// Shared post stack: bloom for the emissive cores and additive cloud, vignette
// to pull the eye centre-frame.
export function SceneEffects({
  bloomIntensity = 0.9,
}: {
  bloomIntensity?: number;
}) {
  return (
    <EffectComposer multisampling={4}>
      <Bloom
        mipmapBlur
        intensity={bloomIntensity}
        luminanceThreshold={0.18}
        luminanceSmoothing={0.4}
        radius={0.78}
      />
      <Vignette offset={0.32} darkness={0.62} />
    </EffectComposer>
  );
}
