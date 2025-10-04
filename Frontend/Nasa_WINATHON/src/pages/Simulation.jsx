import { useEffect, useState, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Text } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Info } from "lucide-react";
import * as THREE from "three";

function Sun({ isPlaying }) {
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

function Earth({ orbitRadius = 3, isPlaying, speed }) {
  const meshRef = useRef();
  const orbitRef = useRef();
  const [angle, setAngle] = useState(0);

  useFrame((state, delta) => {
    if (!isPlaying) return;

    // Real-time Earth orbit: 1 year = 365.25 days
    const earthSpeed = (2 * Math.PI) / (365.25 * 24 * 60 * 60); // radians per second
    const newAngle = angle + earthSpeed * delta * speed; // Use speed multiplier
    setAngle(newAngle);

    const x = orbitRadius * Math.cos(newAngle);
    const z = orbitRadius * Math.sin(newAngle);
    meshRef.current.position.set(x, 0, z);
    meshRef.current.rotation.y += 0.01;
  });

  return (
    <>
      {/* Earth orbit line */}
      <mesh ref={orbitRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[orbitRadius - 0.01, orbitRadius + 0.01, 128]} />
        <meshBasicMaterial color="#4DA6FF" opacity={0.3} transparent side={THREE.DoubleSide} />
      </mesh>

      {/* Earth */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial color="#4DA6FF" metalness={0.4} roughness={0.7} />
      </mesh>
    </>
  );
}

function Asteroid({ asteroidData, isPlaying, speed }) {
  const meshRef = useRef();
  const [positions, setPositions] = useState([]);
  const timeRef = useRef(0);

  useFrame((state, delta) => {
    if (!asteroidData || !isPlaying || !meshRef.current) return;

    const orbitalData = asteroidData.orbital_data;
    const a = parseFloat(orbitalData.semi_major_axis) * 3; // Scale to match Earth orbit (1 AU = 3 units)
    const e = parseFloat(orbitalData.eccentricity);
    const i = parseFloat(orbitalData.inclination) * Math.PI / 180;
    const omega = parseFloat(orbitalData.perihelion_argument) * Math.PI / 180;
    const Omega = parseFloat(orbitalData.ascending_node_longitude) * Math.PI / 180;
    const period = parseFloat(orbitalData.orbital_period); // days

    // Accumulate time
    timeRef.current += delta * speed;

    // Calculate mean anomaly (fraction of orbit completed)
    const meanMotion = (2 * Math.PI) / (period * 86400); // radians per second
    const M = (timeRef.current * meanMotion) % (2 * Math.PI);

    // Solve Kepler's equation for Eccentric Anomaly using Newton's method
    let E = M;
    for (let iter = 0; iter < 10; iter++) {
      E = M + e * Math.sin(E);
    }

    // Calculate true anomaly
    const nu = 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );

    // Calculate distance from Sun
    const r = a * (1 - e * Math.cos(E));

    // Position in orbital plane
    const xOrbit = r * Math.cos(nu);
    const yOrbit = r * Math.sin(nu);

    // Apply 3D rotations to get position in space
    // Rotation around z-axis by Omega (ascending node)
    const x1 = Math.cos(Omega) * xOrbit - Math.sin(Omega) * yOrbit;
    const y1 = Math.sin(Omega) * xOrbit + Math.cos(Omega) * yOrbit;
    const z1 = 0;

    // Rotation around x-axis by inclination
    const x2 = x1;
    const y2 = Math.cos(i) * y1 - Math.sin(i) * z1;
    const z2 = Math.sin(i) * y1 + Math.cos(i) * z1;

    // Rotation around z-axis by omega (argument of perihelion)
    const x = Math.cos(omega) * x2 - Math.sin(omega) * y2;
    const y = Math.sin(omega) * x2 + Math.cos(omega) * y2;
    const z = z2;

    // Update position (Three.js uses y-up, so swap y and z)
    meshRef.current.position.set(x, z, y);

    // Update trail
    setPositions(prev => {
      const newPos = [x, z, y];
      const updated = [newPos, ...prev].slice(0, 150);
      return updated;
    });
  });

  // Create orbit path
  const orbitPoints = [];
  if (asteroidData) {
    const orbitalData = asteroidData.orbital_data;
    const a = parseFloat(orbitalData.semi_major_axis) * 3;
    const e = parseFloat(orbitalData.eccentricity);
    const i = parseFloat(orbitalData.inclination) * Math.PI / 180;
    const omega = parseFloat(orbitalData.perihelion_argument) * Math.PI / 180;
    const Omega = parseFloat(orbitalData.ascending_node_longitude) * Math.PI / 180;

    for (let nu = 0; nu <= 2 * Math.PI; nu += 0.02) {
      // Calculate distance from Sun for this true anomaly
      const r = a * (1 - e * e) / (1 + e * Math.cos(nu));

      // Position in orbital plane
      const xOrbit = r * Math.cos(nu);
      const yOrbit = r * Math.sin(nu);

      // Apply 3D rotations to get position in space (same as asteroid position)
      // Rotation around z-axis by Omega (ascending node)
      const x1 = Math.cos(Omega) * xOrbit - Math.sin(Omega) * yOrbit;
      const y1 = Math.sin(Omega) * xOrbit + Math.cos(Omega) * yOrbit;
      const z1 = 0;

      // Rotation around x-axis by inclination
      const x2 = x1;
      const y2 = Math.cos(i) * y1 - Math.sin(i) * z1;
      const z2 = Math.sin(i) * y1 + Math.cos(i) * z1;

      // Rotation around z-axis by omega (argument of perihelion)
      const x = Math.cos(omega) * x2 - Math.sin(omega) * y2;
      const y = Math.sin(omega) * x2 + Math.cos(omega) * y2;
      const z = z2;

      orbitPoints.push(new THREE.Vector3(x, z, y));
    }
  }

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

function Scene({ asteroidData, isPlaying, speed }) {
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={0.1} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <Sun isPlaying={isPlaying} />
      <Earth orbitRadius={3} isPlaying={isPlaying} speed={speed} />
      {asteroidData && <Asteroid asteroidData={asteroidData} isPlaying={isPlaying} speed={speed} />}

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

const SECS_PER_HOUR = 3600;
const SECS_PER_DAY = SECS_PER_HOUR * 24;
const SECS_PER_WEEK = SECS_PER_DAY * 7;
const SECS_PER_MONTH = SECS_PER_DAY * 30.4167;
const SECS_PER_YEAR = SECS_PER_DAY * 365.25;

export default function Simulation() {
  const [asteroidData, setAsteroidData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [speed, setSpeed] = useState(1);
  const startTimeRef = useRef(new Date());
  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    fetch('/asteroid.json')
      .then(res => res.json())
      .then(data => setAsteroidData(data))
      .catch(err => console.error('Failed to load asteroid data:', err));
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const deltaMs = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      // Advance the simulated time by delta * speed
      setCurrentDate(prevDate => {
        const newDate = new Date(prevDate);
        newDate.setTime(newDate.getTime() + (deltaMs * speed));
        return newDate;
      });
    }, 1000 / 30); // Update 30 times per second for smoother updates

    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  const handlePlayPause = () => {
    if (!isPlaying) {
      // When resuming, update the last update time to avoid time jump
      lastUpdateRef.current = Date.now();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentDate(new Date());
    startTimeRef.current = new Date();
    lastUpdateRef.current = Date.now();
    setIsPlaying(true);
    setSpeed(1);
  };

  const handleSpeedChange = (value) => {
    setSpeed(parseFloat(value));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Asteroid {asteroidData?.name || '...'}</h1>
      <div className="mb-4 space-y-3">
        <div className="flex gap-2 items-center">
          <Button onClick={handlePlayPause} variant="outline" size="sm">
            {isPlaying ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Play
              </>
            )}
          </Button>
          <Button onClick={handleReset} variant="outline" size="sm">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <div className="ml-auto text-sm text-muted-foreground">
            {currentDate.toString()}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">
              Time step <span className="text-sm text-muted-foreground">(per second)</span>:
          </label>
          <Select value={speed.toString()} onValueChange={handleSpeedChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time step" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 second</SelectItem>
              <SelectItem value={SECS_PER_HOUR.toString()}>1 hour</SelectItem>
              <SelectItem value={SECS_PER_DAY.toString()}>1 day</SelectItem>
              <SelectItem value={SECS_PER_WEEK.toString()}>1 week</SelectItem>
              <SelectItem value={SECS_PER_MONTH.toString()}>1 month</SelectItem>
              <SelectItem value={(SECS_PER_MONTH * 3).toString()}>3 months</SelectItem>
              <SelectItem value={(SECS_PER_MONTH * 6).toString()}>6 months</SelectItem>
              <SelectItem value={SECS_PER_YEAR.toString()}>1 year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-black" style={{ height: '600px' }}>
        <Canvas camera={{ position: [8, 8, 8], fov: 50 }}>
          <Suspense fallback={null}>
            <Scene asteroidData={asteroidData} isPlaying={isPlaying} speed={speed} />
          </Suspense>
        </Canvas>
      </div>

      <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
        <p><strong>Controls:</strong> Left-click and drag to rotate | Right-click to pan | Scroll to zoom</p>
        <p className="mt-1">🟡 Yellow = Sun | 🔵 Blue = Earth | ⚪ Gray = Asteroid {asteroidData?.name}</p>
      </div>

      {asteroidData && (
        <div className="mt-6 p-4 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Asteroid Information</h2>
          <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold">{asteroidData.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Designation</p>
                <p className="font-semibold">{asteroidData.designation}</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-sm text-muted-foreground">Estimated Diameter</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-2xs">The estimated size range of the asteroid based on its brightness and assumed reflectivity.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="font-semibold">
                  {asteroidData.estimated_diameter.meters.estimated_diameter_min.toFixed(1)} - {asteroidData.estimated_diameter.meters.estimated_diameter_max.toFixed(1)} m
                </p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-sm text-muted-foreground">Absolute Magnitude</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-2xs">A measure of the asteroid's intrinsic brightness. Lower values indicate brighter (and typically larger) objects.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="font-semibold">{asteroidData.absolute_magnitude_h}</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-sm text-muted-foreground">Potentially Hazardous</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-2xs">An asteroid is classified as potentially hazardous if it's larger than ~140m and comes within 0.05 AU of Earth's orbit.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="font-semibold">
                  {asteroidData.is_potentially_hazardous_asteroid ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-sm text-muted-foreground">Orbit Class</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-2xs">{asteroidData.orbital_data.orbit_class.orbit_class_description}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="font-semibold">{asteroidData.orbital_data.orbit_class.orbit_class_type}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-sm text-muted-foreground">Semi-major Axis</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-2xs">Half of the longest diameter of the elliptical orbit. Measured in Astronomical Units (AU), where 1 AU = distance from Earth to Sun (~150 million km).</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="font-semibold">{asteroidData.orbital_data.semi_major_axis} AU</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-sm text-muted-foreground">Eccentricity</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-2xs">How elliptical the orbit is. 0 = perfect circle, values closer to 1 = more elongated orbit.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="font-semibold">{parseFloat(asteroidData.orbital_data.eccentricity).toFixed(4)}</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-sm text-muted-foreground">Inclination</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-2xs">The tilt of the asteroid's orbital plane relative to Earth's orbital plane. 0° = same plane as Earth.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="font-semibold">{parseFloat(asteroidData.orbital_data.inclination).toFixed(2)}°</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-sm text-muted-foreground">Orbital Period</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-2xs">The time it takes for the asteroid to complete one full orbit around the Sun.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="font-semibold">{parseFloat(asteroidData.orbital_data.orbital_period).toFixed(1)} days</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-sm text-muted-foreground">Perihelion Distance</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-2xs">The closest distance the asteroid gets to the Sun during its orbit.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="font-semibold">{asteroidData.orbital_data.perihelion_distance} AU</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <p className="text-sm text-muted-foreground">Aphelion Distance</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-2xs">The farthest distance the asteroid gets from the Sun during its orbit.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="font-semibold">{asteroidData.orbital_data.aphelion_distance} AU</p>
              </div>
            </div>
          </TooltipProvider>

          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-3">Upcoming Close Approaches</h3>
            <div className="space-y-2">
              {asteroidData.close_approach_data
                .filter(approach => {
                  const approachDate = new Date(approach.close_approach_date_full);
                  return approachDate >= new Date();
                })
                .slice(0, 5)
                .map((approach, idx) => {
                  const approachDate = new Date(approach.close_approach_date_full);

                  return (
                    <div key={idx} className="p-3 rounded bg-muted">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{approach.close_approach_date_full}</p>
                          <p className="text-sm">Miss Distance: {parseFloat(approach.miss_distance.kilometers).toLocaleString()} km</p>
                          <p className="text-sm">Relative Velocity: {parseFloat(approach.relative_velocity.kilometers_per_hour).toLocaleString()} km/h</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Orbiting Body</p>
                          <p className="font-semibold">{approach.orbiting_body}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              {asteroidData.close_approach_data.filter(approach => {
                const approachDate = new Date(approach.close_approach_date_full);
                return approachDate >= new Date();
              }).length === 0 && (
                <div className="p-3 rounded bg-muted/50 text-center text-muted-foreground">
                  No upcoming close approaches found
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
