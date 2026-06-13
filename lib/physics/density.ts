// Analytical LCAO electron density for HeH⁺.
//
//   ρ(r) = | c_He·χ_He(r−R_He) + c_H·χ_H(r−R_H) |²
//   χ(r) = √(ζ³/π)·exp(−ζ·|r|)   (normalised 1s Slater; ζ in Å⁻¹)
//
// c_H parametrises bond character: 0 = lone He cloud, ≈0.3 = bonded HeH⁺
// (strongly polarised toward He). Fast enough to sample live; not an
// ab-initio grid. Note the spatial half-space split (~1.6/0.4 e⁻) is a
// different measure from the Mulliken populations in constants.ts.

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

// Effective Slater exponents, Å⁻¹.
const ZETA_HE = 3.19;
const ZETA_H = 1.9;
// Bonded LCAO weights; only the ratio matters (renormalised downstream).
const C_HE = 1.0;
const C_H_BONDED = 0.3;

// He/H mixing vs separation: full bond character at re, fading to a lone He
// cloud once orbital overlap is gone.
export function bondCharacter(
  R: number,
  cMax = C_H_BONDED,
  rOverlap = 2.5,
): number {
  if (R >= rOverlap) return 0;
  if (R <= BOND_LENGTH_ANGSTROM) return cMax;
  return (cMax * (rOverlap - R)) / (rOverlap - BOND_LENGTH_ANGSTROM);
}

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

// Density at a point (Å) for given nucleus positions and mixing coefficient.
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

// ρ(x,y,z) closure for fixed nuclei / coefficient, consumed by the swarm.
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
