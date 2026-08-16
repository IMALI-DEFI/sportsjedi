import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import healthRoutes from "./routes/health.js";
import gameRoutes from "./routes/games.js";
import teamRoutes from "./routes/teams.js";
import picksRoutes from "./routes/picks.js";
import parlayRoutes from "./routes/parlays.js";

import {
  notFound,
  errorHandler,
} from "./middleware/errorHandler.js";

const app = express();

const PORT =
  Number(
    process.env.PORT || 4100
  );

const allowedOrigins =
  (
    process.env.FRONTEND_ORIGIN ||
    ""
  )
    .split(",")
    .map((origin) =>
      origin.trim()
    )
    .filter(Boolean);

app.use(helmet());

app.use(
  cors({
    origin: (
      origin,
      callback
    ) => {
      if (
        !origin ||
        !allowedOrigins.length ||
        allowedOrigins.includes(
          origin
        )
      ) {
        return callback(
          null,
          true
        );
      }

      callback(
        new Error(
          "Origin not allowed"
        )
      );
    },

    credentials: true,
  })
);

app.use(
  express.json({
    limit: "100kb",
  })
);

app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({
    name:
      "Sports Jedi API",
    version: "1.1.0",
    provider:
      process.env
        .SPORTS_PROVIDER ||
      "mock",
  });
});

app.use(
  "/api/health",
  healthRoutes
);

app.use(
  "/api/games",
  gameRoutes
);

app.use(
  "/api/teams",
  teamRoutes
);

app.use(
  "/api/picks",
  picksRoutes
);

app.use(
  "/api/parlays",
  parlayRoutes
);

app.use(notFound);

app.use(errorHandler);

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Sports Jedi API running on port ${PORT}`
    );
  }
);
