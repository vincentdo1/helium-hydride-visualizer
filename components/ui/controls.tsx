"use client";

import { ISOTOPOLOGUES, type Isotopologue } from "@/lib/constants";

const panel =
  "rounded-md border border-white/10 bg-black/40 backdrop-blur px-4 py-3";
const label =
  "font-mono text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2";

export function IsotopeSelector({
  value,
  onChange,
}: {
  value: Isotopologue;
  onChange: (iso: Isotopologue) => void;
}) {
  return (
    <div className={panel}>
      <div className={label}>Isotopologue</div>
      <div className="flex flex-wrap gap-2">
        {ISOTOPOLOGUES.map((iso) => {
          const active = iso.id === value.id;
          return (
            <button
              key={iso.id}
              onClick={() => onChange(iso)}
              className={`rounded px-3 py-1.5 font-mono text-sm transition-colors ${
                active
                  ? "bg-[var(--primary)] text-black"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              {iso.label}
            </button>
          );
        })}
      </div>
      <div className="mt-2 font-mono text-[10px] text-white/40">
        μ = {value.reducedMass.toFixed(3)} amu · ZPE ×
        {value.zpeRatio.toFixed(3)}
      </div>
    </div>
  );
}

export function BondSlider({
  value,
  min = 0.4,
  max = 6,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className={panel}>
      <div className={label}>Bond length · {value.toFixed(2)} Å</div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--primary)]"
      />
    </div>
  );
}
