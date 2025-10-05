export function OrbitControls({asteroidName}) {
  return (
    <>
      <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
        <p><strong>Controls:</strong> Left-click and drag to rotate | Right-click to pan | Scroll to zoom</p>
        <p className="mt-1">🟡 Yellow = Sun | 🔵 Blue = Earth | ⚪ Gray = {asteroidName ? asteroidName : "Asteroid"}</p>
        <p className="text-muted-foreground">*Not to scale</p>
      </div>
    </>
  );
}
