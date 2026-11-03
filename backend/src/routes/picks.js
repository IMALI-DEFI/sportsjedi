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

    // Server-side entitlement limits. Anonymous visitors get one preview;
    // signed-in free members get three; Pro keeps full access.
    const maxPicks = req.user?.isPro ? picks.length : req.user ? 3 : 1;
    res.json({
      success: true,
      data: picks.slice(0, maxPicks),
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

    const maxProps = req.user?.isPro ? props.length : req.user ? 5 : 0;
    res.json({
      success: true,
      data: props.slice(0, maxProps),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
