# Helium Hydride (HeH+) Interactive Visualizer

An interactive Next.js + Three.js visualization of helium hydride, the molecular
ion widely described as the first molecular bond of the early universe.

V1 is intentionally compact: a short cosmic-origin landing page at `/`, then a
single molecule instrument at `/molecule` with four modes:

- Formation: drag neutral He and a proton together.
- Density skew: inspect the electron probability cloud and dipole.
- Vibration: compare isotopologues through a mass-scaled DVR sketch.
- Dissociation: stretch the bond and watch density collapse back to helium.

The live cloud is an analytical, literature-calibrated model designed for fast
browser interaction. It is not a shipped ab-initio density grid.

## Develop

```bash
npm install
npm run dev
npm run build
npm run lint
```

The dev server runs on [http://localhost:3010](http://localhost:3010).

## Project Structure

```text
app/                       Next.js app-router pages and global styles
components/
  scene-host.tsx           landing page host and legacy hash forwarding
  molecule-viewer.tsx      /molecule instrument shell and copy
  scenes/cosmic-origin.tsx landing narrative
  ui/controls.tsx          current molecule controls
  viz/                     Three.js canvas, molecule visuals, effects
lib/
  constants.ts             literature anchors and UI constants
  physics/                 analytical density, DVR, and Monte-Carlo swarm
```

## Scientific Anchors

- HeH+ formation in the early universe: neutral helium + proton radiative
  association.
- First astrophysical detection: SOFIA/upGREAT observation of the J = 1-0 line
  toward NGC 7027, published in Nature in 2019.
- Structural and spectroscopic constants are kept in `lib/constants.ts` with
  source labels surfaced in the in-app Data & Methods panel.

License: MIT (`LICENSE`). Reference and library notes: `CREDITS.md`.
