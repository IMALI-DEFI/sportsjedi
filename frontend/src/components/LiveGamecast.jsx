function Base({ active, className, label }) {
  return (
    <div
      className={`diamond-base ${className} ${
        active ? "occupied" : ""
      }`}
      aria-label={`${label}${
        active ? " occupied" : " empty"
      }`}
    />
  );
}

function valueOrDash(value) {
  return value == null ? "—" : value;
}

function latestPlayText(gamecast, live, final) {
  const play = gamecast.latestPlay;

  if (typeof play === "string" && play.trim()) {
    return play;
  }

  if (
    play &&
    typeof play === "object" &&
    typeof play.description === "string"
  ) {
    return play.description;
  }

  if (live) return "Waiting for the next play…";
  if (final) return "Game complete.";

  return "Game has not started yet.";
}

function StatusPill({ gamecast, live, final }) {
  return (
    <span
      className={`gamecast-live-pill ${
        live
          ? "is-live"
          : final
            ? "is-final"
            : ""
      }`}
    >
      {live
        ? "● LIVE"
        : final
          ? "FINAL"
          : gamecast.detailedStatus ||
            "SCHEDULED"}
    </span>
  );
}

function Scoreboard({
  gamecast,
  center,
  subtext,
}) {
  const score = gamecast.score || {};

  return (
    <div className="gamecast-scoreboard">
      <div>
        <span>
          {gamecast.teams?.away || "AWAY"}
        </span>
        <strong>
          {valueOrDash(score.away)}
        </strong>
      </div>

      <div className="gamecast-period">
        <strong>{center}</strong>
        {subtext && <span>{subtext}</span>}
      </div>

      <div>
        <span>
          {gamecast.teams?.home || "HOME"}
        </span>
        <strong>
          {valueOrDash(score.home)}
        </strong>
      </div>
    </div>
  );
}

function MlbGamecast({
  gamecast,
  live,
  final,
  latestPlay,
}) {
  const bases = gamecast.bases || {};
  const count = gamecast.count || {};

  const period =
    gamecast.inningState &&
    gamecast.inningOrdinal
      ? `${gamecast.inningState} ${gamecast.inningOrdinal}`
      : gamecast.inningOrdinal ||
        (gamecast.inning
          ? `Inning ${gamecast.inning}`
          : gamecast.detailedStatus ||
            "Game status");

  return (
    <>
      <Scoreboard
        gamecast={gamecast}
        center={period}
        subtext={
          live
            ? `${valueOrDash(count.outs)} out${
                count.outs === 1 ? "" : "s"
              }`
            : ""
        }
      />

      <div className="gamecast-body">
        <div className="baseball-field">
          <div className="field-grass" />

          <Base
            className="base-second"
            active={Boolean(bases.second)}
            label="Second base"
          />

          <Base
            className="base-third"
            active={Boolean(bases.third)}
            label="Third base"
          />

          <Base
            className="base-first"
            active={Boolean(bases.first)}
            label="First base"
          />

          <div className="pitchers-mound" />
          <div className="home-plate" />
        </div>

        <div className="gamecast-info">
          <div className="count-board">
            <div>
              <span>BALLS</span>
              <strong>
                {valueOrDash(count.balls)}
              </strong>
            </div>

            <div>
              <span>STRIKES</span>
              <strong>
                {valueOrDash(count.strikes)}
              </strong>
            </div>

            <div>
              <span>OUTS</span>
              <strong>
                {valueOrDash(count.outs)}
              </strong>
            </div>
          </div>

          {(gamecast.matchup?.batter ||
            gamecast.matchup?.pitcher) && (
            <div className="gamecast-players">
              {gamecast.matchup?.batter && (
                <div>
                  <span>AT BAT</span>
                  <strong>
                    {gamecast.matchup.batter}
                  </strong>
                </div>
              )}

              {gamecast.matchup?.pitcher && (
                <div>
                  <span>PITCHING</span>
                  <strong>
                    {gamecast.matchup.pitcher}
                  </strong>
                </div>
              )}
            </div>
          )}

          <div className="latest-play">
            <span>LATEST PLAY</span>
            <p>{latestPlay}</p>
          </div>
        </div>
      </div>
    </>
  );
}

function NflGamecast({
  gamecast,
  latestPlay,
}) {
  const period =
    gamecast.period
      ? `Q${gamecast.period}`
      : gamecast.detailedStatus ||
        "Game status";

  const clock =
    gamecast.clock &&
    gamecast.clock !== "0:00"
      ? gamecast.clock
      : "";

  return (
    <>
      <Scoreboard
        gamecast={gamecast}
        center={period}
        subtext={clock}
      />

      <div className="gamecast-info">
        <div className="count-board">
          <div>
            <span>POSSESSION</span>
            <strong>
              {valueOrDash(
                gamecast.possession
              )}
            </strong>
          </div>

          <div>
            <span>DOWN / DIST</span>
            <strong>
              {gamecast.down
                ? `${gamecast.down}${
                    gamecast.distance
                      ? ` & ${gamecast.distance}`
                      : ""
                  }`
                : "—"}
            </strong>
          </div>

          <div>
            <span>FIELD</span>
            <strong>
              {valueOrDash(
                gamecast.yardLine
              )}
            </strong>
          </div>
        </div>

        <div className="latest-play">
          <span>LATEST PLAY</span>
          <p>{latestPlay}</p>
        </div>
      </div>
    </>
  );
}

function NbaGamecast({
  gamecast,
  latestPlay,
}) {
  const period =
    gamecast.period
      ? `Q${gamecast.period}`
      : gamecast.detailedStatus ||
        "Game status";

  const clock =
    gamecast.clock &&
    gamecast.clock !== "0:00"
      ? gamecast.clock
      : "";

  return (
    <>
      <Scoreboard
        gamecast={gamecast}
        center={period}
        subtext={clock}
      />

      <div className="gamecast-info">
        <div className="count-board">
          <div>
            <span>PERIOD</span>
            <strong>
              {gamecast.period
                ? `Q${gamecast.period}`
                : "—"}
            </strong>
          </div>

          <div>
            <span>CLOCK</span>
            <strong>
              {clock || "—"}
            </strong>
          </div>

          <div>
            <span>POSSESSION</span>
            <strong>
              {valueOrDash(
                gamecast.possession
              )}
            </strong>
          </div>
        </div>

        <div className="latest-play">
          <span>LATEST PLAY</span>
          <p>{latestPlay}</p>
        </div>
      </div>
    </>
  );
}

export default function LiveGamecast({
  gamecast,
}) {
  if (!gamecast) return null;

  const league = String(
    gamecast.league || ""
  ).toUpperCase();

  const live = gamecast.status === "live";
  const final = gamecast.status === "final";

  const latestPlay = latestPlayText(
    gamecast,
    live,
    final
  );

  const title =
    league === "MLB"
      ? "Live Field"
      : league === "NFL"
        ? "Live Gridiron"
        : league === "NBA"
          ? "Live Court"
          : "Live Game";

  return (
    <section className="gamecast-card">
      <div className="gamecast-heading">
        <div>
          <span className="eyebrow">
            {league} GAMECAST
          </span>

          <h2>{title}</h2>
        </div>

        <StatusPill
          gamecast={gamecast}
          live={live}
          final={final}
        />
      </div>

      {league === "MLB" && (
        <MlbGamecast
          gamecast={gamecast}
          live={live}
          final={final}
          latestPlay={latestPlay}
        />
      )}

      {league === "NFL" && (
        <NflGamecast
          gamecast={gamecast}
          latestPlay={latestPlay}
        />
      )}

      {league === "NBA" && (
        <NbaGamecast
          gamecast={gamecast}
          latestPlay={latestPlay}
        />
      )}
    </section>
  );
}
