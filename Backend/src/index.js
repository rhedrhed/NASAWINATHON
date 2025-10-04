import dotenv from "dotenv";
import path from "path";

// Explicit absolute path to Backend/.env
const envPath = path.resolve('C:/Users/rayya/Downloads/NASAWINATHON/Backend/.env');
dotenv.config({ path: envPath });

console.log("Reading .env from:", envPath);
console.log("NASA_API_KEY =", process.env.NASA_API_KEY);

import express from "express";
import neos from "./routes/neos.js";
import sbdb from "./routes/sbdb.js";
import quakes from "./routes/quakes.js";
import elevation from "./routes/elevation.js";
import simulate from "./routes/simulate.js";
import meta from "./routes/meta.js";

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "asteroid-risk-api", ts: new Date().toISOString() });
});

app.use("/api/neo", neos);
app.use("/api/sbdb", sbdb);
app.use("/api/quakes", quakes);
app.use("/api/elevation", elevation);
app.use("/api/simulate", simulate);
app.use("/api/meta", meta);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
