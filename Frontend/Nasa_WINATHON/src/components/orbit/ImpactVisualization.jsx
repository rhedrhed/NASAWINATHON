import { useRef, useState } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Trail } from "@react-three/drei";
import * as THREE from "three";

export function ImpactVisualization({ impactData, isPlaying }) {
  const asteroidRef = useRef();
  const [progress, setProgress] = useState(0);
  const [showExplosion, setShowExplosion] = useState(false);
  const explosionRef = useRef();
  const airburstRef = useRef();

  // Load Earth texture
  const earthTexture = useLoader(THREE.TextureLoader, 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg');

  // Get impact type from data
  const impactType = impactData?.impactType || "ground";
  const burstAltitude = impactData?.burstAltitude ? parseFloat(impactData.burstAltitude) : null;

  // Calculate accurate sizes and speeds
  const earthRadiusKm = 6371; // Earth's actual radius in km
  const earthRadiusUnits = 1; // Earth is 1 unit in our scene
  const kmToUnits = earthRadiusUnits / earthRadiusKm; // Scale factor

  // Asteroid dimensions (from impact data)
  const asteroidDiameterMeters = impactData ? parseFloat(impactData.diameterAvg) : 50;
  const asteroidDiameterKm = asteroidDiameterMeters / 1000;
  const asteroidRadiusUnits = (asteroidDiameterKm / 2) * kmToUnits;

  // Velocity calculations for realistic speed
  const velocityKmPerSec = impactData ? parseFloat(impactData.velocity) : 20;
  // Start distance: closer to Earth for faster, more dramatic impact (e.g., 10,000 km = ~1.5 Earth radii)
  const startDistanceKm = 10000;
  const startDistanceUnits = startDistanceKm * kmToUnits;

  // Calculate burst altitude position (if airburst)
  const burstAltitudeUnits = burstAltitude ? (burstAltitude / earthRadiusKm) : 0;
  const burstDistance = earthRadiusUnits + burstAltitudeUnits;

  // Calculate time to impact/burst at given velocity
  const timeToImpactSeconds = startDistanceKm / velocityKmPerSec;
  // Animation speed factor: how fast to run the animation (scale down for visibility)
  const timeScale = 3; // Make it 3x faster for better viewing (reduced from 5)
  const animationDuration = timeToImpactSeconds / timeScale;

  // Delta speed: how much progress to add per frame based on real velocity
  const progressPerSecond = 1 / animationDuration;

  useFrame((state, delta) => {
    if (!asteroidRef.current) return;

    // Always position the asteroid, even when paused
    const t = progress;
    
    // For airburst, stop at burst altitude; for ground impact, continue to surface
    let targetDistance = earthRadiusUnits;
    if (impactType === "airburst" && burstDistance > earthRadiusUnits) {
      targetDistance = burstDistance;
    }
    
    const currentDistance = startDistanceUnits - (startDistanceUnits - targetDistance) * t;
    
    // Position on approach vector (from upper-left to center)
    const x = -currentDistance * 0.5;
    const y = currentDistance * 0.3;
    const z = -currentDistance * 0.3;
    
    asteroidRef.current.position.set(x, y, z);

    // Only update animation when playing
    if (!isPlaying) return;

    // Animate asteroid approaching Earth
    if (progress < 1) {
      setProgress((prev) => Math.min(prev + delta * progressPerSecond, 1));
    } else if (progress >= 1 && !showExplosion) {
      setShowExplosion(true);
      setTimeout(() => {
        setShowExplosion(false);
        setProgress(0); // Reset for loop
      }, 3000);
    }

    // Rotate asteroid as it travels
    asteroidRef.current.rotation.x += delta * 2;
    asteroidRef.current.rotation.y += delta * 1.5;

    // Animate explosion
    if (showExplosion && explosionRef.current) {
      const explosionTime = (state.clock.getElapsedTime() % 3) / 3;
      const scale = Math.min(explosionTime * 3, 2);
      explosionRef.current.scale.set(scale, scale, scale);
      explosionRef.current.material.opacity = Math.max(0, 1 - explosionTime * 0.5);
    }

    // Animate airburst explosion (higher altitude)
    if (showExplosion && airburstRef.current && impactType === "airburst") {
      const explosionTime = (state.clock.getElapsedTime() % 3) / 3;
      const scale = Math.min(explosionTime * 4, 3); // Larger for airburst
      airburstRef.current.scale.set(scale, scale, scale);
      airburstRef.current.material.opacity = Math.max(0, 1 - explosionTime * 0.4);
    }
  });

  // Minimum visible size for very small asteroids
  const minVisibleSize = 0.01;
  const asteroidDisplayRadius = Math.max(asteroidRadiusUnits, minVisibleSize);
  const scaleFactor = asteroidDisplayRadius < 0.05 ? 2 : 1; // Slightly enhance small asteroids for visibility

  return (
    <group>
      {/* Earth with realistic texture */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[earthRadiusUnits, 64, 64]} />
        <meshStandardMaterial
          map={earthTexture}
          emissive="#1e3a8a"
          emissiveIntensity={0.2}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Earth atmosphere glow */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[earthRadiusUnits * 1.02, 32, 32]} />
        <meshBasicMaterial
          color="#4DA6FF"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Asteroid with trail - always visible */}
      {!showExplosion && (
        <>
          {isPlaying ? (
            // With trail when playing
            <Trail
              width={asteroidDisplayRadius * scaleFactor * 2}
              length={Math.min(20, startDistanceUnits * 0.1)}
              color="#ff6b6b"
              attenuation={(t) => t * t}
            >
              <mesh ref={asteroidRef}>
                <sphereGeometry args={[asteroidDisplayRadius * scaleFactor, 16, 16]} />
                <meshStandardMaterial
                  color="#888888"
                  emissive="#ff4444"
                  emissiveIntensity={0.3}
                  roughness={0.9}
                  metalness={0.1}
                />
              </mesh>
            </Trail>
          ) : (
            // Without trail when paused
            <mesh ref={asteroidRef}>
              <sphereGeometry args={[asteroidDisplayRadius * scaleFactor, 16, 16]} />
              <meshStandardMaterial
                color="#888888"
                emissive="#ff4444"
                emissiveIntensity={0.3}
                roughness={0.9}
                metalness={0.1}
              />
            </mesh>
          )}
        </>
      )}

      {/* Impact explosion effects - different for airburst vs ground impact */}
      {showExplosion && (
        <>
          {impactType === "airburst" ? (
            // Airburst explosion - higher altitude, more spherical
            <>
              {/* Airburst explosion sphere at altitude */}
              <mesh ref={airburstRef} position={[-burstDistance * 0.5, burstDistance * 0.3, -burstDistance * 0.3]}>
                <sphereGeometry args={[burstAltitudeUnits * 3, 32, 32]} />
                <meshBasicMaterial
                  color="#ffaa00"
                  transparent
                  opacity={0.7}
                />
              </mesh>

              {/* Atmospheric shockwave - expanding sphere */}
              <mesh position={[-burstDistance * 0.5, burstDistance * 0.3, -burstDistance * 0.3]}>
                <sphereGeometry args={[burstAltitudeUnits * 5, 32, 32]} />
                <meshBasicMaterial
                  color="#ff6600"
                  transparent
                  opacity={0.2}
                  side={THREE.BackSide}
                />
              </mesh>

              {/* Bright flash */}
              <pointLight
                position={[-burstDistance * 0.5, burstDistance * 0.3, -burstDistance * 0.3]}
                color="#ffcc00"
                intensity={showExplosion ? 12 : 0}
                distance={startDistanceUnits * 2}
              />
            </>
          ) : (
            // Ground impact explosion
            <>
              {/* Main explosion sphere at surface */}
              <mesh ref={explosionRef} position={[0, 0, 0]}>
                <sphereGeometry args={[earthRadiusUnits, 32, 32]} />
                <meshBasicMaterial
                  color="#ff4400"
                  transparent
                  opacity={0.8}
                />
              </mesh>

              {/* Surface shockwave ring */}
              <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[earthRadiusUnits * 0.9, earthRadiusUnits * 1.5 + progress * 2, 32]} />
                <meshBasicMaterial
                  color="#ff8800"
                  transparent
                  opacity={Math.max(0, 0.6 - progress * 0.3)}
                  side={THREE.DoubleSide}
                />
              </mesh>

              {/* Debris/ejecta cone for large impacts */}
              {parseFloat(impactData?.diameterAvg || 0) > 100 && (
                <mesh position={[0, 0, 0]} rotation={[Math.PI / 4, 0, 0]}>
                  <coneGeometry args={[earthRadiusUnits * 0.5, earthRadiusUnits * 1.5, 32]} />
                  <meshBasicMaterial
                    color="#882200"
                    transparent
                    opacity={0.4}
                  />
                </mesh>
              )}

              {/* Ground impact flash */}
              <pointLight
                position={[0, 0, 0]}
                color="#ffaa00"
                intensity={showExplosion ? 10 : 0}
                distance={startDistanceUnits}
              />
            </>
          )}
        </>
      )}

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 5, 5]} intensity={1.5} />
      <pointLight position={[-10, -5, -5]} intensity={0.3} color="#4444ff" />
    </group>
  );
}
