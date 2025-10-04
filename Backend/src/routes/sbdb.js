import express from "express";
import { sbdbLookup, sbdbCAD } from "../services/nasa/sbdb.js";

const router = express.Router();


router.get("/lookup", async (req, res) => {
  try {
    const { s } = req.query;
    const data = await sbdbLookup(s);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get("/cad", async (req, res) => {
  try {
    const data = await sbdbCAD(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;