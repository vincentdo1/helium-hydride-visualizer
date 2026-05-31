"use client";

import { useEffect, useState } from "react";
import { SceneCanvas } from "@/components/viz/scene-canvas";
import { VolumeRenderer } from "@/components/viz/volume-renderer";
import { Molecule } from "@/components/viz/molecule";
import { Slider, Toggle } from "@/components/ui/controls";
import { loadDensityGrid } from "@/lib/data-loader";
import type { DensityGrid } from "@/lib/physics/density";
import { BOND_LENGTH_ANGSTROM } from "@/lib/constants";

export function DensityScene() {
  const [grid, setGrid] = useState<DensityGrid | null>(null);
  const [threshold, setThreshold] = useState(0.04);
  const [view, setView] = useState("density");

  useEffect(() => {
    let active = true;
    loadDensityGrid(BOND_LENGTH_ANGSTROM, 64).then((g) => {
      if (active) setGrid(g);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section id="density" className="scene flex flex-col">
      <div className="absolute inset-0">
        <SceneCanvas>
          {grid && <VolumeRenderer grid={grid} threshold={threshold} />}
          {view === "ball-stick" && (
            <Molecule bondLengthA={BOND_LENGTH_ANGSTROM} />
          )}
          {view === "density" && (
            <Molecule bondLengthA={BOND_LENGTH_ANGSTROM} showDipole />
          )}
        </SceneCanvas>
      </div>

      <div className="relative z-10 p-6 md:p-10 max-w-xl">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--primary)]">
          01 — Density skew
        </div>
        <h2 className="mt-2 text-4xl md:text-5xl font-semibold">
          The electrons live on helium
        </h2>
        <p className="mt-3 text-white/60 leading-relaxed">
          The proton end carries the formal +1 charge, yet both electrons pile
          onto helium — leaving He as the electron-rich δ− end and producing a
          permanent dipole (≈1.66 D about the centre of mass). Rotate the
          ray-marched density and watch the cloud lean toward He.
        </p>
      </div>

      <div className="relative z-10 mt-auto p-6 md:p-10 flex flex-wrap gap-3">
        <Toggle
          title="View"
          value={view}
          onChange={setView}
          options={[
            { id: "density", label: "Density" },
            { id: "ball-stick", label: "Ball & stick" },
          ]}
        />
        <Slider
          title="Iso-threshold"
          value={threshold}
          min={0}
          max={0.3}
          onChange={setThreshold}
        />
      </div>
    </section>
  );
}
