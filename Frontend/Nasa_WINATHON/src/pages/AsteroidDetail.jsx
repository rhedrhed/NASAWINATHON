import { useEffect, useState, useRef, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Pause, RotateCcw, Info, ArrowLeft } from "lucide-react";
import { OrbitScene } from "@/components/orbit";
import { parseHorizonsData, jdToDate } from "@/lib/horizonsUtils";

const SECS_PER_HOUR = 3600;
const SECS_PER_DAY = SECS_PER_HOUR * 24;
const SECS_PER_WEEK = SECS_PER_DAY * 7;
const SECS_PER_MONTH = SECS_PER_DAY * 30.4167;
const SECS_PER_YEAR = SECS_PER_DAY * 365.25;
const SPEED_STORAGE_KEY = 'asteroid-simulation-speed';

export default function AsteroidDetail() {
  const navigate = useNavigate();
  const { asteroidId } = useParams();
  const [asteroidData, setAsteroidData] = useState(null);
  const [asteroidOrbitData, setAsteroidOrbitData] = useState([]);
  const [earthOrbitData, setEarthOrbitData] = useState([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Initialize speed from localStorage or default to 1 week per second
  const [speed, setSpeed] = useState(() => {
    const savedSpeed = localStorage.getItem(SPEED_STORAGE_KEY);
    return savedSpeed ? parseFloat(savedSpeed) : SECS_PER_WEEK;
  });
  
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
  };

  const handleSpeedChange = (value) => {
    const newSpeed = parseFloat(value);
    setSpeed(newSpeed);
    localStorage.setItem(SPEED_STORAGE_KEY, newSpeed.toString());
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
      navigate(`/simulation/${asteroidId}/orbit-view?date=${targetDate.toISOString()}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button onClick={() => navigate('/simulation')} variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Asteroids
        </Button>
      </div>
      <h1 className="text-4xl font-bold mb-4">{asteroidData?.name || '...'}</h1>
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
            <OrbitScene
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
