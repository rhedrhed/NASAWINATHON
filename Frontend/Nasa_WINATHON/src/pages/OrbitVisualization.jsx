import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Pause, RotateCcw, AlertTriangle, Zap, Mountain, Gauge, Circle } from "lucide-react";
import { OrbitScene, ImpactVisualization } from "@/components/orbit";
import { parseHorizonsData, jdToDate } from "@/lib/horizonsUtils";
import { OrbitControls } from "../components/orbit/Controls";
import { OrbitControls as DreiOrbitControls } from "@react-three/drei";

export default function OrbitVisualization() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { asteroidId } = useParams();
  const [asteroidData, setAsteroidData] = useState(null);
  const [asteroidOrbitData, setAsteroidOrbitData] = useState([]);
  const [earthOrbitData, setEarthOrbitData] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dataStartTime, setDataStartTime] = useState(null);
  const [dataEndTime, setDataEndTime] = useState(null);
  const lastUpdateRef = useRef(Date.now());
  const [impactAnimationPlaying, setImpactAnimationPlaying] = useState(false);

  // Get target date from URL params
  const targetDateParam = searchParams.get('date');

  useEffect(() => {
    // Load asteroid metadata
    fetch('/asteroid.json')
      .then(res => res.json())
      .then(data => {
        console.log('Loaded asteroid data:', data.name, 'with', data.close_approach_data?.length, 'close approaches');
        setAsteroidData(data);
      })
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
    navigate(`/simulation/${asteroidId}`);
  };

  // Calculate impact consequences based on asteroid properties
  const calculateImpactConsequences = () => {
    if (!asteroidData) {
      console.log('No asteroid data loaded yet');
      return null;
    }

    const targetApproach = searchParams.get('date');
    let approachData = null;

    if (targetApproach) {
      console.log('Looking for approach with date:', targetApproach);
      approachData = asteroidData.close_approach_data?.find(
        approach => approach.close_approach_date_full === targetApproach
      );
      if (!approachData) {
        console.log('No exact match found, trying fuzzy match');
        // Try to find by date portion only
        approachData = asteroidData.close_approach_data?.find(
          approach => approach.close_approach_date_full.startsWith(targetApproach.split(' ')[0])
        );
      }
    }
    
    if (!approachData) {
      // Use the next close approach
      const now = new Date();
      console.log('Using next close approach after:', now);
      approachData = asteroidData.close_approach_data?.find(approach => {
        const approachDate = new Date(approach.close_approach_date_full);
        return approachDate >= now;
      });
    }

    // If still no approach data, use the first available one
    if (!approachData && asteroidData.close_approach_data?.length > 0) {
      console.log('No future approach found, using first available approach');
      approachData = asteroidData.close_approach_data[0];
    }

    if (!approachData) {
      console.log('No approach data available at all');
      return null;
    }

    console.log('Using approach data:', approachData.close_approach_date_full);

    // Get asteroid properties
    const diameterMin = asteroidData.estimated_diameter.meters.estimated_diameter_min;
    const diameterMax = asteroidData.estimated_diameter.meters.estimated_diameter_max;
    const diameterAvg = (diameterMin + diameterMax) / 2;

    // Velocity in km/s
    const velocity = parseFloat(approachData.relative_velocity.kilometers_per_second);

    // Assume density of rocky asteroid (2600 kg/m³)
    const density = 2600;

    // Calculate mass (in kg)
    const radius = diameterAvg / 2;
    const volume = (4/3) * Math.PI * Math.pow(radius, 3);
    const mass = volume * density;

    // Calculate kinetic energy (in Joules): KE = 0.5 * m * v²
    // velocity needs to be in m/s
    const velocityMS = velocity * 1000;
    const kineticEnergy = 0.5 * mass * Math.pow(velocityMS, 2);

    // Convert to megatons of TNT (1 megaton = 4.184 × 10^15 J)
    const megatons = kineticEnergy / (4.184 * Math.pow(10, 15));

    // Estimate crater diameter (in meters) using Schmidt-Holsapple scaling
    // D = 1.8 * (E^0.29) where E is in megatons
    const craterDiameter = 1.8 * Math.pow(megatons, 0.29) * 1000;

    // Categorize impact severity
    let severity = "Minor";
    let description = "Local damage, similar to a small earthquake";
    let color = "text-yellow-500";

    if (megatons < 0.001) {
      severity = "Negligible";
      description = "Likely burns up in atmosphere completely";
      color = "text-green-500";
    } else if (megatons < 1) {
      severity = "Minor";
      description = "Local damage, airburst effects possible";
      color = "text-yellow-500";
    } else if (megatons < 100) {
      severity = "Moderate";
      description = "Regional destruction, city-level damage";
      color = "text-orange-500";
    } else if (megatons < 1000) {
      severity = "Major";
      description = "Country-scale devastation, climate effects";
      color = "text-red-500";
    } else {
      severity = "Catastrophic";
      description = "Mass extinction event, global climate change";
      color = "text-red-700";
    }

    return {
      diameterAvg: diameterAvg.toFixed(1),
      velocity: velocity.toFixed(2),
      mass: (mass / 1e9).toFixed(2), // Convert to million kg
      kineticEnergy: megatons.toFixed(6),
      craterDiameter: craterDiameter.toFixed(0),
      severity,
      description,
      color,
      approachDate: approachData.close_approach_date_full,
      missDistance: parseFloat(approachData.miss_distance.kilometers).toLocaleString()
    };
  };

  const impactData = calculateImpactConsequences();

    console.log("impact data");
    console.log(impactData);

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
              <OrbitScene
                asteroidOrbitData={asteroidOrbitData}
                earthOrbitData={earthOrbitData}
                isPlaying={isPlaying}
                currentDate={currentDate}
              />
            </Suspense>
          </Canvas>
        </div>

        {!asteroidData && (
          <div className="mt-6 border rounded-lg p-6 bg-card text-center">
            <p className="text-muted-foreground">Loading asteroid data...</p>
          </div>
        )}

        {asteroidData && !impactData && (
          <div className="mt-6 border rounded-lg p-6 bg-card text-center">
            <p className="text-muted-foreground">No close approach data available for impact analysis.</p>
          </div>
        )}

        {impactData && (
          <div className="mt-6 border-2 rounded-xl overflow-hidden bg-gradient-to-br from-card to-muted/20">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-b-2 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 rounded-full bg-orange-500/20">
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Hypothetical Impact Scenario</h3>
                  <p className="text-sm text-muted-foreground">Educational simulation only</p>
                </div>
              </div>

              <div className="bg-card/80 backdrop-blur rounded-lg p-4 border">
                <p className="text-sm leading-relaxed">
                  This analysis shows what <span className="font-semibold text-orange-500">would happen</span> if the asteroid were to impact Earth during its close approach on{" "}
                  <span className="font-semibold text-primary">{impactData.approachDate}</span>.
                  <br />
                  <span className="text-green-500 font-semibold">✓ In reality</span>, this asteroid will safely pass at a distance of{" "}
                  <span className="font-semibold text-green-500">{impactData.missDistance} km</span>.
                </p>
              </div>
            </div>

            {/* Main Content */}
            <div className="p-6">
              {/* Severity Indicator - Large and Prominent */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold">Impact Severity Assessment</h4>
                  <div className="flex gap-1">
                    {['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'].map((level, idx) => {
                      const isActive = impactData.severity === level;
                      const colors = ['bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500', 'bg-red-700'];
                      return (
                        <div
                          key={level}
                          className={`h-2 w-8 rounded-full transition-all ${isActive ? colors[idx] + ' scale-110' : 'bg-muted'}`}
                          title={level}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className={`p-6 rounded-xl border-2 ${impactData.color.replace('text-', 'border-')} bg-gradient-to-br from-card to-muted/30`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Threat Level</p>
                      <p className={`text-4xl font-bold ${impactData.color}`}>{impactData.severity}</p>
                      <p className="text-lg text-muted-foreground mt-2">{impactData.description}</p>
                    </div>
                    <div className="relative">
                      <Circle className={`h-32 w-32 ${impactData.color} opacity-20`} />
                      <Circle className={`h-32 w-32 absolute inset-0 ${impactData.color}`} style={{ strokeDasharray: '100', strokeDashoffset: '0' }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <AlertTriangle className={`h-16 w-16 ${impactData.color}`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3">Impact Parameters</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-2 border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Circle className="h-4 w-4 text-blue-500" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Diameter</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-500">{impactData.diameterAvg}</p>
                    <p className="text-xs text-muted-foreground">meters</p>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-2 border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Gauge className="h-4 w-4 text-purple-500" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Velocity</p>
                    </div>
                    <p className="text-2xl font-bold text-purple-500">{impactData.velocity}</p>
                    <p className="text-xs text-muted-foreground">km/s</p>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border-2 border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Mountain className="h-4 w-4 text-green-500" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Mass</p>
                    </div>
                    <p className="text-2xl font-bold text-green-500">{impactData.mass}</p>
                    <p className="text-xs text-muted-foreground">million kg</p>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-2 border-orange-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-orange-500" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Energy</p>
                    </div>
                    <p className="text-2xl font-bold text-orange-500">{impactData.kineticEnergy}</p>
                    <p className="text-xs text-muted-foreground">megatons TNT</p>
                  </div>
                </div>
              </div>

              {/* Detailed Effects */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Crater Information */}
                <div className="p-5 rounded-lg border-2 bg-card/50">
                  <div className="flex items-center gap-2 mb-4">
                    <Mountain className="h-5 w-5 text-primary" />
                    <h4 className="text-lg font-semibold">Impact Crater</h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Estimated Diameter</p>
                      <div className="flex items-end gap-2">
                        <p className="text-3xl font-bold">{impactData.craterDiameter}</p>
                        <p className="text-lg text-muted-foreground mb-1">meters</p>
                      </div>
                      <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                          style={{ width: `${Math.min(100, (parseFloat(impactData.craterDiameter) / 10000) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {parseFloat(impactData.craterDiameter) > 1000
                          ? `~${(parseFloat(impactData.craterDiameter) / 1000).toFixed(1)} km wide`
                          : 'Relatively small crater'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Energy Comparison */}
                <div className="p-5 rounded-lg border-2 bg-card/50">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="h-5 w-5 text-primary" />
                    <h4 className="text-lg font-semibold">Energy Comparison</h4>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm text-muted-foreground">This Impact</span>
                        <span className="font-bold text-orange-500">{impactData.kineticEnergy} MT</span>
                      </div>
                      <div className="h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded" />
                    </div>

                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm text-muted-foreground">Tunguska Event (1908)</span>
                        <span className="font-semibold">3-5 MT</span>
                      </div>
                      <div className="h-4 bg-yellow-500/50 rounded" style={{ width: '20%' }} />
                    </div>

                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm text-muted-foreground">Hiroshima Bomb</span>
                        <span className="font-semibold">0.015 MT</span>
                      </div>
                      <div className="h-4 bg-green-500/50 rounded" style={{ width: '5%' }} />
                    </div>

                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                      Energy bars scaled for comparison. Actual energy: {impactData.kineticEnergy} megatons of TNT equivalent.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3D Impact Visualization */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-lg font-semibold">3D Impact Simulation</h4>
                    <p className="text-xs text-muted-foreground">
                      Accurate scale and velocity based on asteroid data
                    </p>
                  </div>
                  <Button
                    onClick={() => setImpactAnimationPlaying(!impactAnimationPlaying)}
                    variant="outline"
                    size="sm"
                  >
                    {impactAnimationPlaying ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause Animation
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Play Animation
                      </>
                    )}
                  </Button>
                </div>

                {/* Scale information */}
                <div className="mb-3 p-3 bg-muted/50 rounded-lg border grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Asteroid Size:</span>
                    <span className="ml-2 font-semibold">{impactData.diameterAvg}m</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Impact Speed:</span>
                    <span className="ml-2 font-semibold">{impactData.velocity} km/s</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Scale Ratio:</span>
                    <span className="ml-2 font-semibold">1:{Math.round(6371 / (parseFloat(impactData.diameterAvg) / 1000)).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="border-2 rounded-lg overflow-hidden bg-black" style={{ height: '500px' }}>
                  <Canvas camera={{ position: [-1.5, 0.8, 0.5], fov: 60 }}>
                    <Suspense fallback={null}>
                      <ImpactVisualization 
                        impactData={impactData} 
                        isPlaying={impactAnimationPlaying}
                      />
                      <DreiOrbitControls 
                        enableZoom={true}
                        enablePan={true}
                        enableRotate={true}
                        minDistance={0.5}
                        maxDistance={15}
                        target={[0, 0, 0]}
                      />
                    </Suspense>
                  </Canvas>
                </div>
                
                <p className="text-xs text-muted-foreground mt-2">
                  This 3D animation uses <span className="font-semibold">accurate size ratios</span> (asteroid to Earth) and <span className="font-semibold">real impact velocity</span> from the approach data. 
                  The animation is time-compressed 3× and starts from 10,000 km away for optimal visibility. Use your mouse to rotate, zoom, and pan the view.
                  {parseFloat(impactData.diameterAvg) < 100 && " Note: Small asteroids are slightly enhanced for visibility."}
                </p>
              </div>

              {/* Disclaimer */}
              <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold">⚠️ Disclaimer:</span> These calculations are simplified estimates based on asteroid size, velocity, and assumed composition.
                  Actual impact effects would vary significantly depending on many factors including material composition,
                  entry angle, atmospheric conditions, and impact location (land vs. ocean). This is for educational purposes only.
                </p>
              </div>
            </div>
          </div>
        )}

        <OrbitControls asteroidName={null} />
      </div>
    </div>
  );
}
