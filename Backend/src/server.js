
import dotenv from "dotenv";
dotenv.config();

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