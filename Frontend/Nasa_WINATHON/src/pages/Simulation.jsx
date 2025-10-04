import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Simulation() {
  const navigate = useNavigate();
  const [asteroids, setAsteroids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load asteroid list (for now, just one asteroid)
    fetch('/asteroid.json')
      .then(res => res.json())
      .then(data => {
        setAsteroids([data]); // Wrap in array for future expansion
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load asteroid data:', err);
        setLoading(false);
      });
  }, []);

  const handleViewAsteroid = (asteroidId) => {
    navigate(`/simulation/${asteroidId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Asteroid Simulations</h1>
        <p className="text-muted-foreground">
          Explore near-Earth asteroids and their orbital paths through our solar system
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading asteroids...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {asteroids.map((asteroid, idx) => (
            <div
              key={asteroid.id || idx}
              className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-card"
            >
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold mb-1">{asteroid.name}</h2>
                {asteroid.is_potentially_hazardous_asteroid && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="px-2 py-1 bg-destructive/10 text-destructive rounded text-xs font-semibold">
                          PHA
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Potentially Hazardous Asteroid</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Diameter:</span>
                  <span className="font-medium">
                    {asteroid.estimated_diameter.meters.estimated_diameter_min.toFixed(0)} - {asteroid.estimated_diameter.meters.estimated_diameter_max.toFixed(0)} m
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Orbit Class:</span>
                  <span className="font-medium">{asteroid.orbital_data.orbit_class.orbit_class_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Semi-major Axis:</span>
                  <span className="font-medium">{asteroid.orbital_data.semi_major_axis} AU</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Eccentricity:</span>
                  <span className="font-medium">{parseFloat(asteroid.orbital_data.eccentricity).toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Inclination:</span>
                  <span className="font-medium">{parseFloat(asteroid.orbital_data.inclination).toFixed(2)}°</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={() => handleViewAsteroid(asteroid.id)}
                  className="w-full"
                  variant="default"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Simulation
                </Button>
              </div>

              {(() => {
                // Find the next close approach after today
                const now = new Date();
                const nextApproach = asteroid.close_approach_data?.find(approach => {
                  const approachDate = new Date(approach.close_approach_date_full);
                  return approachDate >= now;
                });

                if (nextApproach) {
                  return (
                    <div className="mt-4 p-3 bg-muted rounded text-xs">
                      <p className="font-semibold mb-1">Next Close Approach:</p>
                      <p>
                        {new Date(nextApproach.close_approach_date_full).toLocaleDateString()} - {' '}
                        {Math.round(parseFloat(nextApproach.miss_distance.kilometers)).toLocaleString()} km
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          ))}
        </div>
      )}

      {asteroids.length === 0 && !loading && (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">No asteroids available</p>
        </div>
      )}
    </div>
  );
}
