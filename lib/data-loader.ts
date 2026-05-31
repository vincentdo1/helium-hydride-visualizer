// Data-loading interface between the offline PySCF/DVR pipeline and the viewer.
//
// SKELETON: `loadDensityGrid` and `loadPotentialCurves` currently synthesise
// data from the analytical model so the app runs with zero external assets.
// When scripts/compute-density.py and scripts/solve-dvr.py have produced real
// outputs in data/, replace the bodies with fetch()+decode of those binaries
// (Float16 density cubes) and JSON (potential/dipole curves). Keep the SAME
// return types so no UI component needs to change.

import { sampleDensityGrid, type DensityGrid } from "@/lib/physics/density";
import type { ElectronicState } from "@/lib/constants";

export type PotentialCurve = {
  state: ElectronicState;
  /** internuclear distance grid, Å */
  R: number[];
  /** energy relative to the global minimum, eV */
  energyEv: number[];
  /** dipole moment about the centre of mass, Debye (ground state only) */
  dipoleDebye?: number[];
};

// --- Density --------------------------------------------------------------
// Real implementation: fetch `/data/density/R_${index}.bin` (Float16, size³),
// decode to Float32, normalise. For now, synthesise analytically per bond length.
export async function loadDensityGrid(
  bondLengthA: number,
  size = 64,
): Promise<DensityGrid> {
  return sampleDensityGrid(size, 3.0, bondLengthA);
}

// --- Potential energy curves ---------------------------------------------
// Real implementation: fetch `/data/pes/curves.json`. Placeholder: a Morse-like
// ground curve and a repulsive-then-bound excited curve crossing near ~3.9 Å,
// good enough to drive the dissociation UI before MRCI data lands.
export async function loadPotentialCurves(): Promise<PotentialCurve[]> {
  const R: number[] = [];
  for (let r = 0.4; r <= 6.0001; r += 0.05) R.push(Number(r.toFixed(2)));

  const De = 2.04;
  const a = 1.8;
  const re = 0.7743;
  const ground = R.map((r) => {
    const x = 1 - Math.exp(-a * (r - re));
    return De * x * x - De; // Morse, min −De at re, → 0 at large R
  });

  // Crude excited curve: bound well shifted up, correlating to He⁺+H higher
  // asymptote. Placeholder only — replace with CASSCF/MRCI.
  const excited = R.map((r) => {
    const x = 1 - Math.exp(-1.3 * (r - 1.05));
    return 11.5 * x * x - 11.5 + 9.6;
  });

  return [
    { state: "X", R, energyEv: ground, dipoleDebye: R.map(() => 1.66) },
    { state: "A", R, energyEv: excited },
  ];
}

// --- Difference density (charge-redistribution flow) ----------------------
// Δρ(r) = ρ(R+ΔR) − ρ(R). NB: a stationary real eigenstate carries NO current
// (j ≡ 0); this visualises how the density map *changes* between snapshots, not
// a physical electronic flux. Honest framing — see the Data & Methods drawer.
export async function loadDifferenceDensity(
  bondLengthA: number,
  deltaA = 0.1,
  size = 64,
): Promise<DensityGrid> {
  const a = await loadDensityGrid(bondLengthA, size);
  const b = await loadDensityGrid(bondLengthA + deltaA, size);
  const data = new Float32Array(a.data.length);
  let max = 0;
  for (let i = 0; i < data.length; i++) {
    data[i] = b.data[i] - a.data[i];
    const m = Math.abs(data[i]);
    if (m > max) max = m;
  }
  // Map signed Δρ into [0,1] around 0.5 so the shader can colour gain vs loss.
  if (max > 0)
    for (let i = 0; i < data.length; i++) data[i] = 0.5 + 0.5 * (data[i] / max);
  return { size, extentA: a.extentA, data, maxValue: max };
}
