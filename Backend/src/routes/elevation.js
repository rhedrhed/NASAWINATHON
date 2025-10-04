import express from "express";
import { sampleElevation } from "../services/usgs/elev3dep.js";

const router = express.Router();

// Get elevation at a single point
router.get("/point", async (req, res) => {
  try {
    const { lon, lat } = req.query;
    const data = await sampleElevation(Number(lon), Number(lat));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;