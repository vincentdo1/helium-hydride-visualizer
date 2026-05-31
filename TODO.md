# HeH⁺ visualizer — progress

## Done — MolView-style instrument rebuild (2026-05-29)

Reframed from "scroll through 4 scenes" → **landing page → single persistent
molecule instrument** (the user's MolView reference + electron-swarm idea).

### New files

- `lib/physics/swarm.ts` — Metropolis Monte-Carlo electron swarm sampled from the
  real |ψ|². `createSwarm` / `stepSwarm`. Honest probability-density viz (not Bohr
  orbits, not trajectories).
- `components/viz/heh-molecule.tsx` — the bonded 3D instrument.
- `components/molecule-viewer.tsx` — `/molecule` page: 3D stage + sidebar tabs.
- `app/molecule/page.tsx` — the route.
- `.claude/launch.json` — preview dev server (`npm run dev`, port 3010).

### Edited

- `lib/constants.ts` — added `ANGSTROM_TO_SCENE`, `VIEWER_MODES`, `ViewerMode`.
- `components/scene-host.tsx` — landing page only: cosmic intro + CTA; forwards
  legacy `/#density` etc. → `/molecule#...`.

### Physics bugs found + fixed (pre-existing in the skeleton)

1. **`lib/physics/density.ts`** — ζ was in atomic units but applied to Å
   distances, orbitals un-normalised → cloud barely leaned. Fixed: normalised 1s
   Slaters, ζ in Å⁻¹ (3.19/1.9), c_H/c_He ≈ 0.3 → ~1.6 e⁻ He / 0.4 e⁻ H
   half-space (verified on a 140³ grid). Comment is honest that this spatial
   partition ≠ the Mulliken number in constants.ts.
2. **`lib/physics/dvr.ts` Jacobi never iterated** — absolute threshold vs a
   Joule-scale Hamiltonian → returned the raw diagonal (~13 cm⁻¹). Fixed:
   threshold relative to the Frobenius norm.
3. **`lib/physics/dvr.ts` isotope effect cancelled** — k=μω² from current mass →
   ω=ωe for all. Fixed: k pinned to reference mass (BO PES is mass-independent).

## Done — Mono theme + Formation interactive (2026-05-30/31)

Per user feedback: explain the swarm's significance, add a drag-to-assemble
"build the molecule in space" interactive, and switch to a black/white "space"
theme (drop the portfolio green).

- **Theme** — bg ~black, `--primary` white; `--he` cyan `#22d3ee` (δ−), `--h`
  amber `#f59e0b` (δ+). Colour hexes single-sourced in `lib/constants.ts` +
  mirrored in `app/globals.css`. Cyan/amber is colourblind-safe.
- **Swarm significance** — sidebar intro ("each dot = one possible electron
  position, sampled from |ψ|²… more likely near He"), legend chips, methods note.
- **Formation mode** — `components/viz/formation-molecule.tsx`: drag a He atom
  and a bare proton together; He + H⁺ → HeH⁺ + γ. Cloud starts on lone He
  (cH=0), grows toward the proton (cH→0.3), bond clicks at R≈1.15 Å emitting a
  photon, settles to rₑ. Pull past 1.8 Å to break. Reset button + Morse well plot.
- Generalised physics: `makeHehDensity(he,h,cH)` + density-agnostic swarm so one
  model drives every mode. VIEWER_MODES = Formation → Density → Vibration →
  Dissociation.

## Done — Cinematic visual overhaul (2026-05-31)

Goal: make the molecule dynamic + visually appealing using SOTA front-end.
Direction (with user): hybrid — cinematic glowing hero + clean UI; electron
cloud = glowing gas + faint shell. Dropped the drei `<Html>` atom labels
(replaced by the glowing `Atom` primitive + sidebar legend).

### New files

- `components/viz/primitives.tsx` — shared look:
  - `SoftPoints` — swarm as soft round twinkling glow-sprites via a custom point
    shader (round alpha falloff + per-particle shimmer). Replaces square dots.
    Per-particle random is a deterministic index hash (React-Compiler purity).
  - `Atom` — emissive bloom-ready core (toneMapped=false) + fresnel halo;
    optional `grab` hit-sphere.
  - `CloudShell` — faint fresnel envelope giving the gas a 3D body.
- `components/viz/fx.tsx` — `SceneEffects`: EffectComposer + selective Bloom
  (mipmapBlur, threshold 0.22) + Vignette, MSAA 4×.
- `components/viz/hero-molecule.tsx` — non-interactive glowing HeH⁺ for the
  landing CTA (code-split, ssr:false).

### Edited

- `scene-canvas.tsx` — ACES filmic tone-mapping + exposure, drei `<Stars>` (3D
  parallax), gentle `autoRotate`, mounts `<SceneEffects>`. New props `autoRotate`,
  `bloomIntensity`. Keeps `preserveDrawingBuffer` (readback).
- `heh-molecule.tsx` + `formation-molecule.tsx` — rebuilt on the new primitives
  (glowing gas + fresnel atoms + emissive bond/photon). Formation drag physics
  unchanged; `<Html>` labels removed.
- `molecule-viewer.tsx` — chrome overhaul: glass panels, icon mode-tabs with a
  framer-motion `layoutId` sliding pill, AnimatePresence panel transitions, live
  HeH⁺ glyph, mode chip, gradient well-plot fill.
- `scene-host.tsx` — landing CTA now has the live `HeroMolecule` behind it + a
  radial legibility scrim; white glowing CTA button.
- `package.json` — added `three-stdlib ^2.36.0` (drei needs it). `npm install`
  reconciled; lockfile updated.

### Verified (this session)

- `tsc --noEmit`, `npm run lint`, `npm run build` — all exit 0; 3 static routes.
- Dev server serves `/` and `/molecule` → HTTP 200 (~140 ms warm).

### NOT verified this session — preview harness unresponsive

- The preview MCP channel wedged again (eval/screenshot/list stopped returning;
  earlier it also mounts the window ~1–2 px wide → degenerate canvas). So the new
  cinematic rendering — bloom, glow sprites, fresnel atoms, stars, auto-rotate,
  framer-motion tabs — is **only build-verified, NOT seen on screen this session.**
- ⇒ **Needs a human eyeball**, and ideally a re-run of the on-screen checks
  (lit-pixel He-lean, FPS, Formation drag) once the harness is healthy.
- Perf knobs if it's heavy on weak GPUs: lower particle `count`, drop MSAA, or
  lower `bloomIntensity`.

## Orphaned but kept on purpose (not imported now)

- `components/viz/volume-renderer.tsx`, `components/viz/molecule.tsx`
- `components/scenes/{density,vibrational,dissociation}-scene.tsx`
- `components/ui/data-methods-drawer.tsx`, `lib/data-loader.ts`
> Seam for a future "volumetric cloud" toggle + real FCI pipeline.

## Next / Phase 2

- Reactions (multi-molecule): HeH⁺ + H → He + H₂⁺ (the real destruction path).
- Wire `lib/data-loader.ts` to real PySCF/DVR outputs (scripts/ are skeletons).
- Nothing committed beyond the initial commit; user pushes to `main` themselves.
