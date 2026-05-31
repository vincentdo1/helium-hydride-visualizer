"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useFrame,
  useStore,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import {
  AdditiveBlending,
  DoubleSide,
  Plane,
  Quaternion,
  Vector2,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type Points,
} from "three";
import { createSwarm, stepSwarm, type SwarmState } from "@/lib/physics/swarm";
import { makeHehDensity, type Vec3 } from "@/lib/physics/density";
import { Atom, SoftPoints } from "@/components/viz/primitives";
import {
  ANGSTROM_TO_SCENE,
  BOND_LENGTH_ANGSTROM,
  HE_COLOR_HEX,
  HE_CORE_HEX,
  H_COLOR_HEX,
  H_CORE_HEX,
  SWARM_COLOR_HEX,
} from "@/lib/constants";

const S = ANGSTROM_TO_SCENE;
const RE = BOND_LENGTH_ANGSTROM; // equilibrium bond length, Å
const R_OVERLAP = 2.5; // beyond this the proton is bare (no shared cloud)
const C_MAX = 0.3; // bonded He/H mixing coefficient
const R_BOND = 1.15; // separation at which the bond "clicks" closed, Å
const R_BREAK = 1.8; // pull past this and the bond is considered broken, Å
const START = 2.1; // initial half-separation on reset, Å

// He/H coefficient grows as the atoms approach: 0 when far (lone He + bare
// proton), → C_MAX at rₑ. A linear ramp in the overlap window reads well.
function bondCharacter(R: number): number {
  if (R >= R_OVERLAP) return 0;
  if (R <= RE) return C_MAX;
  return (C_MAX * (R_OVERLAP - R)) / (R_OVERLAP - RE);
}

export type FormationMoleculeProps = {
  onChange: (s: { R: number; bonded: boolean }) => void;
  resetSignal: number;
  count?: number;
};

// Drag a helium atom and a bare proton (H⁺) together to assemble HeH⁺.
//   He + H⁺ → HeH⁺ + γ
// The shared electron cloud starts wholly on He, then grows a bond toward the
// proton as it approaches; at rₑ the bond clicks closed and a photon flies off
// (the binding energy radiated away). Pull them back apart to reverse it.
export function FormationMolecule({
  onChange,
  resetSignal,
  count = 3200,
}: FormationMoleculeProps) {
  const { camera, gl, raycaster } = useThree();
  const store = useStore();

  // Toggle OrbitControls without statically capturing the controls object.
  const setOrbitEnabled = useCallback(
    (enabled: boolean) => {
      const c = store.getState().controls as { enabled: boolean } | null;
      if (c) c.enabled = enabled;
    },
    [store],
  );
  const setCursor = useCallback(
    (c: string) => {
      store.getState().gl.domElement.style.cursor = c;
    },
    [store],
  );
  const onHover = useCallback(() => setCursor("grab"), [setCursor]);
  const onUnhover = useCallback(() => setCursor("auto"), [setCursor]);

  // Live nucleus positions in Å (mutated during drag, read in useFrame).
  const hePos = useRef(new Vector3(-START, 0, 0));
  const hPos = useRef(new Vector3(START, 0, 0));
  const dragging = useRef<null | "he" | "h">(null);
  const bonded = useRef(false);

  const swarmRef = useRef<SwarmState | null>(null);
  const pointsRef = useRef<Points>(null);
  const heGroup = useRef<Group>(null);
  const hGroup = useRef<Group>(null);
  const bondRef = useRef<Mesh>(null);
  const photonRef = useRef<Mesh>(null);
  const flashRef = useRef<Mesh>(null);
  const photon = useRef({
    active: false,
    t0: 0,
    dir: new Vector3(),
    mid: new Vector3(),
  });

  // Scratch objects (allocated once).
  const tmp = useMemo(() => new Vector3(), []);
  const dir = useMemo(() => new Vector3(), []);
  const plane = useMemo(() => new Plane(), []);
  const normal = useMemo(() => new Vector3(), []);
  const hit = useMemo(() => new Vector3(), []);
  const ndc = useMemo(() => new Vector2(), []);
  const quat = useMemo(() => new Quaternion(), []);
  const UP = useMemo(() => new Vector3(0, 1, 0), []);
  const lastReport = useRef({ t: -1, R: -1, bonded: false });

  const reseed = useCallback(() => {
    const he: Vec3 = [hePos.current.x, hePos.current.y, hePos.current.z];
    const h: Vec3 = [hPos.current.x, hPos.current.y, hPos.current.z];
    const R = hePos.current.distanceTo(hPos.current);
    const density = makeHehDensity(he, h, bondCharacter(R));
    swarmRef.current = createSwarm(
      count,
      [{ center: he, spread: 0.5, weight: 1 }],
      density,
      { extentA: 6 },
    );
  }, [count]);

  // Reset to the separated state whenever the parent bumps resetSignal (+ mount).
  useEffect(() => {
    hePos.current.set(-START, 0, 0);
    hPos.current.set(START, 0, 0);
    bonded.current = false;
    photon.current.active = false;
    reseed();
    onChange({ R: 2 * START, bonded: false });
  }, [resetSignal, reseed, onChange]);

  // Pointer-drag in the camera-facing plane through the grabbed atom.
  useEffect(() => {
    const el = gl.domElement;
    const move = (ev: PointerEvent) => {
      if (!dragging.current) return;
      const rect = el.getBoundingClientRect();
      ndc.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      const cur = dragging.current === "he" ? hePos.current : hPos.current;
      tmp.set(cur.x * S, cur.y * S, cur.z * S);
      camera.getWorldDirection(normal);
      plane.setFromNormalAndCoplanarPoint(normal, tmp);
      if (raycaster.ray.intersectPlane(plane, hit)) {
        cur.set(hit.x / S, hit.y / S, hit.z / S);
      }
    };
    const up = (ev: PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = null;
      setOrbitEnabled(true);
      setCursor("auto");
      try {
        el.releasePointerCapture(ev.pointerId);
      } catch {
        /* capture may not be held */
      }
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointerleave", up);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointerleave", up);
    };
  }, [
    camera,
    gl,
    raycaster,
    setOrbitEnabled,
    setCursor,
    plane,
    normal,
    hit,
    ndc,
    tmp,
  ]);

  const onGrab = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const atom = e.eventObject.userData.atom as "he" | "h" | undefined;
      if (atom !== "he" && atom !== "h") return;
      dragging.current = atom;
      setOrbitEnabled(false);
      setCursor("grabbing");
      try {
        gl.domElement.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [setOrbitEnabled, setCursor, gl],
  );

  useFrame(({ clock }) => {
    const points = pointsRef.current;
    if (!points) return;
    const posAttr = points.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;

    let R = hePos.current.distanceTo(hPos.current);

    // Once bonded, ease toward rₑ when not being dragged so it "settles".
    if (bonded.current && !dragging.current && Math.abs(R - RE) > 0.004) {
      tmp.copy(hePos.current).add(hPos.current).multiplyScalar(0.5);
      dir.copy(hPos.current).sub(hePos.current).normalize();
      const newR = R + (RE - R) * 0.12;
      hePos.current.copy(tmp).addScaledVector(dir, -newR / 2);
      hPos.current.copy(tmp).addScaledVector(dir, newR / 2);
      R = newR;
    }

    const he: Vec3 = [hePos.current.x, hePos.current.y, hePos.current.z];
    const h: Vec3 = [hPos.current.x, hPos.current.y, hPos.current.z];
    const density = makeHehDensity(he, h, bondCharacter(R));
    const swarm = (swarmRef.current ??= createSwarm(
      count,
      [{ center: he, spread: 0.5, weight: 1 }],
      density,
      { extentA: 6 },
    ));
    stepSwarm(swarm, density, 2);
    const src = swarm.posA;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      arr[ix] = src[ix] * S;
      arr[ix + 1] = src[ix + 1] * S;
      arr[ix + 2] = src[ix + 2] * S;
    }
    posAttr.needsUpdate = true;

    // Atoms.
    if (heGroup.current)
      heGroup.current.position.set(he[0] * S, he[1] * S, he[2] * S);
    if (hGroup.current)
      hGroup.current.position.set(h[0] * S, h[1] * S, h[2] * S);

    // Bond along the dynamic axis.
    if (bondRef.current) {
      const showBond = R < R_BREAK;
      bondRef.current.visible = showBond;
      if (showBond) {
        tmp.copy(hePos.current).add(hPos.current).multiplyScalar(0.5);
        dir.copy(hPos.current).sub(hePos.current).normalize();
        quat.setFromUnitVectors(UP, dir);
        bondRef.current.quaternion.copy(quat);
        bondRef.current.position.set(tmp.x * S, tmp.y * S, tmp.z * S);
        bondRef.current.scale.set(1, R * S, 1);
        (bondRef.current.material as MeshStandardMaterial).opacity =
          0.7 * Math.min(1, (R_BREAK - R) / (R_BREAK - RE));
      }
    }

    // Bonding / breaking transitions.
    if (!bonded.current && R <= R_BOND) {
      bonded.current = true;
      photon.current.active = true;
      photon.current.t0 = clock.getElapsedTime();
      photon.current.mid
        .copy(hePos.current)
        .add(hPos.current)
        .multiplyScalar(0.5);
      photon.current.dir.set(0.35, 1, 0.25).normalize();
    } else if (bonded.current && R > R_BREAK) {
      bonded.current = false;
    }

    // Photon flight + flash ring.
    const ph = photon.current;
    const photonMesh = photonRef.current;
    const flashMesh = flashRef.current;
    if (ph.active && photonMesh && flashMesh) {
      const t = clock.getElapsedTime() - ph.t0;
      const dur = 1.3;
      if (t >= dur) {
        ph.active = false;
        photonMesh.visible = false;
        flashMesh.visible = false;
      } else {
        const k = t / dur;
        photonMesh.visible = true;
        tmp.copy(ph.mid).addScaledVector(ph.dir, 0.5 + t * 3.2);
        photonMesh.position.set(tmp.x * S, tmp.y * S, tmp.z * S);
        photonMesh.scale.setScalar(0.07 * (1 - 0.4 * k));
        (photonMesh.material as MeshBasicMaterial).opacity = Math.max(0, 1 - k);

        flashMesh.visible = true;
        flashMesh.position.set(ph.mid.x * S, ph.mid.y * S, ph.mid.z * S);
        flashMesh.scale.setScalar(0.1 + k * 1.5);
        flashMesh.lookAt(camera.position);
        (flashMesh.material as MeshBasicMaterial).opacity = Math.max(
          0,
          0.9 * (1 - k),
        );
      }
    } else if (photonMesh && flashMesh) {
      photonMesh.visible = false;
      flashMesh.visible = false;
    }

    // Throttled report to the sidebar (~10 Hz, on meaningful change).
    const now = clock.getElapsedTime();
    const lr = lastReport.current;
    if (
      now - lr.t > 0.1 &&
      (Math.abs(R - lr.R) > 0.01 || bonded.current !== lr.bonded)
    ) {
      lr.t = now;
      lr.R = R;
      lr.bonded = bonded.current;
      onChange({ R, bonded: bonded.current });
    }
  });

  return (
    <group>
      <SoftPoints
        pointsRef={pointsRef}
        count={count}
        color={SWARM_COLOR_HEX}
        size={0.055}
        opacity={0.42}
      />

      {/* Helium atom — draggable (cyan, electron-rich) */}
      <group
        ref={heGroup}
        userData={{ atom: "he" }}
        onPointerDown={onGrab}
        onPointerOver={onHover}
        onPointerOut={onUnhover}
      >
        <Atom
          radius={0.09}
          color={HE_COLOR_HEX}
          coreColor={HE_CORE_HEX}
          grab
          pulse
          beacon
          haloScale={2.4}
        />
      </group>

      {/* Bare proton — draggable (amber, no electron cloud of its own) */}
      <group
        ref={hGroup}
        userData={{ atom: "h" }}
        onPointerDown={onGrab}
        onPointerOver={onHover}
        onPointerOut={onUnhover}
      >
        <Atom
          radius={0.052}
          color={H_COLOR_HEX}
          coreColor={H_CORE_HEX}
          grab
          pulse
        />
      </group>

      {/* Bond along the dynamic axis */}
      <mesh ref={bondRef} visible={false}>
        <cylinderGeometry args={[0.014, 0.014, 1, 20]} />
        <meshStandardMaterial
          color="#dbe7ff"
          emissive="#9fc4ff"
          emissiveIntensity={1.1}
          transparent
          opacity={0.7}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* Emitted photon (γ) + flash ring */}
      <mesh ref={photonRef} visible={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={1}
          depthWrite={false}
          toneMapped={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh ref={flashRef} visible={false}>
        <ringGeometry args={[0.5, 0.72, 48]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          side={DoubleSide}
          depthWrite={false}
          toneMapped={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
