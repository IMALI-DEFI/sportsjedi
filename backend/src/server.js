import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import healthRoutes from "./routes/health.js";
import gameRoutes from "./routes/games.js";
import teamRoutes from "./routes/teams.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = Number(process.env.PORT || 4100);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN?.split(",") || true, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => res.json({ name: "Sports Jedi API", version: "1.0.0" }));
app.use("/api/health", healthRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/teams", teamRoutes);
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => console.log(`Sports Jedi API running on port ${PORT}`));
