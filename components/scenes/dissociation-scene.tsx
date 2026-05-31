"use client";

import { useEffect, useMemo, useState } from "react";
import { SceneCanvas } from "@/components/viz/scene-canvas";
import { VolumeRenderer } from "@/components/viz/volume-renderer";
import { Molecule } from "@/components/viz/molecule";
import { BondSlider, Toggle } from "@/components/ui/controls";
import { loadDifferenceDensity, loadDensityGrid } from "@/lib/data-loader";
import type { DensityGrid } from "@/lib/physics/density";
import {
  AVOIDED_CROSSING_ANGSTROM,
  type ElectronicState,
} from "@/lib/constants";

export function DissociationScene() {
  const [bond, setBond] = useState(0.77);
  const [state, setState] = useState<ElectronicState>("X");
  const [mode, setMode] = useState("difference");
  const [grid, setGrid] = useState<DensityGrid | null>(null);

  // Debounced async grid load as the slider scrubs.
  useEffect(() => {
    let active = true;
    const loader =
      mode === "difference"
        ? loadDifferenceDensity(bond, 0.12, 56)
        : loadDensityGrid(bond, 56);
    loader.then((g) => {
      if (active) setGrid(g);
    });
    return () => {
      active = false;
    };
  }, [bond, mode]);

  const nearCrossing = Math.abs(bond - AVOIDED_CROSSING_ANGSTROM) < 0.4;

  const asymptote = useMemo(() => {
    if (bond < 1.5) return "Bound HeH⁺";
    return state === "X" ? "He + H⁺" : "He⁺ + H";
  }, [bond, state]);

  return (
    <section id="dissociation" className="scene flex flex-col">
      <div className="absolute inset-0">
        <SceneCanvas>
          {grid && (
            <VolumeRenderer
              grid={grid}
              mode={mode === "difference" ? "difference" : "density"}
              densityScale={mode === "difference" ? 10 : 6}
            />
          )}
          <Molecule bondLengthA={bond} showDipole={false} />
        </SceneCanvas>
      </div>

      <div className="relative z-10 p-6 md:p-10 max-w-xl">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--primary)]">
          03 — Dissociation
        </div>
        <h2 className="mt-2 text-4xl md:text-5xl font-semibold">
          Where does the charge go?
        </h2>
        <p className="mt-3 text-white/60 leading-relaxed">
          Stretch the bond. On the ground surface the closed-shell helium keeps
          both electrons (He + H⁺); on the excited surface you end up with He⁺ +
          H. The two characters swap through an avoided crossing near{" "}
          {AVOIDED_CROSSING_ANGSTROM.toFixed(1)} Å.
        </p>
        <p className="mt-3 font-mono text-xs text-white/50">
          Δρ shows how the density map <em>changes</em> as R grows — not a
          physical current (a stationary real eigenstate has none).
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm">
          <span className="text-white/50">asymptote →</span>
          <span className="text-[var(--primary)]">{asymptote}</span>
          {nearCrossing && (
            <span className="ml-2 rounded bg-[var(--primary)]/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-[var(--primary)]">
              avoided crossing
            </span>
          )}
        </div>
      </div>

      <div className="relative z-10 mt-auto p-6 md:p-10 flex flex-wrap gap-3">
        <BondSlider value={bond} onChange={setBond} />
        <Toggle
          title="Surface"
          value={state}
          onChange={(v) => setState(v as ElectronicState)}
          options={[
            { id: "X", label: "X¹Σ⁺ ground" },
            { id: "A", label: "A¹Σ⁺ excited" },
          ]}
        />
        <Toggle
          title="Field"
          value={mode}
          onChange={setMode}
          options={[
            { id: "difference", label: "Δρ flow" },
            { id: "density", label: "ρ density" },
          ]}
        />
      </div>
    </section>
  );
}
