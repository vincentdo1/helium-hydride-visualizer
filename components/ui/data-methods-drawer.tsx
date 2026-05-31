"use client";

import { useState } from "react";
import { ChevronDown, FlaskConical } from "lucide-react";
import { LITERATURE } from "@/lib/constants";

// Collapsible panel that makes the numbers auditable: method, basis, grid,
// literature comparison, and an explicit limitations note. This is what makes
// the cinematic scenes feel earned rather than merely pretty.
export function DataMethodsDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(92vw,420px)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-t-md border border-white/10 bg-black/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/80 backdrop-blur"
      >
        <span className="flex items-center gap-2">
          <FlaskConical className="h-3.5 w-3.5 text-[var(--primary)]" />
          Data &amp; methods
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="max-h-[60vh] overflow-auto rounded-b-md border border-t-0 border-white/10 bg-black/80 p-4 backdrop-blur">
          <p className="mb-3 text-xs leading-relaxed text-white/60">
            HeH⁺ has only two electrons, so full configuration interaction is
            exact within the basis and identical to CCSD — there are no triple
            excitations. Rigour comes from basis-set quality (aug-cc-pV5Z / CBS)
            and calibration to the non-Born–Oppenheimer literature.
          </p>

          <table className="w-full border-collapse text-xs">
            <tbody>
              {LITERATURE.map((row) => (
                <tr key={row.quantity} className="border-t border-white/10">
                  <td className="py-1.5 pr-2 text-white/60">{row.quantity}</td>
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

          <p className="mt-3 text-[11px] leading-relaxed text-white/45">
            <span className="text-white/70">Limitations:</span> the live preview
            currently renders an analytical LCAO density (placeholder) — the
            production build swaps in ray-marched FCI density grids from{" "}
            <span className="font-mono">scripts/compute-density.py</span>. The
            dissociation view shows a difference density Δρ, not a physical
            current: a stationary real eigenstate carries no electronic flux.
          </p>
        </div>
      )}
    </div>
  );
}
