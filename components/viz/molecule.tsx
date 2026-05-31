"use client";

import { nucleiPositions, type Vec3 } from "@/lib/physics/density";
import { DIPOLE_MOMENT_DEBYE } from "@/lib/constants";

// Scale Ångström → scene units so the molecule sits comfortably inside the
// volume cube. The volume cube samples ±3 Å mapped to a `size`-unit box, so
// 1 Å ≈ size / (2*extent). With size 2.4 and extent 3 that is 0.4 units/Å.
const A_TO_UNITS = 2.4 / 6.0;

function toUnits(p: Vec3): [number, number, number] {
  return [p[0] * A_TO_UNITS, p[1] * A_TO_UNITS, p[2] * A_TO_UNITS];
}

export function Molecule({
  bondLengthA,
  showDipole = true,
}: {
  bondLengthA: number;
  showDipole?: boolean;
}) {
  const { he, h } = nucleiPositions(bondLengthA);
  const hePos = toUnits(he);
  const hPos = toUnits(h);

  // Dipole arrow along +x (electron-poor H end), length scaled by μ for feel.
  const dipoleLen = (DIPOLE_MOMENT_DEBYE / 1.66) * 0.5;

  return (
    <group>
      <mesh position={hePos}>
        <sphereGeometry args={[0.07, 32, 32]} />
        <meshStandardMaterial
          color="#dfe9ff"
          emissive="#9fc4ff"
          emissiveIntensity={0.6}
        />
      </mesh>
      <mesh position={hPos}>
        <sphereGeometry args={[0.045, 32, 32]} />
        <meshStandardMaterial
          color="#fff1d6"
          emissive="#ffd27a"
          emissiveIntensity={0.55}
        />
      </mesh>

      {showDipole && (
        <group position={[0, -0.55, 0]}>
          <mesh
            position={[dipoleLen / 2, 0, 0]}
            rotation={[0, 0, -Math.PI / 2]}
          >
            <cylinderGeometry args={[0.008, 0.008, dipoleLen, 12]} />
            <meshBasicMaterial color="#9fffc4" />
          </mesh>
          <mesh position={[dipoleLen, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.025, 0.06, 16]} />
            <meshBasicMaterial color="#9fffc4" />
          </mesh>
        </group>
      )}
    </group>
  );
}
