import { teamShort } from "../lib/plain";
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
  const league = String(gamecast.league || gamecast.sport || "").toUpperCase();
  const asset = (name) => {
    const slug = String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return league === "NFL" ? `/artwork/helmets3d/nfl/${slug}.webp` : league === "NCAAF" ? `/artwork/library/helmets/ncaaf/${slug}.svg` : league === "NBA" ? `/artwork/library/teams/nba/${slug}.svg` : "";
  };
  return (
    <div className="gamecast-scoreboard">
      <div>
        <img className="sj-score-art" src={asset(gamecast.teams?.away)} alt="" onError={e => { const i = e.currentTarget; if (i.src.includes("/helmets3d/")) { i.src = i.src.replace("/artwork/helmets3d/nfl/", "/artwork/library/helmets/nfl/").replace(".webp", ".svg"); } else { i.style.display="none"; } }} /><span>{gamecast.teams?.away ? teamShort(gamecast.teams.away) : "AWAY"}</span>
        <strong>
          {valueOrDash(score.away)}
        </strong>
      </div>

      <div className="gamecast-period">
        <strong>{center}</strong>
        {subtext && <span>{subtext}</span>}
      </div>

      <div>
        <img className="sj-score-art" src={asset(gamecast.teams?.home)} alt="" data-side="home" onError={e => { const i = e.currentTarget; if (i.src.includes("/helmets3d/")) { i.src = i.src.replace("/artwork/helmets3d/nfl/", "/artwork/library/helmets/nfl/").replace(".webp", ".svg"); } else { i.style.display="none"; } }} /><span>{gamecast.teams?.home ? teamShort(gamecast.teams.home) : "HOME"}</span>
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
              {gamecast.possession
                ? teamShort(gamecast.possession)
                : "—"}
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
              {gamecast.possession
                ? teamShort(gamecast.possession)
                : "—"}
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
      : ["NFL", "NCAAF"].includes(league)
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

      {["NFL", "NCAAF"].includes(league) && (
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
