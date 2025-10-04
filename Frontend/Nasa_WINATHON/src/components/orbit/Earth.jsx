import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { interpolatePosition } from "@/lib/horizonsUtils";

export function Earth({ earthOrbitData, isPlaying, currentDate }) {
  const meshRef = useRef();
  const AU_TO_UNITS = 3 / 149597870.7; // Convert km to scene units (1 AU = 3 units)

  useFrame(() => {
    if (!earthOrbitData || earthOrbitData.length === 0 || !meshRef.current) return;

    const pos = interpolatePosition(earthOrbitData, currentDate.getTime());
    if (pos) {
      // Convert from km to scene units and adjust coordinate system
      // Horizons uses ecliptic coordinates (X, Y, Z)
      // Three.js uses Y-up, so we map: X->X, Y->Z, Z->Y
      const x = pos.x * AU_TO_UNITS;
      const y = pos.z * AU_TO_UNITS;
      const z = pos.y * AU_TO_UNITS;
      
      meshRef.current.position.set(x, y, z);
      if (isPlaying) {
        meshRef.current.rotation.y += 0.01;
      }
    }
  });

  // Create orbit path from data
  const orbitPoints = earthOrbitData.map(point => {
    const x = point.x * AU_TO_UNITS;
    const y = point.z * AU_TO_UNITS;
    const z = point.y * AU_TO_UNITS;
    return new THREE.Vector3(x, y, z);
  });

  return (
    <>
      {/* Earth orbit line */}
      {orbitPoints.length > 0 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={orbitPoints.length}
              array={new Float32Array(orbitPoints.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#4DA6FF" opacity={0.3} transparent />
        </line>
      )}

      {/* Earth */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial color="#4DA6FF" metalness={0.4} roughness={0.7} />
      </mesh>
    </>
  );
}
