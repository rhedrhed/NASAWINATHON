export default function Simulation() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Impact Simulation</h1>
      <p className="text-lg text-muted-foreground mb-6">
        Simulate asteroid impacts and deflection scenarios.
      </p>
      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-2">Impact Simulation</h2>
          <p className="text-muted-foreground">Simulate the effects of an asteroid impact</p>
        </div>
        <div className="p-4 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-2">Deflection Simulation</h2>
          <p className="text-muted-foreground">Simulate asteroid deflection strategies</p>
        </div>
      </div>
    </div>
  );
}
