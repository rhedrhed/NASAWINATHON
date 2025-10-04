import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Pause, RotateCcw } from "lucide-react";
import * as THREE from "three";

// Import utility functions from Simulation.jsx
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

function Earth({ earthOrbitData, isPlaying, currentDate }) {
  const meshRef = useRef();
  const AU_TO_UNITS = 3 / 149597870.7; // Convert km to scene units (1 AU = 3 units)

  useFrame(() => {
    if (!isPlaying || !earthOrbitData || earthOrbitData.length === 0 || !meshRef.current) return;

    const pos = interpolatePosition(earthOrbitData, currentDate.getTime());
    if (pos) {
      // Convert from km to scene units and adjust coordinate system
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

function Asteroid({ asteroidOrbitData, isPlaying, currentDate }) {
  const meshRef = useRef();
  const [positions, setPositions] = useState([]);
  const AU_TO_UNITS = 3 / 149597870.7; // Convert km to scene units (1 AU = 3 units)

  useFrame(() => {
    if (!asteroidOrbitData || asteroidOrbitData.length === 0 || !isPlaying || !meshRef.current) return;

    const pos = interpolatePosition(asteroidOrbitData, currentDate.getTime());
    if (pos) {
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

function Scene({ asteroidOrbitData, earthOrbitData, isPlaying, currentDate }) {
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

export default function OrbitVisualization() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [asteroidOrbitData, setAsteroidOrbitData] = useState([]);
  const [earthOrbitData, setEarthOrbitData] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dataStartTime, setDataStartTime] = useState(null);
  const [dataEndTime, setDataEndTime] = useState(null);
  const lastUpdateRef = useRef(Date.now());

  // Get target date from URL params
  const targetDateParam = searchParams.get('date');

  useEffect(() => {
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
          
          // Set initial date from URL param or default to start
          if (targetDateParam) {
            const targetDate = new Date(targetDateParam);
            if (targetDate >= startTime && targetDate <= endTime) {
              setCurrentDate(targetDate);
            } else {
              setCurrentDate(startTime);
            }
          } else {
            setCurrentDate(startTime);
          }
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
  }, [targetDateParam]);

  useEffect(() => {
    if (!isPlaying || !dataEndTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const deltaMs = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      // Advance the simulated time
      setCurrentDate(prevDate => {
        const newDate = new Date(prevDate);
        const newTime = newDate.getTime() + deltaMs;
        
        // Check if we've reached the end of the data
        if (newTime >= dataEndTime.getTime()) {
          setIsPlaying(false);
          return new Date(dataEndTime);
        }
        
        newDate.setTime(newTime);
        return newDate;
      });
    }, 1000 / 30);

    return () => clearInterval(interval);
  }, [isPlaying, dataEndTime]);

  const handlePlayPause = () => {
    if (!isPlaying) {
      lastUpdateRef.current = Date.now();
      
      // If we're at the end, restart from beginning
      if (dataEndTime && currentDate.getTime() >= dataEndTime.getTime()) {
        setCurrentDate(dataStartTime || new Date());
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    const resetTime = targetDateParam ? new Date(targetDateParam) : (dataStartTime || new Date());
    setCurrentDate(resetTime);
    lastUpdateRef.current = Date.now();
    setIsPlaying(false);
  };

  const handleBack = () => {
    navigate('/simulation');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4 flex items-center gap-4">
          <Button onClick={handleBack} variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Simulation
          </Button>
          
          <div className="flex gap-2">
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
          </div>

          <div className="ml-auto text-sm text-muted-foreground">
            <div className="font-semibold">{currentDate.toLocaleString()}</div>
            {dataStartTime && dataEndTime && (
              <div className="text-xs">
                Range: {dataStartTime.toLocaleDateString()} - {dataEndTime.toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {dataStartTime && dataEndTime && (
          <div className="mb-4 w-full bg-muted rounded-full h-2 overflow-hidden">
            <div 
              className="bg-primary h-full"
              style={{
                width: `${Math.min(100, Math.max(0, 
                  ((currentDate.getTime() - dataStartTime.getTime()) / 
                  (dataEndTime.getTime() - dataStartTime.getTime())) * 100
                ))}%`
              }}
            />
          </div>
        )}

        <div className="border rounded-lg overflow-hidden bg-black" style={{ height: 'calc(100vh - 200px)' }}>
          <Canvas camera={{ position: [8, 8, 8], fov: 50 }}>
            <Suspense fallback={null}>
              <Scene 
                asteroidOrbitData={asteroidOrbitData}
                earthOrbitData={earthOrbitData}
                isPlaying={isPlaying}
                currentDate={currentDate}
              />
            </Suspense>
          </Canvas>
        </div>

        <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
          <p><strong>Controls:</strong> Left-click and drag to rotate | Right-click to pan | Scroll to zoom</p>
          <p className="mt-1">🟡 Yellow = Sun | 🔵 Blue = Earth | ⚪ Gray = Asteroid</p>
        </div>
      </div>
    </div>
  );
}
