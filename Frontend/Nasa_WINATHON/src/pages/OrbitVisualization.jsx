import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Pause, RotateCcw } from "lucide-react";
import { OrbitScene } from "@/components/orbit";
import { parseHorizonsData, jdToDate } from "@/lib/horizonsUtils";

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
          <p className="mt-1">🟡 Yellow = Sun | 🔵 Blue = Earth | ⚪ Gray = Asteroid</p>
        </div>
      </div>
    </div>
  );
}
