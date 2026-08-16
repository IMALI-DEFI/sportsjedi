import { Router } from "express";
const router = Router();
router.get("/", (req, res) => res.json({ success: true, service: "sports-jedi-api", status: "ok", time: new Date().toISOString() }));
export default router;
