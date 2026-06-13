"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CosmicOrigin } from "@/components/scenes/cosmic-origin";

// Landing page: cosmic-origin narrative, ending in a CTA that steps into the
// persistent molecule instrument at /molecule.
export function SceneHost() {
  const router = useRouter();

  // Preserve legacy portfolio deep-links: a CTA pointed at this origin with
  // #density / #vibrational / #dissociation forwards straight into the viewer.
  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (["density", "vibrational", "vibration", "dissociation"].includes(h)) {
      router.replace(`/molecule#${h}`);
    }
  }, [router]);

  return (
    <main className="relative">
      <Link
        href="/molecule"
        className="fixed left-3 top-3 z-40 inline-flex items-center gap-1.5 rounded border border-white/10 bg-black/50 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/65 backdrop-blur transition-colors hover:border-[var(--primary)]/50 hover:text-white sm:left-auto sm:right-4 sm:top-4 sm:px-3 sm:tracking-[0.2em]"
      >
        <span className="sm:hidden">Molecule</span>
        <span className="hidden sm:inline">Skip to molecule</span>
        <ArrowRight className="h-3 w-3" />
      </Link>

      <CosmicOrigin />

      {/* Closing CTA */}
      <section className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center sm:px-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--primary)] sm:text-[11px] sm:tracking-[0.4em]">
          Now explore it in 3D
        </div>
        <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
          Step inside the molecule
        </h2>
        <p className="mt-4 max-w-md text-white/55">
          Drag it together, watch it breathe, stretch it until it snaps.
        </p>
        <Link
          href="/molecule"
          className="group mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-7 py-3 font-mono text-sm font-semibold uppercase tracking-[0.15em] text-black transition-transform hover:scale-105"
        >
          See the molecule
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </section>
    </main>
  );
}
