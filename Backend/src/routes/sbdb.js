import express from "express";
import { sbdbLookup, sbdbCAD } from "../services/nasa/sbdb.js";

const router = express.Router();

/**
 * GET /api/sbdb/lookup?des=OBJECT
 * Example: /api/sbdb/lookup?des=99942
 */
router.get("/lookup", async (req, res) => {
  try {
    const { des } = req.query;
    if (!des) return res.status(400).json({ error: "Query parameter 'des' is required" });

    const data = await sbdbLookup(des);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sbdb/cad?des=OBJECT&date-min=YYYY-MM-DD&date-max=YYYY-MM-DD&dist-max=AU
 * Example: /api/sbdb/cad?des=99942&date-min=2025-01-01&date-max=2025-12-31&dist-max=0.05
 */
router.get("/cad", async (req, res) => {
  try {
    const { des, "date-min": dateMin, "date-max": dateMax, "dist-max": distMax } = req.query;
    if (!des) return res.status(400).json({ error: "Query parameter 'des' is required" });

    const data = await sbdbCAD({ des, dateMin, dateMax, distMax });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
