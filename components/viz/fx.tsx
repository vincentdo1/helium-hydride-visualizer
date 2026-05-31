"use client";

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

// Post-processing stack shared by every scene. Selective bloom is what turns the
// flat dots + spheres into a luminous, cinematic molecule: emissive atom cores
// and the additive electron gas glow, while MSAA keeps the sphere edges clean
// and a soft vignette focuses the eye on the centre.
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
        luminanceThreshold={0.22}
        luminanceSmoothing={0.4}
        radius={0.78}
      />
      <Vignette offset={0.32} darkness={0.62} />
    </EffectComposer>
  );
}
