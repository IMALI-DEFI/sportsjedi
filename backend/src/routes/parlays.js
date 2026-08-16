import { Router } from "express";
import { analyzeParlay } from "../services/analysisService.js";

const router = Router();

router.post("/analyze", (req, res) => {
  const legs = Array.isArray(req.body?.legs)
    ? req.body.legs
    : [];

  res.json({
    success: true,
    data: analyzeParlay(legs),
  });
});

export default router;
