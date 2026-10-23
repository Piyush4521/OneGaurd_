import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, ContactShadows } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const H = 2.2;
const R = 0.78;

interface BodyProps {
  fill: number;
  shellColor?: string;
  isAlarm?: boolean;
}

function Body({ fill, shellColor = "#c8321f", isAlarm = false }: BodyProps) {
  const liquid = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const target = Math.max(0.02, Math.min(1, fill));

  // Liquid color shifts based on fill and alarm state
  const liquidColor = useMemo(() => {
    if (isAlarm) return "#dc2626"; // Emergency red
    if (target < 0.15) return "#ef4444"; // Low gas warning red-orange
    if (target < 0.3) return "#f59e0b"; // Medium yellow-amber
    return "#ff8a2a"; // Healthy LPG orange
  }, [target, isAlarm]);

  const shell = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    pts.push(new THREE.Vector2(0, 0));
    pts.push(new THREE.Vector2(R * 0.92, 0));
    pts.push(new THREE.Vector2(R, 0.12));
    pts.push(new THREE.Vector2(R, H - 0.35));
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * (Math.PI / 2);
      pts.push(new THREE.Vector2(Math.cos(a) * R, H - 0.35 + Math.sin(a) * 0.45));
    }
    return new THREE.LatheGeometry(pts, 64);
  }, []);

  useFrame((s, d) => {
    const dt = Math.min(d, 0.05);
    if (liquid.current) {
      const sy = liquid.current.scale.y;
      const ny = sy + (target - sy) * (1 - Math.exp(-3 * dt));
      liquid.current.scale.y = ny;
      liquid.current.position.y = 0.06 + (ny * (H - 0.5)) / 2;
    }
    if (ring.current) {
      const m = ring.current.material as THREE.MeshStandardMaterial;
      if (isAlarm) {
        // High frequency alarm flash
        m.emissive.set("#ef4444");
        m.emissiveIntensity = 0.8 + Math.sin(s.clock.elapsedTime * 8) * 0.7;
      } else {
        // Subtle safety breathe
        m.emissive.set("#ffb000");
        m.emissiveIntensity = 0.5 + Math.sin(s.clock.elapsedTime * 2.2) * 0.3;
      }
    }
  });

  return (
    <group position={[0, -1.15, 0]}>
      {/* Translucent cylinder body */}
      <mesh geometry={shell} castShadow>
        <meshPhysicalMaterial
          color={shellColor}
          roughness={0.28}
          metalness={0.15}
          clearcoat={1}
          clearcoatRoughness={0.2}
          transparent
          opacity={0.44}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Internal LPG Liquid level representation */}
      <mesh ref={liquid} position={[0, 0.5, 0]} scale={[1, 0.01, 1]}>
        <cylinderGeometry args={[R * 0.9, R * 0.9, H - 0.5, 48]} />
        <meshStandardMaterial
          color={liquidColor}
          emissive={liquidColor}
          emissiveIntensity={isAlarm ? 0.6 : 0.3}
          roughness={0.4}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Metal bottom foot ring */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[R * 0.85, R * 0.88, 0.16, 48, 1, true]} />
        <meshStandardMaterial color="#2a2522" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* OneGuard Smart IoT Sensor Ring */}
      <mesh ref={ring} position={[0, -0.04, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[R * 1.08, 0.07, 20, 80]} />
        <meshStandardMaterial color="#1f1b18" emissive="#ffb000" emissiveIntensity={0.6} roughness={0.35} metalness={0.4} />
      </mesh>

      {/* Cylinder collar & valve handle */}
      <mesh position={[0, H + 0.18, 0]}>
        <cylinderGeometry args={[0.42, 0.46, 0.32, 40, 1, true]} />
        <meshStandardMaterial color={shellColor} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, H + 0.12, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.28, 24]} />
        <meshStandardMaterial color="#c9a54a" metalness={0.9} roughness={0.25} />
      </mesh>
    </group>
  );
}

export interface Cylinder3DProps {
  fill: number;
  shellColor?: string;
  isAlarm?: boolean;
}

export default function Cylinder3D({ fill, shellColor = "#c8321f", isAlarm = false }: Cylinder3DProps) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0.6, 5], fov: 38 }} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <Body fill={fill} shellColor={shellColor} isAlarm={isAlarm} />
      <ContactShadows position={[0, -1.24, 0]} opacity={0.45} scale={5} blur={2.4} far={2} />
      <Environment resolution={128}>
        <Lightformer intensity={2.2} position={[0, 5, 0]} scale={[10, 10, 1]} />
        <Lightformer intensity={1.2} color="#ffd9b0" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
        <Lightformer intensity={0.8} color="#bfe8ea" position={[5, 1, 1]} rotation-y={-Math.PI / 2} scale={[20, 1, 1]} />
      </Environment>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={isAlarm ? 2.5 : 1.2}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.8}
      />
    </Canvas>
  );
}
