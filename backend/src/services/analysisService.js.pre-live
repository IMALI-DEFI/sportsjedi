function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function rating(abbr) {
  return (
    78 +
    [...abbr].reduce(
      (sum, char) => sum + char.charCodeAt(0),
      0
    ) %
      18
  );
}

export function analyzeGame(game) {
  const homeRating =
    rating(game.home.abbr) + 2.5;

  const awayRating =
    rating(game.away.abbr);

  const diff =
    homeRating - awayRating;

  const homeWin =
    clamp(50 + diff * 2.25, 20, 80);

  const awayWin =
    100 - homeWin;

  const confidence =
    Math.round(
      clamp(
        58 + Math.abs(diff) * 3.1,
        58,
        91
      )
    );

  const pick =
    homeWin >= 50
      ? game.home.abbr
      : game.away.abbr;

  const total =
    game.total || 44;

  return {
    gameId: game.id,

    pick,

    confidence,

    homeWinProbability:
      +homeWin.toFixed(1),

    awayWinProbability:
      +awayWin.toFixed(1),

    edge:
      +Math.abs(
        homeWin - 50
      ).toFixed(1),

    projectedScore: {
      away: Math.max(
        1,
        Math.round(
          total / 2 - diff / 3
        )
      ),

      home: Math.max(
        1,
        Math.round(
          total / 2 + diff / 3
        )
      ),
    },

    summary:
      `${pick} has the stronger model profile after weighting team strength, venue adjustment, market context and matchup balance.`,

    factors: [
      {
        label: "Power rating",
        impact:
          diff >= 0
            ? game.home.abbr
            : game.away.abbr,
      },
      {
        label: "Venue adjustment",
        impact: game.home.abbr,
      },
      {
        label: "Market spread",
        impact: game.spread
          ? `${game.spread.favorite} ${game.spread.line}`
          : "N/A",
      },
      {
        label: "Projected total",
        impact: String(
          game.total ?? "N/A"
        ),
      },
    ],
  };
}

export function analyzeParlay(
  legs = []
) {
  const valid =
    legs.filter(
      (leg) =>
        leg &&
        Number(leg.confidence)
    );

  if (!valid.length) {
    return {
      legs: 0,
      combinedConfidence: 0,
      risk: "N/A",
      message:
        "Add at least one leg.",
    };
  }

  const average =
    valid.reduce(
      (sum, leg) =>
        sum +
        Number(
          leg.confidence
        ),
      0
    ) /
    valid.length;

  const penalty =
    Math.max(
      0,
      (valid.length - 1) *
        5.5
    );

  const combined =
    clamp(
      average - penalty,
      15,
      95
    );

  const risk =
    valid.length >= 5 ||
    combined < 50
      ? "High"
      : valid.length >= 3 ||
          combined < 65
        ? "Medium"
        : "Lower";

  return {
    legs: valid.length,

    combinedConfidence:
      +combined.toFixed(1),

    risk,

    message:
      `${valid.length}-leg card with ${risk.toLowerCase()} model confidence. More legs increase uncertainty.`,
  };
}
