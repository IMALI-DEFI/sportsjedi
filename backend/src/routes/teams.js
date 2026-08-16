import { Router } from "express";
import { getSportsProvider } from "../services/sportsProvider.js";
const router = Router();
const provider = getSportsProvider();
router.get("/", async (req, res, next) => {
  try {
    const teams = await provider.getTeams({ league: req.query.league });
    res.json({ success: true, data: teams });
  } catch (err) { next(err); }
});
export default router;
