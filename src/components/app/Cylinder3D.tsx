import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, ContactShadows } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const H = 2.2;
const R = 0.78;

function Body({ fill }: { fill: number }) {
  const liquid = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const target = Math.max(0.02, Math.min(1, fill));

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
      m.emissiveIntensity = 0.6 + Math.sin(s.clock.elapsedTime * 2.2) * 0.35;
    }
  });

  return (
    <group position={[0, -1.15, 0]}>
      <mesh geometry={shell} castShadow>
        <meshPhysicalMaterial color="#c8321f" roughness={0.32} metalness={0.15} clearcoat={1} clearcoatRoughness={0.2} transparent opacity={0.42} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={liquid} position={[0, 0.5, 0]} scale={[1, 0.01, 1]}>
        <cylinderGeometry args={[R * 0.9, R * 0.9, H - 0.5, 48]} />
        <meshStandardMaterial color="#ff8a2a" emissive="#ff6a00" emissiveIntensity={0.35} roughness={0.4} transparent opacity={0.9} />
      </mesh>
      {/* foot ring */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[R * 0.85, R * 0.88, 0.16, 48, 1, true]} />
        <meshStandardMaterial color="#2a2522" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* OneGuard safety ring */}
      <mesh ref={ring} position={[0, -0.04, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[R * 1.08, 0.07, 20, 80]} />
        <meshStandardMaterial color="#1f1b18" emissive="#ffb000" emissiveIntensity={0.7} roughness={0.35} metalness={0.4} />
      </mesh>
      {/* collar + valve */}
      <mesh position={[0, H + 0.18, 0]}>
        <cylinderGeometry args={[0.42, 0.46, 0.32, 40, 1, true]} />
        <meshStandardMaterial color="#b92c1b" roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, H + 0.12, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.28, 24]} />
        <meshStandardMaterial color="#c9a54a" metalness={0.9} roughness={0.25} />
      </mesh>
    </group>
  );
}

export default function Cylinder3D({ fill }: { fill: number }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0.6, 5], fov: 38 }} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <Body fill={fill} />
      <ContactShadows position={[0, -1.24, 0]} opacity={0.45} scale={5} blur={2.4} far={2} />
      <Environment resolution={128}>
        <Lightformer intensity={2.2} position={[0, 5, 0]} scale={[10, 10, 1]} />
        <Lightformer intensity={1.2} color="#ffd9b0" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
        <Lightformer intensity={0.8} color="#bfe8ea" position={[5, 1, 1]} rotation-y={-Math.PI / 2} scale={[20, 1, 1]} />
      </Environment>
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.2} minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 1.8} />
    </Canvas>
  );
}
