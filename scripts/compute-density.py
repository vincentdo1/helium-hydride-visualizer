#!/usr/bin/env python3
"""Offline electron-density pipeline for HeH+ (SKELETON).

HeH+ has only TWO electrons, so FCI is exact within the basis and identical to
CCSD; a (T) correction is identically zero. Rigour therefore comes from basis
quality + calibration to the non-Born-Oppenheimer literature.

This script:
  1. scans the bond length,
  2. runs FCI (== CCSD for 2 e-) at each geometry,
  3. samples the electron density rho(r) onto a 3D grid,
  4. writes Float16 .bin cubes + a manifest the web app's data-loader reads.

Run offline (not in the browser / web session):
    pip install pyscf numpy
    python scripts/compute-density.py --out ../data

The TODOs mark the spots to finish. Literature cross-checks are asserted so a
bad run fails loudly instead of shipping wrong numbers.
"""
from __future__ import annotations

import argparse
import json
import os

import numpy as np

# Literature benchmarks (see lib/constants.ts for citations).
RE_ANGSTROM = 0.7743          # Pachucki 2012
DE_EV = 2.04                  # Stanke 2006
DIPOLE_DEBYE_COM = 1.66       # Engel 2005 (about centre of mass)
WE_CM = 3228.3                # Bishop & Cheung 1979

BOHR = 0.529177210903         # Angstrom per Bohr


def build_mol(r_angstrom: float, basis: str = "aug-cc-pv5z"):
    """Construct the HeH+ molecule at a given bond length."""
    from pyscf import gto

    mol = gto.M(
        atom=f"He 0 0 0; H 0 0 {r_angstrom}",
        charge=1,
        spin=0,
        basis=basis,
        unit="Angstrom",
        verbose=0,
    )
    return mol


def fci_energy_and_density(mol, grid_coords_bohr: np.ndarray):
    """Return (E_total_hartree, rho_on_grid, dipole_debye_com).

    For a 2-electron system FCI == CCSD == exact-in-basis. We use a RHF
    reference + FCISolver, then evaluate the FCI 1-RDM on the AO grid.
    """
    from pyscf import scf, fci, ao2mo

    mf = scf.RHF(mol).run()

    # TODO: full FCI 1-RDM. Sketch:
    #   h1 = mf.mo_coeff.T @ mf.get_hcore() @ mf.mo_coeff
    #   eri = ao2mo.kernel(mol, mf.mo_coeff)
    #   cisolver = fci.FCI(mol, mf.mo_coeff)
    #   e_fci, civec = cisolver.kernel(h1, eri, mol.nao, mol.nelec, ecore=mol.energy_nuc())
    #   dm1_mo = cisolver.make_rdm1(civec, mol.nao, mol.nelec)
    #   dm1_ao = mf.mo_coeff @ dm1_mo @ mf.mo_coeff.T
    # For the skeleton we fall back to the RHF density (exact-in-basis is the
    # upgrade). Replace `dm1_ao` and `e_total` below with the FCI quantities.
    dm1_ao = mf.make_rdm1()
    e_total = mf.e_tot

    ao = mol.eval_gto("GTOval", grid_coords_bohr)  # (ngrid, nao)
    rho = np.einsum("pi,ij,pj->p", ao, dm1_ao, ao)  # (ngrid,)

    # Dipole about the centre of mass (origin-dependent for an ion!).
    # TODO: shift origin to the centre of mass before calling mf.dip_moment.
    dip = mf.dip_moment(unit="Debye")  # currently about the default origin
    dipole_com = float(np.linalg.norm(dip))

    return e_total, rho, dipole_com


def make_grid(extent_angstrom: float, size: int) -> np.ndarray:
    """Cubic grid of coordinates in Bohr, x-fastest (matches the web loader)."""
    lin = np.linspace(-extent_angstrom, extent_angstrom, size) / BOHR
    z, y, x = np.meshgrid(lin, lin, lin, indexing="ij")
    return np.stack([x.ravel(), y.ravel(), z.ravel()], axis=1)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="../data")
    ap.add_argument("--size", type=int, default=64)
    ap.add_argument("--extent", type=float, default=3.0, help="Angstrom")
    ap.add_argument("--rmin", type=float, default=0.5)
    ap.add_argument("--rmax", type=float, default=6.0)
    ap.add_argument("--step", type=float, default=0.05)
    ap.add_argument("--basis", default="aug-cc-pv5z")
    ap.add_argument("--web-size", type=int, default=64, help="downsample for web")
    args = ap.parse_args()

    density_dir = os.path.join(args.out, "density")
    os.makedirs(density_dir, exist_ok=True)

    grid = make_grid(args.extent, args.size)
    rs = np.round(np.arange(args.rmin, args.rmax + 1e-9, args.step), 4)

    manifest = {
        "size": args.size,
        "extentAngstrom": args.extent,
        "basis": args.basis,
        "method": "FCI (== CCSD for 2 electrons)",
        "R": [],
        "files": [],
        "energyEv": [],
        "dipoleDebyeCom": [],
    }

    energies = {}
    for i, r in enumerate(rs):
        mol = build_mol(float(r), args.basis)
        e_h, rho, dip = fci_energy_and_density(mol, grid)
        energies[float(r)] = e_h

        # Normalise + store as Float16 to keep the web payload small.
        rho16 = (rho / max(rho.max(), 1e-12)).astype(np.float16)
        fname = f"R_{i:03d}.bin"
        rho16.tofile(os.path.join(density_dir, fname))

        manifest["R"].append(float(r))
        manifest["files"].append(f"density/{fname}")
        manifest["dipoleDebyeCom"].append(dip)
        print(f"R={r:.2f} A  E={e_h:.6f} Ha  mu={dip:.3f} D")

    # Convert energies to eV relative to the minimum.
    e_min = min(energies.values())
    HARTREE_EV = 27.211386245988
    manifest["energyEv"] = [
        (energies[float(r)] - e_min) * HARTREE_EV for r in rs
    ]

    # --- Literature cross-checks (fail loudly on a bad run) ---------------
    r_at_min = min(energies, key=energies.get)
    assert abs(r_at_min - RE_ANGSTROM) < 0.05, (
        f"equilibrium bond length {r_at_min:.4f} A is off from {RE_ANGSTROM} A — "
        "check basis / scan resolution"
    )
    # TODO: once FCI dipole is implemented, assert:
    #   assert abs(manifest['dipoleDebyeCom'][argmin] - DIPOLE_DEBYE_COM) < 0.1

    with open(os.path.join(args.out, "density-manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"wrote {len(rs)} density grids + manifest to {args.out}")


if __name__ == "__main__":
    main()
