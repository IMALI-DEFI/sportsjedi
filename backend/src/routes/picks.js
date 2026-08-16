import { Router } from "express";
import { getSportsProvider } from "../services/sportsProvider.js";
import { analyzeGame } from "../services/analysisService.js";

const router = Router();
const provider = getSportsProvider();

router.get("/", async (req, res, next) => {
  try {
    const games = await provider.getGames({
      league: req.query.league,
    });

    const picks = games
      .filter((game) => game.status !== "final")
      .map((game) => ({
        game,
        analysis: analyzeGame(game),
      }))
      .sort(
        (a, b) =>
          b.analysis.confidence - a.analysis.confidence
      );

    res.json({
      success: true,
      data: picks,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/props", async (req, res, next) => {
  try {
    const props = await provider.getPlayerProps({
      league: req.query.league,
    });

    res.json({
      success: true,
      data: props,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
