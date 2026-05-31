// Electron "swarm" — a live point cloud sampled from |ψ|² for HeH⁺.
//
// HeH⁺ has exactly TWO electrons. Rather than fake Bohr-style orbits (which are
// physically wrong), we draw a cloud of probe points distributed according to a
// real electron density ρ(r) = |ψ|², evolved by a Metropolis random walk. Each
// point is an honest Monte-Carlo sample of "where an electron is likely to be"
// — so the cloud crowds wherever the density is high. For the bonded molecule
// that means it piles onto helium; during formation it starts on the lone He
// atom and grows toward the incoming proton as the bond forms.
//
// This is a probability-density visualisation, not a trajectory: the points do
// not trace electron paths (a stationary real eigenstate carries no current).
//
// The walker is density-agnostic: callers pass any ρ(x,y,z) (see
// lib/physics/density.ts → makeHehDensity), so the same swarm drives every mode.

import type { DensityFn, Vec3 } from "@/lib/physics/density";

export type SwarmSeed = {
  /** gaussian centre, Å */
  center: Vec3;
  /** gaussian spread, Å */
  spread: number;
  /** relative probability a point is seeded here */
  weight: number;
};

export type SwarmState = {
  count: number;
  /** point positions, Ångström, length count·3 (x-fastest) */
  posA: Float32Array;
  /** last accepted density at each point (Metropolis ratio cache) */
  density: Float32Array;
  /** reject proposals outside ±extent so the cloud stays compact, Å */
  extentA: number;
  /** Metropolis proposal step size, Å */
  stepA: number;
};

// Standard normal via Box–Muller.
function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Seed the cloud from the weighted gaussian seeds, then run a few equilibration
// sweeps so it already sits on ρ before the first frame is drawn.
export function createSwarm(
  count: number,
  seeds: SwarmSeed[],
  density: DensityFn,
  opts: { extentA?: number; stepA?: number; warmup?: number } = {},
): SwarmState {
  const extentA = opts.extentA ?? 3;
  const stepA = opts.stepA ?? 0.12;
  const posA = new Float32Array(count * 3);
  const dens = new Float32Array(count);

  const totalWeight = seeds.reduce((s, x) => s + x.weight, 0) || 1;
  for (let i = 0; i < count; i++) {
    // pick a seed by weight
    let r = Math.random() * totalWeight;
    let k = 0;
    while (k < seeds.length - 1 && r > seeds[k].weight) {
      r -= seeds[k].weight;
      k++;
    }
    const sd = seeds[k];
    const x = sd.center[0] + gaussian() * sd.spread;
    const y = sd.center[1] + gaussian() * sd.spread;
    const z = sd.center[2] + gaussian() * sd.spread;
    posA[i * 3] = x;
    posA[i * 3 + 1] = y;
    posA[i * 3 + 2] = z;
    dens[i] = density(x, y, z);
  }

  const s: SwarmState = { count, posA, density: dens, extentA, stepA };
  const warmup = opts.warmup ?? 8;
  for (let w = 0; w < warmup; w++) stepSwarm(s, density, 1);
  return s;
}

// One (or more) Metropolis sweeps in place against the supplied density. Propose
// a small Gaussian hop per point; accept with probability min(1, ρ_new/ρ_old).
// The stationary distribution is exactly ρ ∝ |ψ|². The density may change
// between frames (formation drag / dissociation scrub / vibration) — the walk
// simply re-equilibrates toward the new target.
export function stepSwarm(
  s: SwarmState,
  density: DensityFn,
  iterations = 1,
): void {
  const { posA, density: cache, count, extentA, stepA } = s;
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const nx = posA[ix] + gaussian() * stepA;
      const ny = posA[ix + 1] + gaussian() * stepA;
      const nz = posA[ix + 2] + gaussian() * stepA;
      if (
        Math.abs(nx) > extentA ||
        Math.abs(ny) > extentA ||
        Math.abs(nz) > extentA
      )
        continue;
      const dNew = density(nx, ny, nz);
      const dOld = cache[i];
      if (dNew >= dOld || Math.random() < dNew / (dOld + 1e-30)) {
        posA[ix] = nx;
        posA[ix + 1] = ny;
        posA[ix + 2] = nz;
        cache[i] = dNew;
      }
    }
  }
}
