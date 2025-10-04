import express from "express";
import { neowsFeed, neowsLookup } from "../services/nasa/neows.js";

const router = express.Router();


router.get("/feed", async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const data = await neowsFeed(start_date, end_date);
    res.json(data);
  } catch (err) {
    console.error(err); 
    res.status(500).json({ error: "Failed to fetch NEOWS feed" });
  }
});


router.get("/lookup/:id", async (req, res) => {
  try {
    const data = await neowsLookup(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
