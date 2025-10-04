export default function Elevation() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Elevation Data</h1>
      <p className="text-lg text-muted-foreground mb-6">
        Get elevation data for specific locations using USGS 3DEP service.
      </p>
      <div className="p-4 border rounded-lg">
        <h2 className="text-2xl font-semibold mb-2">Elevation Lookup</h2>
        <p className="text-muted-foreground">Get elevation data by coordinates (latitude/longitude)</p>
      </div>
    </div>
  );
}
