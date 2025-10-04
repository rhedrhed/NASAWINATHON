import express from "express";
import { sampleElevation } from "../services/usgs/elev3dep.js";

const router = express.Router();

// Get elevation at a single point
router.get("/point", async (req, res) => {
  const fallback = { lon: 0, lat: 0, elevation_m: 10 };

  try {
    const lon = Number(req.query.lon);
    const lat = Number(req.query.lat);

    if (isNaN(lon) || isNaN(lat)) {
      return res.status(400).json({ error: "Missing or invalid lon/lat" });
    }

    const data = await sampleElevation(lon, lat);
    res.json(data || fallback);
  } catch (err) {
    res.status(500).json({ error: err.message, fallback });
  }
});

export default router;
