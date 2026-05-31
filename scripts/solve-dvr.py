#!/usr/bin/env python3
"""Vibrational eigenstates of HeH+ and isotopologues via sinc-DVR (SKELETON).

Mirrors lib/physics/dvr.ts but is meant to run on the REAL FCI potential curve
produced by compute-density.py (data/density-manifest.json -> energyEv), giving
spectroscopically accurate ZPE / fundamentals for each isotopologue.

Run offline:
    pip install numpy scipy
    python scripts/solve-dvr.py --manifest ../data/density-manifest.json --out ../data/vibrational

Literature cross-checks are asserted (ZPE magnitude and HeH+/HeD+ ZPE ratio).
"""
from __future__ import annotations

import argparse
import json
import os

import numpy as np

# Physical constants (SI) + spectroscopy.
AMU = 1.66053906660e-27
HBAR = 1.054571817e-34
C_CM = 2.99792458e10
ANG = 1e-10
EV_J = 1.602176634e-19

WE_CM = 3228.3  # Bishop & Cheung 1979

# Atomic masses (amu, AME2020).
M = {"He4": 4.002602, "He3": 3.016029, "H": 1.007825, "D": 2.014102, "T": 3.016049}
ISOTOPOLOGUES = {
    "4HeH": ("He4", "H"),
    "4HeD": ("He4", "D"),
    "4HeT": ("He4", "T"),
    "3HeH": ("He3", "H"),
}


def reduced_mass(a: str, b: str) -> float:
    return M[a] * M[b] / (M[a] + M[b])


def sinc_dvr(r_ang: np.ndarray, v_joule: np.ndarray, mu_amu: float, n_states: int):
    """Colbert-Miller sinc-DVR on a uniform grid.

    `v_joule` must be referenced so its minimum is 0. Returns (E_cm, psi) where
    E_cm are eigenvalues relative to the potential minimum (so E_cm[0] == ZPE).
    """
    n = len(r_ang)
    dx = (r_ang[1] - r_ang[0]) * ANG
    mu = mu_amu * AMU
    pref = HBAR**2 / (2 * mu * dx**2)

    i = np.arange(n)
    diff = i[:, None] - i[None, :]
    with np.errstate(divide="ignore", invalid="ignore"):
        T = pref * 2 * (-1.0) ** diff / np.where(diff == 0, 1, diff) ** 2
    np.fill_diagonal(T, pref * np.pi**2 / 3)

    H = T + np.diag(v_joule)
    evals, evecs = np.linalg.eigh(H)

    e_cm = evals[:n_states] / (HBAR * 2 * np.pi * C_CM)  # relative to V_min = 0
    psi = evecs[:, :n_states]
    psi /= np.sqrt((psi**2).sum(axis=0) * (r_ang[1] - r_ang[0]))[None, :]
    return e_cm, psi


def load_potential(manifest_path: str):
    with open(manifest_path) as fh:
        man = json.load(fh)
    return np.array(man["R"], float), np.array(man["energyEv"], float)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", default="../data/density-manifest.json")
    ap.add_argument("--out", default="../data/vibrational")
    ap.add_argument("--n-states", type=int, default=6)
    ap.add_argument("--n-grid", type=int, default=201)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    r_scan, e_ev = load_potential(args.manifest)

    # Dense, uniform grid around the well for the DVR (interpolate the PES).
    r_fine = np.linspace(0.45, 2.0, args.n_grid)
    v_ev = np.interp(r_fine, r_scan, e_ev)
    v_joule = (v_ev - v_ev.min()) * EV_J

    zpes: dict[str, float] = {}
    for name, (a, b) in ISOTOPOLOGUES.items():
        mu = reduced_mass(a, b)
        e_cm, psi = sinc_dvr(r_fine, v_joule, mu, args.n_states)
        zpes[name] = float(e_cm[0])
        out = {
            "isotopologue": name,
            "reducedMassAmu": mu,
            "zpeCm": float(e_cm[0]),
            "energiesCm": [float(x) for x in e_cm],
            "grid": [float(x) for x in r_fine],
            "psi": [[float(p) for p in psi[:, s]] for s in range(args.n_states)],
        }
        with open(os.path.join(args.out, f"{name}.json"), "w") as fh:
            json.dump(out, fh)
        print(f"{name}: mu={mu:.4f} amu  ZPE={e_cm[0]:.1f} cm^-1")

    # --- Literature cross-checks -----------------------------------------
    # Harmonic ZPE ~ omega_e/2; allow generous tolerance for anharmonicity.
    assert 1400 < zpes["4HeH"] < 1700, (
        f"4HeH+ ZPE {zpes['4HeH']:.0f} cm^-1 unreasonable vs omega_e/2 ~ {WE_CM / 2:.0f}"
    )
    ratio = zpes["4HeD"] / zpes["4HeH"]
    expected = np.sqrt(reduced_mass("He4", "H") / reduced_mass("He4", "D"))
    assert abs(ratio - expected) < 0.05, (
        f"ZPE ratio HeD/HeH {ratio:.3f} differs from sqrt(mu) prediction {expected:.3f}"
    )
    print("literature cross-checks passed")


if __name__ == "__main__":
    main()
