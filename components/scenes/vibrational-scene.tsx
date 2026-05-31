"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { SceneCanvas } from "@/components/viz/scene-canvas";
import { Molecule } from "@/components/viz/molecule";
import { IsotopeSelector } from "@/components/ui/controls";
import { solveVibrational } from "@/lib/physics/dvr";
import { ISOTOPOLOGUES, BOND_LENGTH_ANGSTROM } from "@/lib/constants";
import type { Group } from "three";

// Molecule whose bond length oscillates within the v=0 classical turning points,
// giving a felt sense of the zero-point motion for the chosen isotopologue.
function VibratingMolecule({ amplitudeA }: { amplitudeA: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const r = BOND_LENGTH_ANGSTROM + amplitudeA * Math.sin(t * 3);
    // re-render molecule by scaling along x is cheap; here we just nudge the
    // group scale on x as a lightweight proxy for the changing bond length.
    ref.current.scale.x = r / BOND_LENGTH_ANGSTROM;
  });
  return (
    <group ref={ref}>
      <Molecule bondLengthA={BOND_LENGTH_ANGSTROM} showDipole={false} />
    </group>
  );
}

export function VibrationalScene() {
  const [iso, setIso] = useState(ISOTOPOLOGUES[0]);

  // Lowest few vibrational states on the (placeholder harmonic) PES.
  const states = useMemo(
    () => solveVibrational(iso.reducedMass, 4),
    [iso.reducedMass],
  );

  // v=0 turning-point amplitude ~ extent where ψ₀ falls to ~e⁻¹ of its peak.
  const amplitudeA = useMemo(() => {
    const psi0 = states[0];
    const peak = Math.max(...Array.from(psi0.psi).map(Math.abs));
    let lo = psi0.grid[0];
    let hi = psi0.grid[psi0.grid.length - 1];
    for (let i = 0; i < psi0.grid.length; i++) {
      if (Math.abs(psi0.psi[i]) > peak * 0.37) {
        lo = psi0.grid[i];
        break;
      }
    }
    for (let i = psi0.grid.length - 1; i >= 0; i--) {
      if (Math.abs(psi0.psi[i]) > peak * 0.37) {
        hi = psi0.grid[i];
        break;
      }
    }
    return (hi - lo) / 2;
  }, [states]);

  return (
    <section id="vibrational" className="scene flex flex-col lg:flex-row">
      <div className="relative h-[55vh] lg:h-auto lg:w-1/2">
        <SceneCanvas enableZoom={false}>
          <VibratingMolecule amplitudeA={amplitudeA} />
        </SceneCanvas>
      </div>

      <div className="relative z-10 flex flex-col gap-4 p-6 md:p-10 lg:w-1/2 lg:justify-center">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--primary)]">
            02 — Vibration &amp; isotopes
          </div>
          <h2 className="mt-2 text-4xl md:text-5xl font-semibold">
            Heavier nuclei sit lower
          </h2>
          <p className="mt-3 text-white/60 leading-relaxed">
            Zero-point energy scales as √(k/μ). Swap the isotopologue and watch
            the ground-state wavefunction localise and the vibrational ladder
            compress as the reduced mass grows.
          </p>
        </div>

        <PesPlot states={states} />

        <IsotopeSelector value={iso} onChange={setIso} />
      </div>
    </section>
  );
}

// Lightweight SVG plot: vibrational energy levels with |ψ|² envelopes.
function PesPlot({ states }: { states: ReturnType<typeof solveVibrational> }) {
  const W = 360;
  const H = 200;
  const grid = states[0].grid;
  const rMin = grid[0];
  const rMax = grid[grid.length - 1];
  const eMax = Math.max(...states.map((s) => s.energyCm)) * 1.25 || 1;

  const x = (r: number) => ((r - rMin) / (rMax - rMin)) * W;
  const y = (e: number) => H - (e / eMax) * H;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full rounded-md border border-white/10 bg-black/40"
    >
      {states.map((s, i) => {
        const peak = Math.max(...Array.from(s.psi).map(Math.abs)) || 1;
        const pts = Array.from(s.grid)
          .map((r, j) => {
            const amp = (s.psi[j] * s.psi[j]) / (peak * peak);
            return `${x(r).toFixed(1)},${(y(s.energyCm) - amp * 26).toFixed(1)}`;
          })
          .join(" ");
        return (
          <g key={i}>
            <line
              x1={0}
              x2={W}
              y1={y(s.energyCm)}
              y2={y(s.energyCm)}
              stroke="rgba(255,255,255,0.18)"
              strokeDasharray="3 3"
            />
            <polyline
              points={pts}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={1.5}
              opacity={0.9 - i * 0.15}
            />
            <text x={4} y={y(s.energyCm) - 3} fontSize={9} fill="#ffffff80">
              v={s.v} · {Math.round(s.energyCm)} cm⁻¹
            </text>
          </g>
        );
      })}
    </svg>
  );
}
