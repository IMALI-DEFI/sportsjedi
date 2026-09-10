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

export default function LiveGamecast({
  gamecast,
}) {
  if (!gamecast) return null;

  const bases = gamecast.bases || {};
  const count = gamecast.count || {};
  const score = gamecast.score || {};

  const live = gamecast.status === "live";
  const final = gamecast.status === "final";

  const period =
    gamecast.inningState && gamecast.inningOrdinal
      ? `${gamecast.inningState} ${gamecast.inningOrdinal}`
      : gamecast.inningOrdinal ||
        (gamecast.inning
          ? `Inning ${gamecast.inning}`
          : gamecast.detailedStatus ||
            "Game status");

  return (
    <section className="gamecast-card">
      <div className="gamecast-heading">
        <div>
          <span className="eyebrow">
            MLB GAMECAST
          </span>

          <h2>Live Field</h2>
        </div>

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
      </div>

      <div className="gamecast-scoreboard">
        <div>
          <span>AWAY</span>
          <strong>
            {valueOrDash(score.away)}
          </strong>
        </div>

        <div className="gamecast-period">
          <strong>{period}</strong>
          {live && (
            <span>
              {valueOrDash(count.outs)} out
              {count.outs === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div>
          <span>HOME</span>
          <strong>
            {valueOrDash(score.home)}
          </strong>
        </div>
      </div>

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

          {(gamecast.batter ||
            gamecast.pitcher) && (
            <div className="gamecast-players">
              {gamecast.batter && (
                <div>
                  <span>AT BAT</span>
                  <strong>
                    {gamecast.batter}
                  </strong>
                </div>
              )}

              {gamecast.pitcher && (
                <div>
                  <span>PITCHING</span>
                  <strong>
                    {gamecast.pitcher}
                  </strong>
                </div>
              )}
            </div>
          )}

          <div className="latest-play">
            <span>LATEST PLAY</span>
            <p>
              {gamecast.latestPlay?.description ||
                gamecast.latestPlay ||
                (live
                  ? "Waiting for the next play…"
                  : final
                    ? "Game complete."
                    : "Game has not started yet.")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
