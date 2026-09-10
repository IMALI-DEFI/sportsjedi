import { Router } from "express";
import { getSportsProvider } from "../services/sportsProvider.js";
import { analyzeGame } from "../services/analysisService.js";
import { getMlbGamecast } from "../services/gamecast/mlb.js";
import { getNflGamecast } from "../services/gamecast/nfl.js";
import { getNbaGamecast } from "../services/gamecast/nba.js";

const router = Router();
const provider = getSportsProvider();

router.get("/", async (req, res, next) => {
  try {
    const games = await provider.getGames({ league: req.query.league });
    res.json({ success: true, data: games });
  } catch (err) { next(err); }
});

router.get("/:id/gamecast", async (req, res, next) => {
  try {
    const game =
      await provider.getGame(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: "Game not found",
      });
    }

    const league =
      String(game.league || "").toUpperCase();

    let gamecast;

    if (league === "MLB") {
      if (!game.gamePk) {
        return res.status(404).json({
          success: false,
          error: "MLB game mapping not available.",
        });
      }

      gamecast =
        await getMlbGamecast(game.gamePk);
    } else if (league === "NFL") {
      gamecast =
        await getNflGamecast(game);
    } else if (league === "NBA") {
      gamecast =
        await getNbaGamecast(game);
    } else {
      return res.status(400).json({
        success: false,
        error:
          "Gamecast is available for MLB, NFL and NBA.",
      });
    }

    res.json({
      success: true,
      data: {
        ...gamecast,
        eventId: game.id,
      },
    });
  } catch (err) {
    next(err);
  }
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
