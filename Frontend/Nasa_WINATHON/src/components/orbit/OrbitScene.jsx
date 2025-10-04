import { OrbitControls, Stars } from "@react-three/drei";
import { Sun } from "./Sun";
import { Earth } from "./Earth";
import { Asteroid } from "./Asteroid";

export function OrbitScene({ asteroidOrbitData, earthOrbitData, isPlaying, currentDate }) {
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={0.1} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <Sun isPlaying={isPlaying} />
      {earthOrbitData && earthOrbitData.length > 0 && (
        <Earth earthOrbitData={earthOrbitData} isPlaying={isPlaying} currentDate={currentDate} />
      )}
      {asteroidOrbitData && asteroidOrbitData.length > 0 && (
        <Asteroid 
          asteroidOrbitData={asteroidOrbitData} 
          isPlaying={isPlaying} 
          currentDate={currentDate}
        />
      )}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={20}
      />
    </>
  );
}
