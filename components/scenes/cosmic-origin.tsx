"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { NGC_7027_DETECTION_YEAR } from "@/lib/constants";

const beats = [
  {
    k: "recombination",
    title: "The universe cools",
    body: "A few hundred thousand years after the Big Bang the plasma cools below a few thousand kelvin. Bare nuclei and free electrons drift through a cooling fog.",
  },
  {
    k: "helium-first",
    title: "Helium recombines first",
    body: "Helium has the higher ionization energy, so it captures electrons before hydrogen. Neutral He appears while protons (H⁺) are still everywhere.",
  },
  {
    k: "formation",
    title: "He + H⁺ → HeH⁺ + γ",
    body: "Neutral helium meets a free proton and the first molecular bond in the cosmos forms — radiating away a photon. Helium hydride is born.",
  },
  {
    k: "detection",
    title: `Found at last — ${NGC_7027_DETECTION_YEAR}`,
    body: "Predicted for decades, HeH⁺ was finally detected in the planetary nebula NGC 7027 by SOFIA/GREAT (Güsten et al., Nature 2019).",
  },
];

export function CosmicOrigin() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const driftY = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);

  return (
    <section id="cosmos" ref={ref} className="relative">
      {/* Parallax starfield backdrop */}
      <motion.div
        aria-hidden
        style={{ y: driftY }}
        className="pointer-events-none fixed inset-0 -z-10"
      >
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(1px 1px at 20% 30%, #fff 50%, transparent), radial-gradient(1px 1px at 70% 60%, #e5e7eb 50%, transparent), radial-gradient(1.5px 1.5px at 40% 80%, #fff 50%, transparent), radial-gradient(1px 1px at 85% 20%, #cbd5e1 50%, transparent)",
            backgroundSize:
              "240px 240px, 320px 320px, 400px 400px, 180px 180px",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,255,255,0.06),transparent_55%)]" />
      </motion.div>

      <div className="mx-auto max-w-2xl px-6 pt-[18vh] pb-[10vh] text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.4em] text-[var(--primary)]">
          Helium hydride · HeH⁺
        </div>
        <h1 className="mt-4 text-5xl md:text-7xl font-semibold leading-tight">
          The first molecule
          <br />
          in the universe
        </h1>
        <p className="mt-5 text-white/55">
          Scroll to trace its story — from the recombination epoch to its 2019
          detection — then explore its behavior in 3D.
        </p>
      </div>

      {beats.map((b, i) => (
        <Beat key={b.k} index={i} title={b.title} body={b.body} />
      ))}
    </section>
  );
}

function Beat({
  index,
  title,
  body,
}: {
  index: number;
  title: string;
  body: string;
}) {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 0.6 }}
        className="max-w-xl rounded-lg border border-white/10 bg-black/40 p-8 backdrop-blur"
      >
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">
          0{index + 1}
        </div>
        <h2 className="mt-2 text-3xl md:text-4xl font-semibold">{title}</h2>
        <p className="mt-3 text-white/65 leading-relaxed">{body}</p>
      </motion.div>
    </div>
  );
}
