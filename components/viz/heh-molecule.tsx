"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { type Group, type Mesh, type Points, type ShaderMaterial } from "three";
import { createSwarm, stepSwarm, type SwarmState } from "@/lib/physics/swarm";
import {
  bondCharacter,
  makeHehDensity,
  type Vec3,
} from "@/lib/physics/density";
import {
  Atom,
  AtomLabel,
  CloudShell,
  SoftPoints,
} from "@/components/viz/primitives";
import {
  ANGSTROM_TO_SCENE,
  BOND_LENGTH_ANGSTROM,
  HE_COLOR_HEX,
  HE_CORE_HEX,
  H_COLOR_HEX,
  H_CORE_HEX,
  SWARM_COLOR_HEX,
} from "@/lib/constants";
import type { ViewerMode } from "@/lib/constants";

const S = ANGSTROM_TO_SCENE;
const RE = BOND_LENGTH_ANGSTROM;
const VIB_RATE = 2 * Math.PI * 1.1; // breathing rate, rad/s
const VIB_EXAGGERATION = 2.2; // on-screen amplitude boost (legibility)

// Per-point tint: white cloud picking up each atom's colour near its nucleus.
const HE_TINT = [0.45, 0.88, 1.0];
const H_TINT = [1.0, 0.75, 0.42];
const SIGMA2_HE = 0.2; // tint falloff, Å²
const SIGMA2_H = 0.15;

export type HehMoleculeProps = {
  mode: ViewerMode;
  bondLengthA: number;
  amplitudeA?: number;
  /** fraction of a bond stretch carried by He (= μ/m_He), for vibration */
  heMassShare?: number;
  showDipole?: boolean;
  count?: number;
};

// The bonded HeH⁺ viewer. All animation is imperative in useFrame (buffers and
// transforms via refs), so there are no per-frame React renders.
export function HehMolecule({
  mode,
  bondLengthA,
  amplitudeA = 0,
  heMassShare = 0.2,
  showDipole = true,
  count = 4200,
}: HehMoleculeProps) {
  const pointsRef = useRef<Points>(null);
  const heGroup = useRef<Group>(null);
  const hGroup = useRef<Group>(null);
  const bondRef = useRef<Mesh>(null);
  const dipoleRef = useRef<Group>(null);
  const shellRef = useRef<Mesh>(null);
  const bondNow = useRef(BOND_LENGTH_ANGSTROM);
  const swarmRef = useRef<SwarmState | null>(null);

  useFrame(({ clock }) => {
    const points = pointsRef.current;
    if (!points) return;
    const posAttr = points.geometry.attributes.position;
    const colAttr = points.geometry.attributes.aColor;
    const positions = posAttr.array as Float32Array;
    const colors = colAttr.array as Float32Array;

    // 1) nucleus positions for this frame
    let he: Vec3;
    let h: Vec3;
    let bond: number;
    if (mode === "vibration") {
      // mass-weighted stretch about a fixed centre of mass: the light H does
      // most of the moving, He barely shifts
      const stretch =
        amplitudeA *
        VIB_EXAGGERATION *
        Math.sin(clock.getElapsedTime() * VIB_RATE);
      bond = RE + stretch;
      he = [-RE / 2 - stretch * heMassShare, 0, 0];
      h = [RE / 2 + stretch * (1 - heMassShare), 0, 0];
    } else {
      bondNow.current += (bondLengthA - bondNow.current) * 0.18;
      bond = bondNow.current;
      he = [-bond / 2, 0, 0];
      h = [bond / 2, 0, 0];
    }

    // 2) density with distance-dependent bond character: stretching past the
    // overlap region hands both electrons back to helium
    const cH = bondCharacter(bond);
    const density = makeHehDensity(he, h, cH);

    const swarm = (swarmRef.current ??= createSwarm(
      count,
      [
        { center: he, spread: 0.42, weight: 0.76 },
        { center: h, spread: 0.5, weight: 0.24 },
      ],
      density,
    ));

    // 3) advance the swarm; write positions + per-point tint
    stepSwarm(swarm, density, 2);
    const src = swarm.posA;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const x = src[ix];
      const y = src[ix + 1];
      const z = src[ix + 2];
      positions[ix] = x * S;
      positions[ix + 1] = y * S;
      positions[ix + 2] = z * S;

      const dhx = x - he[0];
      const dhy = y - he[1];
      const dhz = z - he[2];
      const dpx = x - h[0];
      const dpy = y - h[1];
      const dpz = z - h[2];
      const tHe = Math.exp(-(dhx * dhx + dhy * dhy + dhz * dhz) / SIGMA2_HE);
      const tH = Math.exp(-(dpx * dpx + dpy * dpy + dpz * dpz) / SIGMA2_H);
      colors[ix] = 1 + tHe * (HE_TINT[0] - 1) + tH * (H_TINT[0] - 1);
      colors[ix + 1] = 1 + tHe * (HE_TINT[1] - 1) + tH * (H_TINT[1] - 1);
      colors[ix + 2] = 1 + tHe * (HE_TINT[2] - 1) + tH * (H_TINT[2] - 1);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    // 4) nuclei + bond
    if (heGroup.current) heGroup.current.position.x = he[0] * S;
    if (hGroup.current) hGroup.current.position.x = h[0] * S;
    if (bondRef.current) {
      bondRef.current.position.x = ((he[0] + h[0]) / 2) * S;
      bondRef.current.scale.y = Math.max(bond * S, 1e-3);
      bondRef.current.visible = bond < 2.6;
      const m = bondRef.current.material as ShaderMaterial & {
        opacity: number;
        emissiveIntensity: number;
      };
      m.opacity = 0.6 * Math.min(1, (2.6 - bond) / 1.3);
      // brighten on compression so the breathing reads
      m.emissiveIntensity =
        mode === "vibration" ? 1.1 + Math.max(0, (RE - bond) * 8) : 1.1;
    }
    if (dipoleRef.current) dipoleRef.current.visible = showDipole && bond < 1.5;

    // 5) density envelope: hugs He, stretching toward H only while bonded
    if (shellRef.current) {
      const k = cH / 0.3; // 1 bonded → 0 dissociated
      const cx = he[0] * (1 - 0.38 * k) * S;
      shellRef.current.position.x += (cx - shellRef.current.position.x) * 0.2;
      const rx = (0.95 + bond * 0.35 * k) * S * 2.0;
      const ry = 0.95 * S * 2.0;
      shellRef.current.scale.set(rx, ry, ry);
    }
  });

  return (
    <group>
      <CloudShell shellRef={shellRef} color={SWARM_COLOR_HEX} opacity={0.08} />

      <SoftPoints
        pointsRef={pointsRef}
        count={count}
        color={SWARM_COLOR_HEX}
        size={0.055}
        opacity={0.42}
      />

      <group ref={heGroup}>
        <Atom
          radius={0.1}
          color={HE_COLOR_HEX}
          coreColor={HE_CORE_HEX}
          pulse
          beacon
          haloScale={2.6}
        />
        <AtomLabel text="He" color={HE_COLOR_HEX} position={[0, 0.34, 0]} />
      </group>
      <group ref={hGroup}>
        <Atom
          radius={0.06}
          color={H_COLOR_HEX}
          coreColor={H_CORE_HEX}
          pulse
          beacon
          beaconOpacity={0.26}
        />
        <AtomLabel text="H⁺" color={H_COLOR_HEX} position={[0, 0.27, 0]} />
      </group>

      {/* glowing bond */}
      <mesh ref={bondRef} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.014, 0.014, 1, 20]} />
        <meshStandardMaterial
          color="#dbe7ff"
          emissive="#9fc4ff"
          emissiveIntensity={1.1}
          transparent
          opacity={0.6}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* dipole arrow toward δ+ (H) */}
      <group ref={dipoleRef} position={[0, -0.62, 0]}>
        <mesh position={[0.25, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.009, 0.009, 0.5, 12]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.9}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.028, 0.07, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.9}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
