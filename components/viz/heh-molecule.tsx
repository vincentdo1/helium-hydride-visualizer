"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { type Group, type Mesh, type Points, type ShaderMaterial } from "three";
import { createSwarm, stepSwarm, type SwarmState } from "@/lib/physics/swarm";
import { makeHehDensity, nucleiPositions } from "@/lib/physics/density";
import { Atom, CloudShell, SoftPoints } from "@/components/viz/primitives";
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
const VIB_RATE = 2 * Math.PI * 1.1; // breathing rate (rad/s)

export type HehMoleculeProps = {
  mode: ViewerMode;
  bondLengthA: number;
  amplitudeA?: number;
  showDipole?: boolean;
  count?: number;
};

// The bonded HeH⁺ instrument: a glowing electron gas + fresnel-lit nuclei +
// luminous bond + dipole, wrapped in a faint density shell. All animation is
// imperative in useFrame (writing geometry buffers / object transforms via refs)
// so there are no per-frame React renders — and we never mutate hook returns.
export function HehMolecule({
  mode,
  bondLengthA,
  amplitudeA = 0,
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
    const positions = posAttr.array as Float32Array;

    // 1) bond length for this frame
    if (mode !== "vibration") {
      bondNow.current += (bondLengthA - bondNow.current) * 0.18;
    }
    const bond =
      mode === "vibration"
        ? BOND_LENGTH_ANGSTROM +
          amplitudeA * Math.sin(clock.getElapsedTime() * VIB_RATE)
        : bondNow.current;

    const { he, h } = nucleiPositions(bond);
    const density = makeHehDensity(he, h, 0.3);

    const swarm = (swarmRef.current ??= createSwarm(
      count,
      [
        { center: he, spread: 0.42, weight: 0.76 },
        { center: h, spread: 0.5, weight: 0.24 },
      ],
      density,
    ));

    // 2) advance the swarm, push to GPU
    stepSwarm(swarm, density, 2);
    const src = swarm.posA;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      positions[ix] = src[ix] * S;
      positions[ix + 1] = src[ix + 1] * S;
      positions[ix + 2] = src[ix + 2] * S;
    }
    posAttr.needsUpdate = true;

    // 3) nuclei + bond
    if (heGroup.current) heGroup.current.position.x = he[0] * S;
    if (hGroup.current) hGroup.current.position.x = h[0] * S;
    if (bondRef.current) {
      bondRef.current.scale.y = Math.max(bond * S, 1e-3);
      bondRef.current.visible = bond < 2.6;
      const m = bondRef.current.material as ShaderMaterial & {
        opacity: number;
      };
      m.opacity = 0.6 * Math.min(1, (2.6 - bond) / 1.3);
    }
    if (dipoleRef.current) dipoleRef.current.visible = showDipole && bond < 1.5;

    // 4) density shell: ellipsoid hugging the cloud, biased toward He
    if (shellRef.current) {
      const cx = he[0] * 0.62 * S; // weighted toward He
      shellRef.current.position.x += (cx - shellRef.current.position.x) * 0.2;
      const rx = (0.95 + bond * 0.35) * S * 2.0;
      const ry = 0.95 * S * 2.0;
      shellRef.current.scale.set(rx, ry, ry);
    }
  });

  return (
    <group>
      <CloudShell shellRef={shellRef} color={SWARM_COLOR_HEX} opacity={0.1} />

      <SoftPoints
        pointsRef={pointsRef}
        count={count}
        color={SWARM_COLOR_HEX}
        size={0.055}
        opacity={0.42}
      />

      <group ref={heGroup}>
        <Atom
          radius={0.085}
          color={HE_COLOR_HEX}
          coreColor={HE_CORE_HEX}
          pulse
          beacon
          haloScale={2.4}
        />
      </group>
      <group ref={hGroup}>
        <Atom radius={0.05} color={H_COLOR_HEX} coreColor={H_CORE_HEX} pulse />
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
