import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { interpolatePosition } from "@/lib/horizonsUtils";

export function Asteroid({ asteroidOrbitData, isPlaying, currentDate }) {
  const meshRef = useRef();
  const [positions, setPositions] = useState([]);
  const AU_TO_UNITS = 3 / 149597870.7; // Convert km to scene units (1 AU = 3 units)

  useFrame(() => {
    if (!asteroidOrbitData || asteroidOrbitData.length === 0 || !meshRef.current) return;

    const pos = interpolatePosition(asteroidOrbitData, currentDate.getTime());
    if (pos) {
      // Convert from km to scene units and adjust coordinate system
      // Horizons uses ecliptic coordinates (X, Y, Z)
      // Three.js uses Y-up, so we map: X->X, Y->Z, Z->Y
      const x = pos.x * AU_TO_UNITS;
      const y = pos.z * AU_TO_UNITS;
      const z = pos.y * AU_TO_UNITS;
      
      meshRef.current.position.set(x, y, z);

      // Update trail only when playing
      if (isPlaying) {
        setPositions(prev => {
          const newPos = [x, y, z];
          const updated = [newPos, ...prev].slice(0, 150);
          return updated;
        });
      }
    }
  });

  // Create orbit path from data
  const orbitPoints = asteroidOrbitData.map(point => {
    const x = point.x * AU_TO_UNITS;
    const y = point.z * AU_TO_UNITS;
    const z = point.y * AU_TO_UNITS;
    return new THREE.Vector3(x, y, z);
  });

  return (
    <>
      {/* Orbit path */}
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
          <lineBasicMaterial color="#999999" opacity={0.5} transparent />
        </line>
      )}

      {/* Asteroid trail */}
      {positions.length > 1 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={positions.length}
              array={new Float32Array(positions.flat())}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#FF6B6B" opacity={0.6} transparent linewidth={2} />
        </line>
      )}

      {/* Asteroid */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#999999" roughness={0.8} metalness={0.2} />
      </mesh>
    </>
  );
}
