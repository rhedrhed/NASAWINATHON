import express from "express";

const router = express.Router();

// Simple impact simulation
router.post("/impact", (req, res) => {
  try {
    const { diameter_m, density = 3000, speed_mps, angle_deg = 45, target } = req.body;

    const radius = diameter_m / 2;
    const mass = density * (4 / 3) * Math.PI * Math.pow(radius, 3);
    const energy = 0.5 * mass * Math.pow(speed_mps, 2); // Joules
    const tntTons = energy / 4.184e9; // 1 ton TNT = 4.184e9 J

    const craterDiam = 1.8 * Math.cbrt(tntTons); // placeholder scaling
    const blast = {
      psi1_m: Math.cbrt(tntTons) * 1200,
      psi3_m: Math.cbrt(tntTons) * 700,
      psi5_m: Math.cbrt(tntTons) * 500
    };

    res.json({
      mass,
      energy_J: energy,
      tnt_tons: tntTons,
      crater_diameter_m: craterDiam,
      blast,
      target
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simple deflection simulation
router.post("/deflect", (req, res) => {
  try {
    const { dv_mps, lead_time_days } = req.body;
    const T = (lead_time_days || 0) * 86400;
    const miss_distance = dv_mps * T;
    res.json({ miss_distance_m: miss_distance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;