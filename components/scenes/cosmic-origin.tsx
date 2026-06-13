"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { NGC_7027_DETECTION_YEAR } from "@/lib/constants";

const beats = [
  {
    k: "cooling",
    title: "The fire dims",
    body: "380,000 years after the Big Bang, the universe finally cooled enough for atoms. Helium, holding its electrons tightest, got there first — drifting neutral through a sea of bare protons.",
  },
  {
    k: "formation",
    title: "He + H⁺ → HeH⁺ + γ",
    body: "Then it happened: a helium atom caught a proton, flung out a photon, and held on. The first chemical bond in existence.",
  },
  {
    k: "acid",
    title: "The strongest acid there is",
    body: "Helium wants nothing to do with that proton. HeH⁺ will force it onto any molecule it meets — no acid on Earth comes close.",
  },
  {
    k: "detection",
    title: `Found, ${NGC_7027_DETECTION_YEAR}`,
    body: "Made in a lab in 1925, hunted in space for decades — and finally spotted glowing in the nebula NGC 7027, just a few years ago.",
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
          Scroll through its story, then hold it in your hands in 3D.
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
