import express from "express";
import neos from "./routes/neos.js";
import sbdb from "./routes/sbdb.js";
import quakes from "./routes/quakes.js";
import elevation from "./routes/elevation.js";
import simulate from "./routes/simulate.js";
import meta from "./routes/meta.js";

const app = express();
app.use(express.json());

// Mount routes
app.use("/api/neo", neos);
app.use("/api/sbdb", sbdb);
app.use("/api/quakes", quakes);
app.use("/api/elevation", elevation);
app.use("/api/simulate", simulate);
app.use("/api/meta", meta);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});