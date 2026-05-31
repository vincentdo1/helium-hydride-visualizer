"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CosmicOrigin } from "@/components/scenes/cosmic-origin";

// The landing page: the cosmic-origin narrative, ending in a CTA that steps
// into the persistent molecule instrument at /molecule. The old vertical
// scene-nav is gone — the four physics ideas now live as modes inside the
// viewer, so the only navigation is "read the story → see the molecule".
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
        className="fixed right-4 top-4 z-40 inline-flex items-center gap-1.5 rounded border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/60 backdrop-blur transition-colors hover:border-[var(--primary)]/50 hover:text-white"
      >
        Skip to molecule
        <ArrowRight className="h-3 w-3" />
      </Link>

      <CosmicOrigin />

      {/* Closing CTA — the doorway into the instrument */}
      <section className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.4em] text-[var(--primary)]">
          Now explore it in 3D
        </div>
        <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight md:text-5xl">
          Step inside the molecule
        </h2>
        <p className="mt-4 max-w-md text-white/55">
          See both electrons as a living cloud — crowding onto helium, breathing
          with each isotope, collapsing as the bond breaks.
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
