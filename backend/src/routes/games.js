import { Router } from "express";
import { getSportsProvider } from "../services/sportsProvider.js";
import { analyzeGame } from "../services/analysisService.js";

const router = Router();
const provider = getSportsProvider();

router.get("/", async (req, res, next) => {
  try {
    const games = await provider.getGames({ league: req.query.league });
    res.json({ success: true, data: games });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const game = await provider.getGame(req.params.id);
    if (!game) return res.status(404).json({ success: false, error: "Game not found" });
    res.json({ success: true, data: game });
  } catch (err) { next(err); }
});

router.get("/:id/analysis", async (req, res, next) => {
  try {
    const game = await provider.getGame(req.params.id);
    if (!game) return res.status(404).json({ success: false, error: "Game not found" });
    res.json({ success: true, data: analyzeGame(game) });
  } catch (err) { next(err); }
});

export default router;
