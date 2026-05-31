# Helium Hydride (HeH⁺) — Interactive 3D Visualizer

A state-of-the-art, scientifically grounded visualization of **helium hydride**,
the first molecule to form in the universe. Companion to the `CHM-005` project
on [vmd306.com](https://vmd306.com); the portfolio links here via
`NEXT_PUBLIC_HEH_VIZ_URL` with scene deep-links (`#density`, `#vibrational`,
`#dissociation`, `#cosmos`).

> **Status: runnable skeleton.** The scenes render now on an **analytical LCAO
> density** placeholder. The offline PySCF/DVR pipeline in `scripts/` upgrades
> this to **ab-initio FCI** density and spectroscopically accurate vibrational
> states. HeH⁺ has only two electrons, so FCI is exact within the basis and
> identical to CCSD — rigour comes from basis quality + literature calibration.

## Four scenes

1. **Density skew** (`#density`) — ray-marched volume render of ρ(r); electrons
   pile onto He despite the proton carrying the formal charge.
2. **Vibration & isotopes** (`#vibrational`) — live sinc-DVR solve; swap
   ⁴HeH⁺/⁴HeD⁺/⁴HeT⁺/³HeH⁺ to see ZPE drop and ψ₀ localise.
3. **Dissociation** (`#dissociation`) — scrub the bond length; the difference
   density Δρ shows charge redistribution toward the He+H⁺ / He⁺+H asymptotes.
   (Δρ is _not_ a physical current — a stationary real eigenstate carries none.)
4. **Cosmic origin** (`#cosmos`) — scroll-driven narrative from recombination to
   the 2019 NGC 7027 detection.

## Develop

```bash
npm install
npm run dev        # http://localhost:3010
npm run build
```

## Generate real data (offline)

```bash
pip install pyscf numpy scipy
python scripts/compute-density.py --out ./data        # FCI density grids + PES
python scripts/solve-dvr.py --manifest ./data/density-manifest.json --out ./data/vibrational
```

Then point `lib/data-loader.ts` at the generated `data/` assets (the function
signatures already match). Large binaries are tracked with **Git LFS** — run
`git lfs install` first (see `.gitattributes`).

## Architecture

```
app/                     Next.js app-router shell
components/
  scene-host.tsx         scroll host + deep-link nav + code-split scenes
  scenes/                cosmic-origin · density · vibrational · dissociation
  viz/                   volume-renderer (GLSL ray-march) · molecule · canvas
  ui/                    controls · data-methods drawer
lib/
  constants.ts           verified spectroscopic constants + citations
  data-loader.ts         interface to offline pipeline (placeholder-backed)
  physics/               density (analytical LCAO) · dvr (sinc-DVR)
scripts/                 PySCF density + DVR generators (run offline)
data/                    generated assets (Git LFS)
```

License: MIT (`LICENSE`). Asset attribution: `CREDITS.md`.
