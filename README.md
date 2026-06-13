# Helium Hydride (HeH⁺) Visualizer

An interactive Next.js + Three.js visualization of helium hydride — the first
molecule to form after the Big Bang, finally detected in space in 2019.

The landing page at `/` tells the origin story; `/molecule` is the viewer, with
four modes:

- Formation: drag neutral He and a proton together.
- Density skew: the electron probability cloud and dipole.
- Vibration: compare isotopologues through a mass-scaled DVR model.
- Dissociation: stretch the bond and watch the cloud collapse back onto helium.

The electron cloud is an analytical LCAO density sampled live by a Metropolis
walk; spectroscopic constants are kept in `lib/constants.ts` and surfaced in the
in-app Data & Methods panel.

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
  molecule-viewer.tsx      /molecule viewer shell and copy
  scenes/cosmic-origin.tsx landing narrative
  ui/controls.tsx          molecule controls
  viz/                     Three.js canvas, molecule visuals, effects
lib/
  constants.ts             spectroscopic anchors and UI constants
  physics/                 analytical density, DVR, and Monte-Carlo swarm
```

License: MIT (`LICENSE`). Reference and library notes: `CREDITS.md`.
