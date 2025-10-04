import { useEffect, useState, useRef, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Text } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Info } from "lucide-react";
import * as THREE from "three";

// Parse NASA Horizons ephemeris data
function parseHorizonsData(text) {
  const lines = text.split('\n');
  const dataPoints = [];
  let inDataSection = false;

  for (const line of lines) {
    if (line.includes('$$SOE')) {
      inDataSection = true;
      continue;
    }
    if (line.includes('$$EOE')) {
      break;
    }
    if (inDataSection && line.trim()) {
      // Parse the data line
      // Format: JDTDB, Date, X, Y, Z, VX, VY, VZ, X_s, Y_s, Z_s, VX_s, VY_s, VZ_s
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 8) {
        const jdtdb = parseFloat(parts[0]);
        const date = parts[1];
        // parseFloat properly handles scientific notation like 1.465102866451570E+08
        const x = parseFloat(parts[2]);
        const y = parseFloat(parts[3]);
        const z = parseFloat(parts[4]);
        const vx = parseFloat(parts[5]);
        const vy = parseFloat(parts[6]);
        const vz = parseFloat(parts[7]);

        // Verify all values are valid numbers
        if (!isNaN(jdtdb) && !isNaN(x) && !isNaN(y) && !isNaN(z) &&
            !isNaN(vx) && !isNaN(vy) && !isNaN(vz)) {
          dataPoints.push({ jdtdb, date, x, y, z, vx, vy, vz });
        }
      }
    }
  }

  return dataPoints;
}

// Convert Julian Date to JavaScript Date
function jdToDate(jd) {
  return new Date((jd - 2440587.5) * 86400000);
}

// Interpolate position between two data points
function interpolatePosition(data, currentTime) {
  if (data.length === 0) return null;

  // Handle edge cases - clamp to data range
  if (currentTime < jdToDate(data[0].jdtdb).getTime()) {
    // Before first point - return first point
    const p = data[0];
    return { x: p.x, y: p.y, z: p.z };
  } else if (currentTime > jdToDate(data[data.length - 1].jdtdb).getTime()) {
    // After last point - return last point
    const p = data[data.length - 1];
    return { x: p.x, y: p.y, z: p.z };
  }

  // Find the two data points to interpolate between
  let beforeIdx = 0;
  let afterIdx = data.length - 1;

  for (let i = 0; i < data.length - 1; i++) {
    const pointTime = jdToDate(data[i].jdtdb).getTime();
    const nextPointTime = jdToDate(data[i + 1].jdtdb).getTime();

    if (currentTime >= pointTime && currentTime <= nextPointTime) {
      beforeIdx = i;
      afterIdx = i + 1;
      break;
    }
  }

  const p1 = data[beforeIdx];
  const p2 = data[afterIdx];
  const t1 = jdToDate(p1.jdtdb).getTime();
  const t2 = jdToDate(p2.jdtdb).getTime();
  const t = (currentTime - t1) / (t2 - t1);

  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
    z: p1.z + (p2.z - p1.z) * t
  };
}

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

function Earth({ earthOrbitData, isPlaying, speed, currentDate }) {
  const meshRef = useRef();
  const orbitRef = useRef();
  const AU_TO_UNITS = 3 / 149597870.7; // Convert km to scene units (1 AU = 3 units)

  useFrame(() => {
    if (!isPlaying || !earthOrbitData || earthOrbitData.length === 0 || !meshRef.current) return;

    const pos = interpolatePosition(earthOrbitData, currentDate.getTime());
    if (pos) {
      // Convert from km to scene units and adjust coordinate system
      // Horizons uses ecliptic coordinates (X, Y, Z)
      // Three.js uses Y-up, so we map: X->X, Y->Z, Z->Y
      const x = pos.x * AU_TO_UNITS;
      const y = pos.z * AU_TO_UNITS;
      const z = pos.y * AU_TO_UNITS;

      meshRef.current.position.set(x, y, z);
      meshRef.current.rotation.y += 0.01;
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

function Asteroid({ asteroidData, asteroidOrbitData, isPlaying, speed, currentDate }) {
  const meshRef = useRef();
  const [positions, setPositions] = useState([]);
  const AU_TO_UNITS = 3 / 149597870.7; // Convert km to scene units (1 AU = 3 units)

  useFrame(() => {
    if (!asteroidOrbitData || asteroidOrbitData.length === 0 || !isPlaying || !meshRef.current) return;

    const pos = interpolatePosition(asteroidOrbitData, currentDate.getTime());
    if (pos) {
      // Convert from km to scene units and adjust coordinate system
      // Horizons uses ecliptic coordinates (X, Y, Z)
      // Three.js uses Y-up, so we map: X->X, Y->Z, Z->Y
      const x = pos.x * AU_TO_UNITS;
      const y = pos.z * AU_TO_UNITS;
      const z = pos.y * AU_TO_UNITS;

      meshRef.current.position.set(x, y, z);

      // Update trail
      setPositions(prev => {
        const newPos = [x, y, z];
        const updated = [newPos, ...prev].slice(0, 150);
        return updated;
      });
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

function Scene({ asteroidData, asteroidOrbitData, earthOrbitData, isPlaying, speed, currentDate }) {
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={0.1} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <Sun isPlaying={isPlaying} />
      {earthOrbitData && earthOrbitData.length > 0 && (
        <Earth earthOrbitData={earthOrbitData} isPlaying={isPlaying} speed={speed} currentDate={currentDate} />
      )}
      {asteroidData && asteroidOrbitData && asteroidOrbitData.length > 0 && (
        <Asteroid
          asteroidData={asteroidData}
          asteroidOrbitData={asteroidOrbitData}
          isPlaying={isPlaying}
          speed={speed}
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

const SECS_PER_HOUR = 3600;
const SECS_PER_DAY = SECS_PER_HOUR * 24;
const SECS_PER_WEEK = SECS_PER_DAY * 7;
const SECS_PER_MONTH = SECS_PER_DAY * 30.4167;
const SECS_PER_YEAR = SECS_PER_DAY * 365.25;

export default function Simulation() {
  const navigate = useNavigate();
  const [asteroidData, setAsteroidData] = useState(null);
  const [asteroidOrbitData, setAsteroidOrbitData] = useState([]);
  const [earthOrbitData, setEarthOrbitData] = useState([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [speed, setSpeed] = useState(1);
  const [dataStartTime, setDataStartTime] = useState(null);
  const [dataEndTime, setDataEndTime] = useState(null);
  const startTimeRef = useRef(new Date());
  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    // Load asteroid metadata
    fetch('/asteroid.json')
      .then(res => res.json())
      .then(data => setAsteroidData(data))
      .catch(err => console.error('Failed to load asteroid data:', err));

    // Load Earth orbit data from Horizons
    fetch('/earth-orbit.txt')
      .then(res => res.text())
      .then(text => {
        const parsed = parseHorizonsData(text);
        console.log('Loaded Earth orbit data:', parsed.length, 'points');
        if (parsed.length > 0) {
          const startTime = jdToDate(parsed[0].jdtdb);
          const endTime = jdToDate(parsed[parsed.length - 1].jdtdb);
          setEarthOrbitData(parsed);
          setDataStartTime(startTime);
          setDataEndTime(endTime);
          setCurrentDate(startTime); // Start from the first data point
          startTimeRef.current = startTime;
        }
      })
      .catch(err => console.error('Failed to load Earth orbit data:', err));

    // Load asteroid orbit data from Horizons
    fetch('/asteroid-orbit.txt')
      .then(res => res.text())
      .then(text => {
        const parsed = parseHorizonsData(text);
        console.log('Loaded asteroid orbit data:', parsed.length, 'points');
        setAsteroidOrbitData(parsed);
      })
      .catch(err => console.error('Failed to load asteroid orbit data:', err));
  }, []);

  useEffect(() => {
    if (!isPlaying || !dataEndTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const deltaMs = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      // Advance the simulated time by delta * speed
      setCurrentDate(prevDate => {
        const newDate = new Date(prevDate);
        const newTime = newDate.getTime() + (deltaMs * speed);

        // Check if we've reached the end of the data
        if (newTime >= dataEndTime.getTime()) {
          setIsPlaying(false); // Stop playback
          return new Date(dataEndTime); // Clamp to end time
        }

        newDate.setTime(newTime);
        return newDate;
      });
    }, 1000 / 30); // Update 30 times per second for smoother updates

    return () => clearInterval(interval);
  }, [isPlaying, speed, dataEndTime]);

  const handlePlayPause = () => {
    if (!isPlaying) {
      // When resuming, update the last update time to avoid time jump
      lastUpdateRef.current = Date.now();

      // If we're at the end, restart from beginning
      if (dataEndTime && currentDate.getTime() >= dataEndTime.getTime()) {
        setCurrentDate(dataStartTime || new Date());
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    const resetTime = dataStartTime || new Date();
    setCurrentDate(resetTime);
    startTimeRef.current = resetTime;
    lastUpdateRef.current = Date.now();
    setIsPlaying(true);
    setSpeed(1);
  };

  const handleSpeedChange = (value) => {
    setSpeed(parseFloat(value));
  };

  const handleJumpToDate = (targetDate) => {
    // Check if the target date is within the data range
    if (dataStartTime && dataEndTime) {
      const targetTime = new Date(targetDate).getTime();
      
      if (targetTime < dataStartTime.getTime() || targetTime > dataEndTime.getTime()) {
        console.warn('Target date is outside the available data range');
        return;
      }
      
      // Navigate to the standalone visualization page with the date as a URL parameter
      navigate(`/orbit-view?date=${targetDate.toISOString()}`);
    }
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
            <div>{currentDate.toLocaleString()}</div>
            {dataStartTime && dataEndTime && (
              <div className="text-xs">
                Data range: {dataStartTime.toLocaleDateString()} - {dataEndTime.toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {dataStartTime && dataEndTime && (
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full"
              style={{
                width: `${Math.min(100, Math.max(0.1,
                  ((currentDate.getTime() - dataStartTime.getTime()) /
                  (dataEndTime.getTime() - dataStartTime.getTime())) * 100
                ))}%`
              }}
            />
          </div>
        )}

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
            <Scene
              asteroidData={asteroidData}
              asteroidOrbitData={asteroidOrbitData}
              earthOrbitData={earthOrbitData}
              isPlaying={isPlaying}
              speed={speed}
              currentDate={currentDate}
            />
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
                  const isInDataRange = dataStartTime && dataEndTime && 
                    approachDate >= dataStartTime && approachDate <= dataEndTime;

                  return (
                    <div 
                      key={idx} 
                      className={`p-3 rounded ${isInDataRange ? 'bg-muted hover:bg-muted/80 cursor-pointer transition-colors' : 'bg-muted/50'}`}
                      onClick={() => isInDataRange && handleJumpToDate(approachDate)}
                      title={isInDataRange ? 'Click to jump to this date' : 'Date outside available data range'}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">
                            {approach.close_approach_date_full}
                            {isInDataRange && <span className="ml-2 text-xs text-primary">📍 View in simulation</span>}
                          </p>
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
