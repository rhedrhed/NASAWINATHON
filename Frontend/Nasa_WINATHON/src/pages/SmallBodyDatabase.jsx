export default function SmallBodyDatabase() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Small Body Database</h1>
      <p className="text-lg text-muted-foreground mb-6">
        Access detailed information about asteroids and comets.
      </p>
      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-2">SBDB Lookup</h2>
          <p className="text-muted-foreground">Search for small bodies by designation</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-2">Close Approach Data</h2>
          <p className="text-muted-foreground">View close approach data for asteroids</p>
        </div>
      </div>
    </div>
  );
}
