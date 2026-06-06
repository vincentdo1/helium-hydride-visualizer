"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { NGC_7027_DETECTION_YEAR } from "@/lib/constants";

const beats = [
  {
    k: "recombination",
    title: "The universe cools",
    body: "During recombination, the young universe cooled through a few thousand kelvin. Light-element ions and free electrons began settling into neutral atoms.",
  },
  {
    k: "helium-first",
    title: "Helium recombines first",
    body: "Because helium ions have higher ionization potentials than hydrogen, helium became neutral first while many protons (H⁺) remained available.",
  },
  {
    k: "formation",
    title: "He + H⁺ → HeH⁺ + γ",
    body: "Neutral helium could then bind with a proton by radiative association. The photon carries away excess energy, leaving the helium hydride ion.",
  },
  {
    k: "detection",
    title: `Found at last — ${NGC_7027_DETECTION_YEAR}`,
    body: "Predicted for decades, HeH⁺ was detected astrophysically in NGC 7027 with SOFIA/upGREAT through its J = 1–0 rotational line at 149.1 µm.",
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

      <div className="mx-auto max-w-2xl px-5 pb-[10vh] pt-[16vh] text-center sm:px-6 sm:pt-[18vh]">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--primary)] sm:text-[11px] sm:tracking-[0.4em]">
          Helium hydride · HeH⁺
        </div>
        <h1 className="mx-auto mt-4 max-w-[19rem] text-3xl font-semibold leading-tight sm:max-w-2xl sm:text-5xl md:text-7xl">
          The first molecule
          <br />
          in the universe
        </h1>
        <p className="mx-auto mt-5 max-w-[21rem] text-white/55 sm:max-w-md">
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
    <div className="flex min-h-[80vh] items-center justify-center px-5 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 0.6 }}
        className="max-w-xl rounded-lg border border-white/10 bg-black/40 p-5 backdrop-blur sm:p-8"
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
