// Analytical electron-density sketch for HeH⁺.
//
// This is a fast LCAO-of-Slater-type-orbitals model used by the interactive
// swarm. It is calibrated for visual honesty and speed, not claimed as an
// ab-initio density grid.
//
// Model: ρ(r) = | c_He·χ_He(r−R_He) + c_H·χ_H(r−R_H) |²
//   χ(r) = √(ζ³/π)·exp(−ζ·|r|)      (NORMALISED 1s Slater orbital)
//   ζ in Å⁻¹: ζ_He ≈ 3.19 (He 1s is compact: Z_eff/a₀ ≈ 1.69/0.529), ζ_H ≈ 1.9.
// The bonding MO is strongly polarised toward He (c_H/c_He ≈ 0.3). This produces
// a clear visible skew: ≈1.6 e⁻ sit in the He half-space, ≈0.4 e⁻ in the H
// half-space (verified by numerical integration on a 140³ grid).
//
// NB this *spatial half-space* partition is a different measure from the ≈1.7 /
// 0.3 e⁻ MULLIKEN population quoted in constants.ts (which assigns basis-function
// density to atoms). Both express the same physics — electrons pile onto He —
// but they are not the same number and we do not claim they are.
//
// The model is parametrised by the He/H coefficient c_H so the SAME function can
// describe both a bonded HeH⁺ (c_H ≈ 0.3) and the formation process, where two
// atoms approach from afar: a neutral He cloud (c_H = 0, all density on He) that
// grows a bond toward an incoming proton as overlap increases (c_H → 0.3).

import { BOND_LENGTH_ANGSTROM } from "@/lib/constants";

export type Vec3 = [number, number, number];

/** A scalar field ρ(x,y,z) ≥ 0 in Ångström coordinates. */
export type DensityFn = (x: number, y: number, z: number) => number;

// Nuclei placed on the x-axis, centred at the origin, in Ångström.
export function nucleiPositions(bondLengthA = BOND_LENGTH_ANGSTROM): {
  he: Vec3;
  h: Vec3;
} {
  const half = bondLengthA / 2;
  return { he: [-half, 0, 0], h: [half, 0, 0] };
}

// Effective Slater exponents in INVERSE ÅNGSTRÖM (see header).
const ZETA_HE = 3.19;
const ZETA_H = 1.9;
// Default LCAO weights for the bonded molecule. Only the ratio matters (density
// is renormalised downstream). Tuned so the cloud sits ≈1.6 e⁻ / 0.4 e⁻ on He.
const C_HE = 1.0;
const C_H_BONDED = 0.3;

// Normalisation N = √(ζ³/π) for a 1s Slater χ(r) = N·exp(−ζr), ζ in Å⁻¹.
const N_HE = Math.sqrt((ZETA_HE * ZETA_HE * ZETA_HE) / Math.PI);
const N_H = Math.sqrt((ZETA_H * ZETA_H * ZETA_H) / Math.PI);

function slater(
  zeta: number,
  norm: number,
  dx: number,
  dy: number,
  dz: number,
): number {
  const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return norm * Math.exp(-zeta * r);
}

// Core density at a point (Å) given explicit nucleus positions and the He/H
// mixing coefficient c_H. c_H = 0 → pure helium cloud; c_H ≈ 0.3 → bonded HeH⁺.
export function densityCore(
  x: number,
  y: number,
  z: number,
  hePos: Vec3,
  hPos: Vec3,
  cH: number = C_H_BONDED,
  cHe: number = C_HE,
): number {
  const psi =
    cHe * slater(ZETA_HE, N_HE, x - hePos[0], y - hePos[1], z - hePos[2]) +
    cH * slater(ZETA_H, N_H, x - hPos[0], y - hPos[1], z - hPos[2]);
  return psi * psi;
}

// Build a reusable ρ(x,y,z) for fixed nucleus positions / coefficient — handed
// to the electron swarm so it can sample |ψ|² without re-specifying the model.
export function makeHehDensity(
  hePos: Vec3,
  hPos: Vec3,
  cH: number = C_H_BONDED,
  cHe: number = C_HE,
): DensityFn {
  return (x, y, z) => densityCore(x, y, z, hePos, hPos, cH, cHe);
}

// Electron density at a point (Å), for a bonded molecule at a given bond length.
export function densityAt(
  x: number,
  y: number,
  z: number,
  bondLengthA = BOND_LENGTH_ANGSTROM,
): number {
  const { he, h } = nucleiPositions(bondLengthA);
  return densityCore(x, y, z, he, h);
}

export type DensityGrid = {
  /** voxels per axis */
  size: number;
  /** half-width of the sampled cube, Å (cube spans [-extent, +extent]) */
  extentA: number;
  /** normalised density in [0,1], length size³, x-fastest */
  data: Float32Array;
  /** max raw density, for reference */
  maxValue: number;
};

// Sample the analytical density onto a cubic grid. Returns values normalised to
// [0,1] so the shader's transfer function is resolution-independent.
export function sampleDensityGrid(
  size = 64,
  extentA = 3.0,
  bondLengthA = BOND_LENGTH_ANGSTROM,
): DensityGrid {
  const data = new Float32Array(size * size * size);
  const step = (2 * extentA) / (size - 1);
  let max = 0;
  let idx = 0;
  for (let k = 0; k < size; k++) {
    const z = -extentA + k * step;
    for (let j = 0; j < size; j++) {
      const y = -extentA + j * step;
      for (let i = 0; i < size; i++) {
        const x = -extentA + i * step;
        const v = densityAt(x, y, z, bondLengthA);
        data[idx++] = v;
        if (v > max) max = v;
      }
    }
  }
  if (max > 0) for (let n = 0; n < data.length; n++) data[n] /= max;
  return { size, extentA, data, maxValue: max };
}
