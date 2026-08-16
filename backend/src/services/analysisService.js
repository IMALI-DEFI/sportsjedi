function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function americanToProbability(odds) {
  const n = Number(odds);

  if (!Number.isFinite(n) || n === 0) return null;

  return n > 0
    ? 100 / (n + 100)
    : Math.abs(n) / (Math.abs(n) + 100);
}

function removeVig(homePrice, awayPrice) {
  const homeRaw = americanToProbability(homePrice);
  const awayRaw = americanToProbability(awayPrice);

  if (homeRaw == null || awayRaw == null) return null;

  const total = homeRaw + awayRaw;
  if (!total) return null;

  return {
    home: homeRaw / total,
    away: awayRaw / total,
    vig: total - 1,
  };
}

function median(values) {
  const nums = values
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (!nums.length) return null;

  const middle = Math.floor(nums.length / 2);

  return nums.length % 2
    ? nums[middle]
    : (nums[middle - 1] + nums[middle]) / 2;
}

function average(values) {
  const nums = values.map(Number).filter(Number.isFinite);

  if (!nums.length) return null;

  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function standardDeviation(values) {
  const nums = values.map(Number).filter(Number.isFinite);

  if (nums.length < 2) return 0;

  const avg = average(nums);

  return Math.sqrt(
    nums.reduce((sum, value) => sum + (value - avg) ** 2, 0) /
      nums.length
  );
}

function getBookmakerSnapshots(game) {
  if (Array.isArray(game.bookmakers) && game.bookmakers.length) {
    return game.bookmakers;
  }

  // Backward compatibility with the first provider implementation.
  if (game.moneyline?.length) {
    return [
      {
        title: game.bookmaker?.title || "Market",
        moneyline: game.moneyline,
        spread: game.spread,
        total: game.total,
      },
    ];
  }

  return [];
}

export function analyzeGame(game) {
  const books = getBookmakerSnapshots(game);

  const homeProbabilities = [];
  const awayProbabilities = [];
  const spreadLines = [];
  const totals = [];
  const vigLevels = [];

  for (const book of books) {
    const moneyline = book.moneyline || [];

    const home = moneyline.find(
      (outcome) =>
        outcome.team === game.home.name ||
        outcome.abbr === game.home.abbr
    );

    const away = moneyline.find(
      (outcome) =>
        outcome.team === game.away.name ||
        outcome.abbr === game.away.abbr
    );

    if (home && away) {
      const fair = removeVig(home.price, away.price);

      if (fair) {
        homeProbabilities.push(fair.home);
        awayProbabilities.push(fair.away);
        vigLevels.push(fair.vig);
      }
    }

    const line =
      book.spread?.line ??
      book.spread ??
      null;

    if (Number.isFinite(Number(line))) {
      spreadLines.push(Number(line));
    }

    const total =
      book.total?.line ??
      book.total ??
      null;

    if (Number.isFinite(Number(total))) {
      totals.push(Number(total));
    }
  }

  let homeProbability = average(homeProbabilities);
  let awayProbability = average(awayProbabilities);

  // If only the normalized top-level market exists.
  if (homeProbability == null && game.moneyline?.length) {
    const home = game.moneyline.find(
      (x) => x.team === game.home.name
    );

    const away = game.moneyline.find(
      (x) => x.team === game.away.name
    );

    if (home && away) {
      const fair = removeVig(home.price, away.price);

      if (fair) {
        homeProbability = fair.home;
        awayProbability = fair.away;
      }
    }
  }

  const marketAvailable =
    homeProbability != null &&
    awayProbability != null;

  // Never fabricate a high-confidence prediction when market data is absent.
  if (!marketAvailable) {
    return {
      gameId: game.id,
      pick: null,
      confidence: 0,
      grade: "NO PICK",
      edge: 0,
      homeWinProbability: null,
      awayWinProbability: null,
      consensusBooks: books.length,
      marketAgreement: null,
      spreadConsensus: median(spreadLines),
      totalConsensus: median(totals) ?? game.total ?? null,
      summary:
        "Insufficient market data for a reliable Jedi prediction.",
      factors: [
        {
          label: "Market data",
          impact: "Insufficient",
        },
      ],
    };
  }

  const pick =
    homeProbability >= awayProbability
      ? game.home.abbr
      : game.away.abbr;

  const selectedProbability =
    Math.max(homeProbability, awayProbability);

  /*
   * Edge here means distance from a 50/50 matchup.
   * It is NOT yet a claim of sportsbook expected value.
   */
  const marketEdge =
    Math.abs(selectedProbability - 0.5) * 100;

  const disagreement =
    standardDeviation(homeProbabilities) * 100;

  const agreementScore =
    clamp(100 - disagreement * 5, 0, 100);

  const bookDepth =
    clamp(books.length / 8, 0, 1);

  /*
   * Confidence intentionally stays conservative.
   * Strong favorite probability raises it.
   * Bookmaker agreement and market depth reinforce it.
   */
  const confidence = Math.round(
    clamp(
      45 +
        marketEdge * 0.65 +
        agreementScore * 0.12 +
        bookDepth * 8,
      45,
      92
    )
  );

  let grade = "LEAN";

  if (confidence >= 82) grade = "STRONG";
  else if (confidence >= 72) grade = "PLAY";
  else if (confidence < 60) grade = "PASS";

  const totalConsensus =
    median(totals) ??
    game.total ??
    null;

  const spreadConsensus =
    median(spreadLines) ??
    game.spread?.line ??
    null;

  return {
    gameId: game.id,
    pick,
    confidence,
    grade,

    homeWinProbability:
      +(homeProbability * 100).toFixed(1),

    awayWinProbability:
      +(awayProbability * 100).toFixed(1),

    edge:
      +marketEdge.toFixed(1),

    consensusBooks: books.length,

    marketAgreement:
      +agreementScore.toFixed(1),

    averageVig:
      vigLevels.length
        ? +(average(vigLevels) * 100).toFixed(2)
        : null,

    spreadConsensus,

    totalConsensus,

    summary:
      `${pick} is the market-consensus side with ` +
      `${(selectedProbability * 100).toFixed(1)}% no-vig implied probability ` +
      `across ${books.length || 1} available sportsbook source(s).`,

    factors: [
      {
        label: "No-vig win probability",
        impact: `${(selectedProbability * 100).toFixed(1)}%`,
      },
      {
        label: "Sportsbook agreement",
        impact: `${agreementScore.toFixed(1)}%`,
      },
      {
        label: "Consensus spread",
        impact:
          spreadConsensus == null
            ? "N/A"
            : String(spreadConsensus),
      },
      {
        label: "Consensus total",
        impact:
          totalConsensus == null
            ? "N/A"
            : String(totalConsensus),
      },
      {
        label: "Books analyzed",
        impact: String(books.length || 1),
      },
    ],
  };
}

export function analyzeParlay(legs = []) {
  const valid = legs.filter(
    (leg) =>
      leg &&
      Number.isFinite(Number(leg.confidence)) &&
      Number(leg.confidence) > 0
  );

  if (!valid.length) {
    return {
      legs: 0,
      combinedConfidence: 0,
      risk: "N/A",
      message: "Add at least one qualified Jedi pick.",
    };
  }

  /*
   * Convert individual confidence estimates into a rough
   * joint probability rather than averaging the legs.
   */
  const jointProbability = valid.reduce(
    (probability, leg) =>
      probability * (Number(leg.confidence) / 100),
    1
  );

  const combined =
    clamp(jointProbability * 100, 1, 99);

  let risk = "Lower";

  if (valid.length >= 5 || combined < 25) {
    risk = "High";
  } else if (valid.length >= 3 || combined < 45) {
    risk = "Medium";
  }

  return {
    legs: valid.length,
    combinedConfidence: +combined.toFixed(1),
    risk,
    message:
      `${valid.length}-leg card has approximately ` +
      `${combined.toFixed(1)}% combined model probability before ` +
      `correlation and price adjustments.`,
  };
}
