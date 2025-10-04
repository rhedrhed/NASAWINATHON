import express from "express";
const router = express.Router();

// Disclaimer endpoint
router.get("/disclaimer", (_req, res) => {
  res.json({
    message:
      "NASA does not endorse any non-U.S. Government entity and is not responsible for information contained on non-U.S. Government websites. Users must comply with data-use terms of each source."
  });
});

export default router;