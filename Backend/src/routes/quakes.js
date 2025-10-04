import express from "express";
import { quakesGeoJSON } from "../services/usgs/quakes.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const data = await quakesGeoJSON(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;