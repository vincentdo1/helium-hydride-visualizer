"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, FlaskConical, RotateCcw } from "lucide-react";
import { SceneCanvas } from "@/components/viz/scene-canvas";
import { HehMolecule } from "@/components/viz/heh-molecule";
import { FormationMolecule } from "@/components/viz/formation-molecule";
import { BondSlider, IsotopeSelector } from "@/components/ui/controls";
import { solveVibrational } from "@/lib/physics/dvr";
import {
  AVOIDED_CROSSING_ANGSTROM,
  BOND_LENGTH_ANGSTROM,
  DISSOCIATION_FROM_V0_EV,
  DIPOLE_MOMENT_DEBYE,
  DISSOCIATION_ENERGY_EV,
  ELECTRONS_ON_H,
  ELECTRONS_ON_HE,
  HARMONIC_FREQUENCY_CM,
  ISOTOPOLOGUES,
  LITERATURE,
  M_HE4,
  VIEWER_MODES,
  type ViewerMode,
} from "@/lib/constants";

const panel = "rounded-md border border-white/10 bg-white/[0.03] backdrop-blur";
const label =
  "font-mono text-[10px] uppercase tracking-[0.2em] text-white/45 mb-2";

// Map portfolio deep-link hashes onto viewer modes.
function hashToMode(hash: string): ViewerMode | null {
  const h = hash.replace("#", "");
  if (h === "formation") return "formation";
  if (h === "density") return "density";
  if (h === "dissociation") return "dissociation";
  if (h === "vibrational" || h === "vibration") return "vibration";
  return null;
}

export function MoleculeViewer() {
  const [mode, setMode] = useState<ViewerMode>("density");
  const [bond, setBond] = useState(BOND_LENGTH_ANGSTROM);
  const [iso, setIso] = useState(ISOTOPOLOGUES[0]);
  const [formation, setFormation] = useState({ R: 2 * 2.1, bonded: false });
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    const m = hashToMode(window.location.hash);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (m) setMode(m);
  }, []);

  const states = useMemo(
    () => solveVibrational(iso.reducedMass, 4),
    [iso.reducedMass],
  );

  // v=0 turning-point half-amplitude: where ψ₀ falls to ~e⁻¹ of its peak.
  const amplitudeA = useMemo(() => {
    const psi0 = states[0];
    const peak = Math.max(...Array.from(psi0.psi).map(Math.abs));
    let lo = psi0.grid[0];
    let hi = psi0.grid[psi0.grid.length - 1];
    for (let i = 0; i < psi0.grid.length; i++) {
      if (Math.abs(psi0.psi[i]) > peak * 0.37) {
        lo = psi0.grid[i];
        break;
      }
    }
    for (let i = psi0.grid.length - 1; i >= 0; i--) {
      if (Math.abs(psi0.psi[i]) > peak * 0.37) {
        hi = psi0.grid[i];
        break;
      }
    }
    return (hi - lo) / 2;
  }, [states]);

  const onFormationChange = useCallback(
    (s: { R: number; bonded: boolean }) => setFormation(s),
    [],
  );

  const sceneBond = mode === "dissociation" ? bond : BOND_LENGTH_ANGSTROM;
  const zpeApprox = (HARMONIC_FREQUENCY_CM / 2) * iso.zpeRatio;

  const hint =
    mode === "formation"
      ? "drag He and H⁺ together · scroll to zoom"
      : "drag to rotate · scroll to zoom · each dot is one |ψ|² sample";

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col bg-black lg:h-[100dvh] lg:overflow-hidden lg:flex-row">
      {/* ---------- 3D stage ---------- */}
      <div className="relative order-1 h-[54svh] min-h-[340px] flex-none lg:order-2 lg:h-auto lg:min-h-0 lg:flex-1">
        <Starfield />
        <SceneCanvas>
          {mode === "formation" ? (
            <FormationMolecule
              onChange={onFormationChange}
              resetSignal={resetSignal}
            />
          ) : (
            <HehMolecule
              mode={mode}
              bondLengthA={sceneBond}
              amplitudeA={amplitudeA}
              heMassShare={iso.reducedMass / M_HE4}
              showDipole={mode === "density"}
            />
          )}
        </SceneCanvas>

        <Link
          href="/"
          className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded border border-white/10 bg-black/50 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/65 backdrop-blur transition-colors hover:border-white/40 hover:text-white sm:left-4 sm:top-4 sm:px-3 sm:tracking-[0.2em]"
        >
          <ArrowLeft className="h-3 w-3" />
          Story
        </Link>

        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 w-[min(92vw,720px)] -translate-x-1/2 px-3 text-center font-mono text-[9px] uppercase leading-relaxed tracking-[0.16em] text-white/35 sm:bottom-4 sm:text-[10px] sm:tracking-[0.25em]">
          {hint}
        </div>
      </div>

      {/* ---------- Sidebar instrument ---------- */}
      <aside className="order-2 flex w-full flex-1 flex-col gap-4 border-t border-white/10 bg-black/45 p-4 backdrop-blur sm:p-6 lg:order-1 lg:w-[400px] lg:flex-none lg:overflow-y-auto lg:border-r lg:border-t-0 xl:w-[430px]">
        <header>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/50 sm:text-[11px] sm:tracking-[0.4em]">
            Helium hydride
          </div>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">HeH⁺</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            The first molecule the universe ever made: helium holding a single
            proton. The haze is its{" "}
            <strong className="text-white/85">electron cloud</strong> — each
            dot one place an electron is likely to be — and almost all of it
            hugs the helium.
          </p>
          <Legend />
          <Facts />
        </header>

        {/* Mode tabs (2×2) */}
        <div className={`${panel} p-1`}>
          <div className="grid grid-cols-2 gap-1">
            {VIEWER_MODES.map((m) => {
              const active = m.id === mode;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`min-h-10 rounded px-2 py-2 font-mono text-[10px] transition-colors sm:text-[11px] ${
                    active
                      ? "bg-white text-black"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {mode === "formation" && (
          <FormationPanel
            formation={formation}
            onReset={() => setResetSignal((n) => n + 1)}
          />
        )}
        {mode === "density" && <DensityPanel />}
        {mode === "dissociation" && (
          <DissociationPanel bond={bond} onBond={setBond} />
        )}
        {mode === "vibration" && (
          <VibrationPanel
            iso={iso}
            onIso={setIso}
            states={states}
            zpeApprox={zpeApprox}
          />
        )}

        <MethodsAccordion />
      </aside>
    </div>
  );
}

/* ------------------------------- pieces -------------------------------- */

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-white/55">
      <span className="inline-flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: "var(--he)", boxShadow: "0 0 8px var(--he)" }}
        />
        He · electron-rich δ−
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: "var(--h)", boxShadow: "0 0 8px var(--h)" }}
        />
        H · electron-poor δ+
      </span>
    </div>
  );
}

function Facts() {
  const facts = [
    { k: "Born", v: "≈380,000 yr after the Big Bang" },
    { k: "Found", v: "2019 · nebula NGC 7027" },
    { k: "Acidity", v: "strongest acid known" },
  ];
  return (
    <div className="mt-4 grid grid-cols-3 gap-1.5">
      {facts.map((f) => (
        <div
          key={f.k}
          className="rounded border border-white/10 bg-white/[0.02] px-2 py-2"
        >
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
            {f.k}
          </div>
          <div className="mt-1 text-[11px] leading-snug text-white/70">
            {f.v}
          </div>
        </div>
      ))}
    </div>
  );
}

function Readout({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-white/10 py-1.5 first:border-t-0">
      <span className="min-w-0 text-xs text-white/55">{k}</span>
      <span className="min-w-0 text-right font-mono text-sm text-white/90">
        {v}
      </span>
    </div>
  );
}

/* ----- Formation ----- */

function morseEv(R: number): number {
  const a = 1.8;
  const x = 1 - Math.exp(-a * (R - BOND_LENGTH_ANGSTROM));
  return DISSOCIATION_ENERGY_EV * x * x - DISSOCIATION_ENERGY_EV;
}

function FormationPanel({
  formation,
  onReset,
}: {
  formation: { R: number; bonded: boolean };
  onReset: () => void;
}) {
  const { R, bonded } = formation;
  const status = bonded ? "HeH⁺ formed" : R <= 2.5 ? "Bonding…" : "Apart";
  const e = morseEv(R);

  return (
    <div className="flex flex-col gap-3">
      <div className={`${panel} p-4`}>
        <div className={label}>Build it · He + H⁺ → HeH⁺ + γ</div>
        <p className="text-xs leading-relaxed text-white/60">
          Drag them together. When helium meets a bare proton, a photon (γ)
          carries the spare energy away — and the universe has its first
          molecule.
        </p>
        <div className="mt-3">
          <Readout k="Separation R" v={`${R.toFixed(2)} Å`} />
          <Readout k="Status" v={status} />
          <Readout
            k="Potential energy"
            v={`${e >= 0 ? "" : "−"}${Math.abs(e).toFixed(2)} eV`}
          />
        </div>
        <WellPlot R={R} />
        {bonded && (
          <p className="mt-3 rounded bg-white/10 px-3 py-2 text-xs leading-relaxed text-white/80">
            Bonded — a well{" "}
            <strong>{DISSOCIATION_ENERGY_EV.toFixed(2)} eV</strong> deep,{" "}
            <strong>{DISSOCIATION_FROM_V0_EV.toFixed(3)} eV</strong> to escape
            from the ground state. Fierce for something born in a vacuum.
          </p>
        )}
      </div>
      <button
        onClick={onReset}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.03] px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset atoms
      </button>
    </div>
  );
}

// Morse well V(R) with a marker at the current separation.
function WellPlot({ R }: { R: number }) {
  const W = 320;
  const H = 130;
  const rMin = 0.4;
  const rMax = 4.0;
  const vMin = -DISSOCIATION_ENERGY_EV;
  const vMax = 1.2;
  const x = (r: number) => ((r - rMin) / (rMax - rMin)) * W;
  const y = (v: number) => H - ((v - vMin) / (vMax - vMin)) * H;

  const pts: string[] = [];
  for (let r = rMin; r <= rMax + 1e-9; r += 0.05) {
    pts.push(`${x(r).toFixed(1)},${y(Math.min(vMax, morseEv(r))).toFixed(1)}`);
  }
  const cr = Math.max(rMin, Math.min(rMax, R));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-3 w-full rounded-md border border-white/10 bg-black/40"
    >
      <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.12)" />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={1.5}
      />
      <line
        x1={x(cr)}
        x2={x(cr)}
        y1={0}
        y2={H}
        stroke="var(--he)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <circle
        cx={x(cr)}
        cy={y(Math.min(vMax, morseEv(cr)))}
        r={3.5}
        fill="var(--he)"
      />
      <text x={4} y={H - 5} fontSize={9} fill="#ffffff55">
        rₑ = {BOND_LENGTH_ANGSTROM} Å
      </text>
    </svg>
  );
}

/* ----- Density ----- */

function DensityPanel() {
  return (
    <div className={`${panel} p-4`}>
      <div className={label}>Equilibrium geometry · rₑ</div>
      <Readout k="Bond length rₑ" v={`${BOND_LENGTH_ANGSTROM.toFixed(4)} Å`} />
      <Readout k="Dipole μₑ (c.o.m.)" v={`${DIPOLE_MOMENT_DEBYE} D`} />
      <Readout k="Model e⁻ weight near He" v={`≈ ${ELECTRONS_ON_HE} e⁻`} />
      <Readout k="Model e⁻ weight near H" v={`≈ ${ELECTRONS_ON_H} e⁻`} />
      <p className="mt-3 text-xs leading-relaxed text-white/55">
        Helium hoards both electrons; the proton rides along nearly bare. That
        lopsidedness gives HeH⁺ a strong dipole — the radio signature that
        finally gave it away in 2019.
      </p>
    </div>
  );
}

/* ----- Dissociation ----- */

function DissociationPanel({
  bond,
  onBond,
}: {
  bond: number;
  onBond: (v: number) => void;
}) {
  const nearCrossing = Math.abs(bond - AVOIDED_CROSSING_ANGSTROM) < 0.4;
  const asymptote = bond < 1.5 ? "Bound HeH⁺" : "He + H⁺";
  return (
    <div className="flex flex-col gap-3">
      <BondSlider value={bond} onChange={onBond} />
      <div className={`${panel} p-4`}>
        <div className={label}>Ground surface · X¹Σ⁺</div>
        <Readout k="Bond length" v={`${bond.toFixed(2)} Å`} />
        <Readout k="Tends toward" v={asymptote} />
        {nearCrossing && (
          <div className="mt-2 inline-block rounded bg-white/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white">
            avoided crossing ≈ {AVOIDED_CROSSING_ANGSTROM} Å
          </div>
        )}
        <p className="mt-3 text-xs leading-relaxed text-white/55">
          Pull, and helium keeps everything. The cloud snaps back onto He and a
          bare proton drifts away — this is why HeH⁺ is the strongest acid
          known: it will hand that proton to any molecule it touches.
        </p>
      </div>
    </div>
  );
}

/* ----- Vibration ----- */

function VibrationPanel({
  iso,
  onIso,
  states,
  zpeApprox,
}: {
  iso: (typeof ISOTOPOLOGUES)[number];
  onIso: (i: (typeof ISOTOPOLOGUES)[number]) => void;
  states: ReturnType<typeof solveVibrational>;
  zpeApprox: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <IsotopeSelector value={iso} onChange={onIso} />
      <div className={`${panel} p-4`}>
        <div className={label}>Vibrational ladder</div>
        <Readout k="Reduced mass μ" v={`${iso.reducedMass.toFixed(3)} amu`} />
        <Readout k="ZPE ≈ ωₑ/2 · √(μ⁰/μ)" v={`${Math.round(zpeApprox)} cm⁻¹`} />
        <Readout
          k="v=0 → 1 fundamental"
          v={`${Math.round(states[1].energyCm)} cm⁻¹`}
        />
        <PesPlot states={states} />
        <p className="mt-3 text-xs leading-relaxed text-white/55">
          Even at absolute zero it can&apos;t hold still. Swap in heavier
          partners and the breathing slows and shrinks — the proton does almost
          all the moving. (Motion exaggerated for visibility.)
        </p>
      </div>
    </div>
  );
}

function PesPlot({ states }: { states: ReturnType<typeof solveVibrational> }) {
  const W = 320;
  const H = 170;
  const grid = states[0].grid;
  const rMin = grid[0];
  const rMax = grid[grid.length - 1];
  const eMax = Math.max(...states.map((s) => s.energyCm)) * 1.25 || 1;
  const x = (r: number) => ((r - rMin) / (rMax - rMin)) * W;
  const y = (e: number) => H - (e / eMax) * H;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-3 w-full rounded-md border border-white/10 bg-black/40"
    >
      {states.map((s, i) => {
        const peak = Math.max(...Array.from(s.psi).map(Math.abs)) || 1;
        const pts = Array.from(s.grid)
          .map((r, j) => {
            const amp = (s.psi[j] * s.psi[j]) / (peak * peak);
            return `${x(r).toFixed(1)},${(y(s.energyCm) - amp * 24).toFixed(1)}`;
          })
          .join(" ");
        return (
          <g key={i}>
            <line
              x1={0}
              x2={W}
              y1={y(s.energyCm)}
              y2={y(s.energyCm)}
              stroke="rgba(255,255,255,0.18)"
              strokeDasharray="3 3"
            />
            <polyline
              points={pts}
              fill="none"
              stroke="#ffffff"
              strokeWidth={1.5}
              opacity={0.9 - i * 0.15}
            />
            <text x={4} y={y(s.energyCm) - 3} fontSize={9} fill="#ffffff80">
              v={s.v} · {Math.round(s.energyCm)} cm⁻¹
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ----- Methods ----- */

function MethodsAccordion() {
  const [open, setOpen] = useState(false);
  return (
    <div className={panel}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/80"
      >
        <span className="flex items-center gap-2">
          <FlaskConical className="h-3.5 w-3.5 text-white/60" />
          Data &amp; methods
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-white/10 p-4">
          <p className="mb-3 text-xs leading-relaxed text-white/60">
            The live cloud is an analytical LCAO model of |ψ|², sampled by a
            Metropolis walk. The anchors below come from the spectroscopic
            literature.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] border-collapse text-xs">
              <tbody>
                {LITERATURE.map((row) => (
                  <tr key={row.quantity} className="border-t border-white/10">
                    <td className="py-1.5 pr-2 text-white/60">
                      {row.quantity}
                    </td>
                    <td className="py-1.5 pr-2 font-mono text-white/90">
                      {row.value}
                    </td>
                    <td className="py-1.5 text-right font-mono text-[10px] text-white/40">
                      {row.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-white/45">
            The dots are Monte-Carlo samples of the probability density |ψ|²,
            not electron trajectories — a stationary eigenstate carries no
            current.
          </p>
        </div>
      )}
    </div>
  );
}

// Subtle fixed starfield behind the transparent canvas (white stars only).
function Starfield() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 opacity-70"
      style={{
        background:
          "radial-gradient(1px 1px at 20% 30%, #fff 50%, transparent), radial-gradient(1px 1px at 70% 60%, #e5e7eb 50%, transparent), radial-gradient(1.5px 1.5px at 40% 80%, #fff 50%, transparent), radial-gradient(1px 1px at 85% 25%, #cbd5e1 50%, transparent)",
        backgroundSize: "240px 240px, 320px 320px, 400px 400px, 180px 180px",
      }}
    />
  );
}
