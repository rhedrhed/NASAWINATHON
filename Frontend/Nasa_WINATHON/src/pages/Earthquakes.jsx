export default function Earthquakes() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Earthquake Data</h1>
      <p className="text-lg text-muted-foreground mb-6">
        Monitor recent earthquake activity using USGS data.
      </p>
      <div className="p-4 border rounded-lg">
        <h2 className="text-2xl font-semibold mb-2">Recent Earthquakes</h2>
        <p className="text-muted-foreground">View and analyze recent seismic activity</p>
      </div>
    </div>
  );
}
