// src/routes/neos.js
import express from "express";
import { neowsFeed } from "../services/nasa/neows.js";

const router = express.Router();

/**
 * GET /api/neo/feed?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 * Returns near-Earth objects feed from NASA or fallback data on failure
 */
router.get("/feed", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Validate query parameters
    if (!start_date || !end_date) {
      return res.status(400).json({
        error: "start_date and end_date query parameters are required. Example: ?start_date=2025-10-01&end_date=2025-10-04"
      });
    }

    // Call NEOWS service
    const feedData = await neowsFeed(start_date, end_date);

    // Return feed data
    res.json(feedData);
  } catch (err) {
    console.error("NEOWS /feed route error:", err.message);

    // Return fallback data if something goes wrong
    res.status(500).json({
      error: "Failed to fetch NEOWS feed",
      details: err.message
    });
  }
});

export default router;
