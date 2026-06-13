// Physical constants and display anchors for helium hydride (HeH+).
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
export const DISSOCIATION_FROM_V0_EV = 1.845; // D0 from v=0, J=0
// Dipole is ORIGIN-DEPENDENT for a charged ion; quoted about the centre of mass.
export const DIPOLE_MOMENT_DEBYE = 1.66; // μe

// ---- Vibrational / rotational (cm⁻¹) ------------------------------------
export const HARMONIC_FREQUENCY_CM = 3228.3; // ωe
export const ROT_CONSTANT_CM = 33.526; // Be

// ---- Electron partition --------------------------------------------------
// Approximate Mulliken-style populations, for display.
export const TOTAL_ELECTRONS = 2;
export const ELECTRONS_ON_HE = 1.7;
export const ELECTRONS_ON_H = 0.3;

// ---- Physical constants (SI / spectroscopic) ----------------------------
export const AMU_TO_KG = 1.6605390666e-27;
export const HBAR = 1.054571817e-34; // J·s
export const C_CM = 2.99792458e10; // speed of light, cm/s (for cm⁻¹ conversions)
export const BOHR_TO_ANGSTROM = 0.529177210903;

// ---- Isotopologues -------------------------------------------------------
// Atomic masses (amu, AME2020). μ = (mA·mB)/(mA+mB) sets ZPE ≈ ωe/2 ∝ √(k/μ).
export const M_HE4 = 4.002602;
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

// ---- Dissociation sketch -------------------------------------------------
// Ground X¹Σ+ correlates to He + H+ at large R. Qualitative cue, not a fitted PES.
export const AVOIDED_CROSSING_ANGSTROM = 3.9;

// ---- Cosmic origin -------------------------------------------------------
export const NGC_7027_DETECTION_YEAR = 2019;

// ---- Literature comparison table (rendered in the Data & Methods drawer) -
export const LITERATURE = [
  { quantity: "Bond length re", value: "0.7743 Å", source: "Pachucki 2012" },
  { quantity: "Well depth De", value: "≈2.04 eV", source: "Stanke 2006" },
  { quantity: "Dissociation D0", value: "1.845 eV", source: "Stanke 2006" },
  {
    quantity: "Dipole μe (c.o.m.)",
    value: "≈1.66 D",
    source: "Pavanello 2005",
  },
  {
    quantity: "Harmonic ωe",
    value: "3228.3 cm⁻¹",
    source: "Bishop & Cheung 1979",
  },
  { quantity: "Rotational Be", value: "33.526 cm⁻¹", source: "Müller/CDMS" },
] as const;

// ---- Rendering ----------------------------------------------------------
// Ångström → scene units.
export const ANGSTROM_TO_SCENE = 0.4;

// Atom accent colours, mirrored as --he / --h in globals.css.
export const HE_COLOR_HEX = "#22d3ee";
export const HE_CORE_HEX = "#a5f3fc";
export const H_COLOR_HEX = "#f59e0b";
export const H_CORE_HEX = "#fde68a";
export const SWARM_COLOR_HEX = "#ffffff";

// Viewer modes for /molecule.
export const VIEWER_MODES = [
  { id: "formation", label: "Formation" },
  { id: "density", label: "Density skew" },
  { id: "vibration", label: "Vibration" },
  { id: "dissociation", label: "Dissociation" },
] as const;
export type ViewerMode = (typeof VIEWER_MODES)[number]["id"];
