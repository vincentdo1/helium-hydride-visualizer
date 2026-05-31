// Spectroscopic and structural constants for helium hydride (HeH⁺).
//
// HeH⁺ has only TWO electrons. Full configuration interaction (FCI) is therefore
// exact within the basis and identical to CCSD for this system — there are no
// triple excitations, so a perturbative (T) correction is identically zero. The
// rigour of the data pipeline comes from basis-set quality + calibration to the
// non-Born–Oppenheimer literature, NOT from the choice of correlation method.
//
// References
//   - Bishop & Cheung (1979)  J. Mol. Spectrosc. 75, 462.  ωe, Be, anharmonicity
//   - Stanke et al.    (2006)  Phys. Rev. A 73, 012503.    re, De (non-BO)
//   - Pachucki         (2012)  Phys. Rev. A 85, 042511.    re to spectroscopic accuracy
//   - Engel et al.     (2005)  Mol. Phys. 103, 1085.       dipole-moment function
//   - Güsten et al.    (2019)  Nature 568, 357.            NGC 7027 detection (SOFIA/GREAT)

// ---- Structural ----------------------------------------------------------
export const BOND_LENGTH_ANGSTROM = 0.7743; // equilibrium re
export const DISSOCIATION_ENERGY_EV = 2.04; // De (well depth, excludes ZPE)
// Dipole is ORIGIN-DEPENDENT for a charged ion; quoted about the centre of mass.
export const DIPOLE_MOMENT_DEBYE = 1.66; // μe (Engel 2005)

// ---- Vibrational / rotational (cm⁻¹) ------------------------------------
export const HARMONIC_FREQUENCY_CM = 3228.3; // ωe
export const ANHARMONICITY_CM = 174.1; // ωe·xe
export const ROT_CONSTANT_CM = 33.56; // Be

// ---- Electron partition (≈, natural-orbital / Mulliken) -----------------
export const TOTAL_ELECTRONS = 2;
export const ELECTRONS_ON_HE = 1.7;
export const ELECTRONS_ON_H = 0.3;

// ---- Physical constants (SI / spectroscopic) ----------------------------
export const AMU_TO_KG = 1.6605390666e-27;
export const HBAR = 1.054571817e-34; // J·s
export const C_CM = 2.99792458e10; // speed of light, cm/s (for cm⁻¹ conversions)
export const BOHR_TO_ANGSTROM = 0.529177210903;

// ---- Isotopologues -------------------------------------------------------
// Atomic masses (amu, AME2020). Reduced mass μ = (mA·mB)/(mA+mB) sets the
// vibrational scaling: ZPE ≈ ωe/2 ∝ √(k/μ).
const M_HE4 = 4.002602;
const M_HE3 = 3.016029;
const M_H = 1.007825;
const M_D = 2.014102;
const M_T = 3.016049;

const reduced = (a: number, b: number) => (a * b) / (a + b);

export type Isotopologue = {
  id: string;
  label: string;
  reducedMass: number; // amu
  zpeRatio: number; // ZPE relative to ⁴HeH⁺ (= 1), ∝ √(μ_ref / μ)
};

export const MU_REF_AMU = reduced(M_HE4, M_H);

export const ISOTOPOLOGUES: Isotopologue[] = [
  { id: "4HeH", label: "⁴HeH⁺", reducedMass: MU_REF_AMU, zpeRatio: 1 },
  {
    id: "4HeD",
    label: "⁴HeD⁺",
    reducedMass: reduced(M_HE4, M_D),
    zpeRatio: Math.sqrt(MU_REF_AMU / reduced(M_HE4, M_D)),
  },
  {
    id: "4HeT",
    label: "⁴HeT⁺",
    reducedMass: reduced(M_HE4, M_T),
    zpeRatio: Math.sqrt(MU_REF_AMU / reduced(M_HE4, M_T)),
  },
  {
    id: "3HeH",
    label: "³HeH⁺",
    reducedMass: reduced(M_HE3, M_H),
    zpeRatio: Math.sqrt(MU_REF_AMU / reduced(M_HE3, M_H)),
  },
];

// ---- Electronic states (for the dissociation scene) ---------------------
// At large R the GROUND state X¹Σ⁺ correlates to He + H⁺ (closed-shell helium
// keeps both electrons); the EXCITED state A¹Σ⁺ correlates to He⁺ + H. The two
// diabatic characters swap through an avoided crossing near R ≈ 4 Å.
export const AVOIDED_CROSSING_ANGSTROM = 3.9;

export type ElectronicState = "X" | "A";

// ---- Cosmic origin -------------------------------------------------------
export const NGC_7027_DETECTION_YEAR = 2019;

// ---- Literature comparison table (rendered in the Data & Methods drawer) -
export const LITERATURE = [
  { quantity: "Bond length rₑ", value: "0.7743 Å", source: "Pachucki 2012" },
  { quantity: "Well depth Dₑ", value: "≈2.04 eV", source: "Stanke 2006" },
  { quantity: "Dipole μₑ (c.o.m.)", value: "≈1.66 D", source: "Engel 2005" },
  {
    quantity: "Harmonic ωₑ",
    value: "3228.3 cm⁻¹",
    source: "Bishop & Cheung 1979",
  },
] as const;

// ---- Scene anchors (deep-link targets from the portfolio CTA) ------------
export const SCENES = [
  { id: "cosmos", label: "Origin" },
  { id: "density", label: "Density skew" },
  { id: "vibrational", label: "Vibration" },
  { id: "dissociation", label: "Dissociation" },
] as const;
export type SceneId = (typeof SCENES)[number]["id"];

// ---- Rendering ----------------------------------------------------------
// Ångström → R3F scene units. Keeps the electron swarm, the nuclei, and the
// (legacy) volume cube aligned in the same coordinate frame:
//   = volumeSize / (2 · extent) = 2.4 / 6.0
export const ANGSTROM_TO_SCENE = 0.4;

// Atom accent colours — the ONLY colour in the otherwise black/white "space" UI.
// Single source of truth shared by the CSS theme (--he / --h in globals.css) and
// the three.js materials. He = cyan (electron-rich δ−); H = amber (δ+).
export const HE_COLOR_HEX = "#22d3ee";
export const HE_CORE_HEX = "#a5f3fc";
export const H_COLOR_HEX = "#f59e0b";
export const H_CORE_HEX = "#fde68a";
export const SWARM_COLOR_HEX = "#ffffff";

// Viewer modes for the single persistent molecule instrument (/molecule).
// Ordered as a story arc: build it → inspect it → watch it breathe → break it.
export const VIEWER_MODES = [
  { id: "formation", label: "Formation" },
  { id: "density", label: "Density skew" },
  { id: "vibration", label: "Vibration" },
  { id: "dissociation", label: "Dissociation" },
] as const;
export type ViewerMode = (typeof VIEWER_MODES)[number]["id"];
