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
  
  // User-adjustable impact parameters
  const [customParameters, setCustomParameters] = useState({
    useCustom: false,
    diameter: null, // meters
    velocity: null, // km/s
    density: 2600 // kg/m³
  });

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
      
      // Convert ISO date to Date object for comparison
      const targetDateObj = new Date(targetApproach);
      
      // Find closest matching approach by date
      approachData = asteroidData.close_approach_data?.find(approach => {
        const approachDateObj = new Date(approach.close_approach_date_full);
        // Match within same day (ignore exact time)
        return approachDateObj.toDateString() === targetDateObj.toDateString();
      });
      
      if (!approachData) {
        console.log('No exact date match, trying fuzzy match by year-month-day');
        // Try partial match
        const targetDateStr = targetDateObj.toISOString().split('T')[0]; // YYYY-MM-DD
        approachData = asteroidData.close_approach_data?.find(approach => {
          const approachDateStr = new Date(approach.close_approach_date_full).toISOString().split('T')[0];
          return approachDateStr === targetDateStr;
        });
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
    console.log('Velocity for this approach:', approachData.relative_velocity.kilometers_per_second, 'km/s');
    console.log('Miss distance:', approachData.miss_distance.kilometers, 'km');

    // Get asteroid properties (use custom if enabled, otherwise from data)
    let diameterAvg, velocity, density;
    
    if (customParameters.useCustom) {
      diameterAvg = customParameters.diameter || 50;
      velocity = customParameters.velocity || 20;
      density = customParameters.density || 2600;
      console.log('Using custom parameters:', { diameterAvg, velocity, density });
    } else {
      const diameterMin = asteroidData.estimated_diameter.meters.estimated_diameter_min;
      const diameterMax = asteroidData.estimated_diameter.meters.estimated_diameter_max;
      diameterAvg = (diameterMin + diameterMax) / 2;
      velocity = parseFloat(approachData.relative_velocity.kilometers_per_second);
      density = 2600; // Assume density of rocky asteroid (2600 kg/m³)
    }

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

    // Atmospheric entry analysis
    // Calculate if asteroid survives to ground or explodes in atmosphere
    // Based on Hills & Goda (1993) and Collins et al. fragmentation models
    
    // Strength varies by composition (in Pascals)
    let strength;
    if (density <= 1000) {
      strength = 1e6; // 1 MPa for icy objects
    } else if (density <= 2000) {
      strength = 3e6; // 3 MPa for carbonaceous
    } else if (density <= 2600) {
      strength = 5e6; // 5 MPa for stony asteroids
    } else if (density <= 3500) {
      strength = 10e6; // 10 MPa for stony-iron
    } else {
      strength = 50e6; // 50 MPa for iron asteroids
    }
    
    // Dynamic pressure at breakup: q = 0.5 * rho_air * v^2
    // Air density at ~10km altitude: ~0.4 kg/m³ (typical breakup altitude)
    const airDensity = 0.4;
    const dynamicPressure = 0.5 * airDensity * Math.pow(velocityMS, 2);
    
    // Critical size for atmospheric survival (Collins et al., 2005)
    // Objects larger than ~50m diameter typically survive if stony
    // Objects larger than ~100m almost always survive
    // Smaller objects depend on strength vs dynamic pressure
    const survivalRatio = strength / dynamicPressure;
    
    let impactType = "ground";
    let burstAltitude = 0;
    let craterDiameter = 0;
    let blastRadius = 0;
    
    // Large asteroids (>100m) almost always reach the ground
    if (diameterAvg >= 100) {
      impactType = "ground";
      craterDiameter = 1.8 * Math.pow(megatons, 0.29) * 1000;
      blastRadius = 200 * Math.pow(megatons, 0.33);
      
    // Medium asteroids (50-100m) - depends on composition and speed
    } else if (diameterAvg >= 50) {
      if (survivalRatio > 0.5 || density >= 3500) {
        // Dense or strong enough to survive
        impactType = "ground";
        craterDiameter = 1.8 * Math.pow(megatons, 0.29) * 1000;
        blastRadius = 200 * Math.pow(megatons, 0.33);
      } else {
        // Partial fragmentation
        impactType = "fragmented";
        const energyLossFactor = 0.5;
        const effectiveMegatons = megatons * energyLossFactor;
        craterDiameter = 1.8 * Math.pow(effectiveMegatons, 0.29) * 1000 * 0.7;
        blastRadius = 500 * Math.pow(effectiveMegatons, 0.33);
      }
      
    // Small asteroids (<50m) - very likely to airburst
    } else if (diameterAvg >= 10) {
      if (survivalRatio > 2.0 && density >= 7000) {
        // Only very dense iron survives
        impactType = "fragmented";
        const energyLossFactor = 0.3;
        const effectiveMegatons = megatons * energyLossFactor;
        craterDiameter = 1.8 * Math.pow(effectiveMegatons, 0.29) * 1000 * 0.5;
        blastRadius = 500 * Math.pow(effectiveMegatons, 0.33);
      } else {
        // Atmospheric airburst
        impactType = "airburst";
        burstAltitude = 5000 + (velocity * 200); // 5-20 km
        blastRadius = 1000 * Math.pow(megatons, 0.33);
        craterDiameter = 0;
      }
      
    // Very small asteroids (<10m) - always airburst or burn up
    } else {
      if (megatons < 0.0001) {
        // Burns up completely
        impactType = "airburst";
        burstAltitude = 40000 + (velocity * 500); // 40-70 km
        blastRadius = 0;
        craterDiameter = 0;
      } else {
        // Small airburst
        impactType = "airburst";
        burstAltitude = 20000 + (velocity * 400); // 20-40 km
        blastRadius = 500 * Math.pow(megatons, 0.33);
        craterDiameter = 0;
      }
    }

    // Categorize impact severity (updated for airburst scenarios)
    let severity = "Minor";
    let description = "Local damage, similar to a small earthquake";
    let color = "text-yellow-500";

    if (megatons < 0.001) {
      severity = "Negligible";
      description = "Burns up completely in atmosphere, possible meteor shower";
      color = "text-green-500";
    } else if (megatons < 1) {
      severity = "Minor";
      if (impactType === "airburst") {
        description = "Atmospheric explosion, shockwave damage, broken windows";
      } else {
        description = "Small crater or airburst, local damage possible";
      }
      color = "text-yellow-500";
    } else if (megatons < 100) {
      severity = "Moderate";
      if (impactType === "airburst") {
        description = "Major airburst event, city-scale devastation from shockwave";
      } else {
        description = "Regional destruction, significant crater formation";
      }
      color = "text-orange-500";
    } else if (megatons < 1000) {
      severity = "Major";
      description = "Country-scale devastation, climate effects, mass casualties";
      color = "text-red-500";
    } else {
      severity = "Catastrophic";
      description = "Global mass extinction event, permanent climate change";
      color = "text-red-700";
    }

    return {
      diameterAvg: diameterAvg.toFixed(1),
      velocity: velocity.toFixed(2),
      mass: (mass / 1e9).toFixed(2), // Convert to million kg
      kineticEnergy: megatons.toFixed(6),
      craterDiameter: craterDiameter.toFixed(0),
      impactType,
      burstAltitude: burstAltitude > 0 ? (burstAltitude / 1000).toFixed(1) : null,
      blastRadius: blastRadius.toFixed(0),
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

            {/* Parameter Editor */}
            <div className="p-6 border-b-2 bg-muted/30">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold">Impact Parameters</h4>
                  <p className="text-xs text-muted-foreground">Adjust parameters to explore different scenarios</p>
                </div>
                <Button
                  onClick={() => {
                    setCustomParameters(prev => {
                      const newUseCustom = !prev.useCustom;
                      if (!newUseCustom) {
                        return { ...prev, useCustom: false };
                      }
                      return {
                        useCustom: true,
                        diameter: parseFloat(impactData.diameterAvg),
                        velocity: parseFloat(impactData.velocity),
                        density: 2600
                      };
                    });
                  }}
                  variant={customParameters.useCustom ? "default" : "outline"}
                  size="sm"
                >
                  {customParameters.useCustom ? "Using Custom" : "Customize"}
                </Button>
              </div>

              {customParameters.useCustom && (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Diameter (m)</label>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      step="1"
                      value={customParameters.diameter || ''}
                      onChange={(e) => setCustomParameters(prev => ({
                        ...prev,
                        diameter: parseFloat(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 rounded-md border bg-background text-foreground"
                    />
                    <p className="text-xs text-muted-foreground">1-10,000 m</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Velocity (km/s)</label>
                    <input
                      type="number"
                      min="5"
                      max="75"
                      step="0.1"
                      value={customParameters.velocity || ''}
                      onChange={(e) => setCustomParameters(prev => ({
                        ...prev,
                        velocity: parseFloat(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 rounded-md border bg-background text-foreground"
                    />
                    <p className="text-xs text-muted-foreground">5-75 km/s</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Composition</label>
                    <select
                      value={customParameters.density}
                      onChange={(e) => setCustomParameters(prev => ({
                        ...prev,
                        density: parseInt(e.target.value)
                      }))}
                      className="w-full px-3 py-2 rounded-md border bg-background text-foreground"
                    >
                      <option value="1000">Ice (1000 kg/m³)</option>
                      <option value="2000">Carbonaceous (2000 kg/m³)</option>
                      <option value="2600">Stony (2600 kg/m³)</option>
                      <option value="3500">Stony-Iron (3500 kg/m³)</option>
                      <option value="8000">Iron (8000 kg/m³)</option>
                    </select>
                  </div>
                </div>
              )}

              {!customParameters.useCustom && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Click "Customize" to modify parameters and explore different impact scenarios
                </div>
              )}
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
                {/* Impact Type & Effects */}
                <div className="p-5 rounded-lg border-2 bg-card/50">
                  <div className="flex items-center gap-2 mb-4">
                    <Mountain className="h-5 w-5 text-primary" />
                    <h4 className="text-lg font-semibold">Impact Effects</h4>
                  </div>
                  <div className="space-y-4">
                    {/* Impact Type Badge */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Impact Type</p>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          impactData.impactType === 'airburst' 
                            ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' 
                            : impactData.impactType === 'fragmented'
                            ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                            : 'bg-red-500/20 text-red-500 border border-red-500/30'
                        }`}>
                          {impactData.impactType === 'airburst' ? '💨 Atmospheric Airburst' : 
                           impactData.impactType === 'fragmented' ? '💥 Fragmented Impact' : 
                           '🎯 Ground Impact'}
                        </span>
                      </div>
                    </div>

                    {/* Burst Altitude (if airburst) */}
                    {impactData.burstAltitude && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Burst Altitude</p>
                        <div className="flex items-end gap-2">
                          <p className="text-3xl font-bold text-orange-500">{impactData.burstAltitude}</p>
                          <p className="text-lg text-muted-foreground mb-1">km</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Explodes in atmosphere before reaching ground
                        </p>
                      </div>
                    )}

                    {/* Crater Diameter (if ground impact) */}
                    {parseFloat(impactData.craterDiameter) > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Crater Diameter</p>
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
                            ? `~${(parseFloat(impactData.craterDiameter) / 1000).toFixed(1)} km wide crater`
                            : 'Relatively small crater'}
                        </p>
                      </div>
                    )}

                    {/* Blast Radius */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {impactData.impactType === 'airburst' ? 'Shockwave Radius' : 'Blast Radius'}
                      </p>
                      <div className="flex items-end gap-2">
                        <p className="text-2xl font-bold text-red-500">{impactData.blastRadius}</p>
                        <p className="text-lg text-muted-foreground mb-1">meters</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {parseFloat(impactData.blastRadius) > 1000
                          ? `~${(parseFloat(impactData.blastRadius) / 1000).toFixed(1)} km blast zone`
                          : 'Localized destruction zone'}
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
                  <span className="font-semibold">⚠️ Disclaimer:</span> These calculations include atmospheric entry effects and are based on simplified models. 
                  Small asteroids (typically &lt;50m) often explode in the atmosphere (airburst) rather than creating craters, similar to the 2013 Chelyabinsk meteor.
                  Actual impact effects would vary significantly depending on material composition, structural strength, entry angle, atmospheric density, and impact location. 
                  This analysis is for educational purposes only.
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
