import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export function Sun({ isPlaying }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (!isPlaying) return;
    meshRef.current.rotation.y += 0.001;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial
        emissive="#FDB813"
        emissiveIntensity={2}
        color="#FDB813"
      />
      <pointLight intensity={2} distance={50} decay={0.5} />
    </mesh>
  );
}
