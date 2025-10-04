export default function NearEarthObjects() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Near Earth Objects</h1>
      <p className="text-lg text-muted-foreground mb-6">
        Track and analyze Near Earth Objects using NASA's NeoWs API.
      </p>
      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-2">NEO Feed</h2>
          <p className="text-muted-foreground">Browse asteroids by date range</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-2">NEO Lookup</h2>
          <p className="text-muted-foreground">Look up specific asteroids by ID</p>
        </div>
      </div>
    </div>
  );
}
