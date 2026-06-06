// Vibrational eigenstates on a 1D potential via sinc-DVR (Colbert–Miller).
//
// V1 uses the kinetic-energy matrix with a harmonic potential anchored to the
// literature frequency, so the isotope controls render real, mass-dependent
// wavefunctions immediately.
//
// Colbert & Miller (1992) J. Chem. Phys. 96, 1982 — DVR on [−∞,∞].

import {
  AMU_TO_KG,
  BOND_LENGTH_ANGSTROM,
  C_CM,
  HARMONIC_FREQUENCY_CM,
  HBAR,
  MU_REF_AMU,
} from "@/lib/constants";

export type VibrationalState = {
  v: number;
  energyCm: number; // eigenvalue relative to potential minimum, cm⁻¹
  grid: Float32Array; // R grid, Å
  psi: Float32Array; // normalised wavefunction on the grid
};

// Harmonic placeholder potential V(R) in Joules, minimum at re.
// The force constant k is a property of the electronic PES and is therefore
// MASS-INDEPENDENT (Born–Oppenheimer). We pin it to ωe of the reference
// isotopologue (⁴HeH⁺): k = μ_ref·ω². Heavier isotopologues then get a smaller
// vibrational frequency ω = √(k/μ) purely from the μ-dependent kinetic term in
// the DVR — so the ladder compresses and the ZPE drops with mass, which is the
// whole point of the isotope view. (Using the per-isotope μ here instead would
// cancel that effect and give every isotopologue the same ωe — wrong.)
const FORCE_CONSTANT_N_PER_M =
  MU_REF_AMU *
  AMU_TO_KG *
  Math.pow(2 * Math.PI * C_CM * HARMONIC_FREQUENCY_CM, 2);

function harmonicPotential(R: number): number {
  const dRm = (R - BOND_LENGTH_ANGSTROM) * 1e-10; // metres
  return 0.5 * FORCE_CONSTANT_N_PER_M * dRm * dRm;
}

// Solve the lowest `nStates` vibrational levels for a given reduced mass.
// `potential` is the Born–Oppenheimer PES V(R) in Joules (mass-independent — the
// same curve for every isotopologue); it defaults to the harmonic placeholder.
// A future data-backed version can pass an interpolated ab-initio curve here.
export function solveVibrational(
  reducedMassAmu: number,
  nStates = 4,
  potential: (R: number) => number = harmonicPotential,
  opts: { nGrid?: number; rMinA?: number; rMaxA?: number } = {},
): VibrationalState[] {
  const nGrid = opts.nGrid ?? 121;
  const rMin = opts.rMinA ?? 0.35;
  const rMax = opts.rMaxA ?? 1.8;

  const dxA = (rMax - rMin) / (nGrid - 1);
  const dx = dxA * 1e-10; // metres
  const mu = reducedMassAmu * AMU_TO_KG;
  const grid = new Float32Array(nGrid);
  for (let i = 0; i < nGrid; i++) grid[i] = rMin + i * dxA;

  // Hamiltonian H = T + V (dense, symmetric). Colbert–Miller kinetic matrix:
  //   T_ii = (ħ²/2μ)(π²/3)/dx²
  //   T_ij = (ħ²/2μ)(2/dx²)(−1)^(i−j)/(i−j)²   (i≠j)
  const pref = (HBAR * HBAR) / (2 * mu * dx * dx);
  const H: number[][] = Array.from({ length: nGrid }, () =>
    new Array(nGrid).fill(0),
  );
  for (let i = 0; i < nGrid; i++) {
    for (let j = 0; j < nGrid; j++) {
      if (i === j) {
        H[i][j] = (pref * (Math.PI * Math.PI)) / 3 + potential(grid[i]);
      } else {
        const d = i - j;
        H[i][j] = pref * 2 * (((d & 1) === 0 ? 1 : -1) / (d * d));
      }
    }
  }

  const { values, vectors } = jacobiEigen(H);
  const order = values
    .map((e, i) => [e, i] as const)
    .sort((a, b) => a[0] - b[0]);

  const jToCm = 1 / (HBAR * 2 * Math.PI * C_CM); // J → cm⁻¹
  const e0 = order[0][0];

  const states: VibrationalState[] = [];
  for (let s = 0; s < Math.min(nStates, nGrid); s++) {
    const [eig, col] = order[s];
    const psi = new Float32Array(nGrid);
    let norm = 0;
    for (let i = 0; i < nGrid; i++) {
      psi[i] = vectors[i][col];
      norm += psi[i] * psi[i] * dxA;
    }
    const inv = 1 / Math.sqrt(norm);
    for (let i = 0; i < nGrid; i++) psi[i] *= inv;
    states.push({ v: s, energyCm: (eig - e0) * jToCm, grid, psi });
  }
  return states;
}

// Symmetric-matrix eigensolver (cyclic Jacobi). Fine for the small (~121²)
// DVR matrices used here; not intended for large systems.
function jacobiEigen(input: number[][]): {
  values: number[];
  vectors: number[][];
} {
  const n = input.length;
  const a = input.map((row) => row.slice());
  const v: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );

  // Convergence is judged RELATIVE to the matrix magnitude. The Hamiltonian is
  // in Joules (entries ~1e-19), so an absolute threshold like 1e-20 would be
  // satisfied before any rotation runs — returning the un-diagonalised diagonal
  // (this was a real bug: it made every vibrational spacing collapse to ~tens of
  // cm⁻¹). Scaling by the Frobenius norm makes the test resolution-independent.
  let scale = 0;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) scale += a[i][j] * a[i][j];
  const offTol = 1e-22 * scale; // stop when off-diagonal weight is negligible
  const skipTol = 1e-30 * scale; // skip rotations on already-tiny elements

  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n - 1; p++)
      for (let q = p + 1; q < n; q++) off += a[p][q] * a[p][q];
    if (off < offTol) break;

    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        if (a[p][q] * a[p][q] < skipTol) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t =
          Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let i = 0; i < n; i++) {
          const aip = a[i][p];
          const aiq = a[i][q];
          a[i][p] = c * aip - s * aiq;
          a[i][q] = s * aip + c * aiq;
        }
        for (let i = 0; i < n; i++) {
          const api = a[p][i];
          const aqi = a[q][i];
          a[p][i] = c * api - s * aqi;
          a[q][i] = s * api + c * aqi;
        }
        for (let i = 0; i < n; i++) {
          const vip = v[i][p];
          const viq = v[i][q];
          v[i][p] = c * vip - s * viq;
          v[i][q] = s * vip + c * viq;
        }
      }
    }
  }

  const values = a.map((row, i) => row[i]);
  return { values, vectors: v };
}
