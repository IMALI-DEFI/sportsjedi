/**
 * Sports Jedi — Parlay Grader engine
 * Pure, dependency-free ES module. Safe to use on the frontend or in the API.
 *
 * Leg shape:
 *   {
 *     id?:        string,
 *     game:       string,   // e.g. "LAL @ BOS" — used to detect same-game legs
 *     market:     'moneyline' | 'spread' | 'total' | 'prop',
 *     selection:  string,   // e.g. "Lakers ML", "Over 221.5", "Tatum O 27.5 pts"
 *     odds:       number,   // American odds, e.g. -110, +145
 *     modelProb?: number,   // optional 0–1 win prob from the Sports Jedi model
 *   }
 *
 * Exports are additive; nothing here changes existing modules.
 */

// Typical bookmaker hold per market, used to strip vig when no model prob is given.
export const MARKET_HOLD = {
  moneyline: 0.04,
  spread: 0.045,
  total: 0.045,
  prop: 0.08,
};

export const LONG_SHOT_ODDS = 250;   // +250 or longer
export const HEAVY_CHALK_ODDS = -300; // -300 or shorter

export function americanToDecimal(odds) {
  const o = Number(odds);
  if (!Number.isFinite(o) || o === 0 || (o > -100 && o < 100)) {
    throw new Error(`Invalid American odds: ${odds}`);
  }
  return o > 0 ? 1 + o / 100 : 1 + 100 / Math.abs(o);
}

export function decimalToAmerican(dec) {
  if (dec >= 2) return Math.round((dec - 1) * 100);
  return Math.round(-100 / (dec - 1));
}

export function impliedProb(odds) {
  return 1 / americanToDecimal(odds);
}

/** Fair (no-vig) probability for a leg. Model prob wins if supplied. */
export function fairProb(leg) {
  if (typeof leg.modelProb === 'number' && leg.modelProb > 0 && leg.modelProb < 1) {
    return leg.modelProb;
  }
  const hold = MARKET_HOLD[leg.market] ?? 0.05;
  return Math.min(0.99, impliedProb(leg.odds) / (1 + hold));
}

const fmtPct = (p) => `${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`;
const fmtOdds = (o) => (o > 0 ? `+${o}` : `${o}`);
const norm = (s = '') => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** Find legs that can't both win, or that are suspiciously linked. */
export function findConflicts(legs) {
  const conflicts = [];
  const sameGame = {};
  legs.forEach((leg, i) => {
    const key = norm(leg.game);
    if (!key) return;
    (sameGame[key] ||= []).push(i);
  });

  for (const idxs of Object.values(sameGame)) {
    const game = legs[idxs[0]].game.trim();
    if (idxs.length < 2) continue;
    const group = idxs.map((i) => legs[i]);

    const ml = group.filter((l) => l.market === 'moneyline');
    if (ml.length > 1 && new Set(ml.map((l) => norm(l.selection))).size > 1) {
      conflicts.push({ type: 'contradiction', game, message: `Both sides of the moneyline in ${game}: one leg is guaranteed to lose.` });
    }
    const totals = group.filter((l) => l.market === 'total');
    const hasOver = totals.some((l) => /\bover\b|^o\s?\d/i.test(l.selection));
    const hasUnder = totals.some((l) => /\bunder\b|^u\s?\d/i.test(l.selection));
    if (hasOver && hasUnder) {
      conflicts.push({ type: 'contradiction', game, message: `Over and Under in ${game}: these legs work against each other.` });
    }
    const dupes = group.length - new Set(group.map((l) => norm(l.selection))).size;
    if (dupes > 0) {
      conflicts.push({ type: 'duplicate', game, message: `Duplicate leg in ${game}.` });
    }
    conflicts.push({ type: 'same_game', game, count: idxs.length, message: `${idxs.length} legs from ${game}: outcomes are linked, so the hit chance is less reliable than it looks.` });
  }
  return conflicts;
}

function legCountScore(n) {
  if (n <= 3) return 15;
  return [15, 15, 15, 15, 11, 7, 4][n] ?? 0;
}

function letterFor(score) {
  if (score >= 85) return 'A';
  if (score >= 72) return 'B';
  if (score >= 58) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

/** Core math + score, no suggestions (used for "what if you cut a leg"). */
function scoreParlay(legs) {
  const enriched = legs.map((leg, i) => {
    const dec = americanToDecimal(leg.odds);
    const p = fairProb(leg);
    return {
      ...leg,
      id: leg.id ?? `leg-${i + 1}`,
      decimal: dec,
      impliedProb: 1 / dec,
      fairProb: p,
      edge: p * dec - 1,
      isLongShot: leg.odds >= LONG_SHOT_ODDS,
      isHeavyChalk: leg.odds <= HEAVY_CHALK_ODDS,
    };
  });

  const payoutDecimal = enriched.reduce((a, l) => a * l.decimal, 1);
  const hitProb = enriched.reduce((a, l) => a * l.fairProb, 1);
  const ev = hitProb * payoutDecimal - 1;
  const conflicts = findConflicts(enriched);

  // 40 pts — value (expected return per $1)
  const valuePts = Math.max(0, Math.min(40, ((ev + 0.3) / 0.35) * 40));
  // 25 pts — realistic chance to cash
  const hitPts = Math.min(25, (25 * hitProb) / 0.25);
  // 15 pts — leg count
  const legPts = legCountScore(enriched.length);
  // 20 pts — structure
  let structurePts = 20;
  structurePts -= 5 * enriched.filter((l) => l.isLongShot).length;
  structurePts -= 4 * enriched.filter((l) => l.isHeavyChalk).length;
  for (const c of conflicts) {
    if (c.type === 'contradiction') structurePts -= 20;
    else if (c.type === 'duplicate') structurePts -= 8;
    else if (c.type === 'same_game') structurePts -= 3 * (c.count - 1);
  }
  structurePts = Math.max(0, structurePts);

  let score = Math.round(valuePts + hitPts + legPts + structurePts);
  if (conflicts.some((c) => c.type === 'contradiction')) score = Math.min(score, 30);

  return {
    legs: enriched,
    payoutDecimal,
    payoutAmerican: decimalToAmerican(payoutDecimal),
    hitProb,
    bookImpliedProb: 1 / payoutDecimal,
    ev,
    houseEdge: -ev,
    conflicts,
    score,
    grade: letterFor(score),
    breakdown: {
      value: Math.round(valuePts),
      hitChance: Math.round(hitPts),
      legCount: legPts,
      structure: structurePts,
    },
  };
}

function buildSuggestions(result, legs) {
  const out = [];
  const n = result.legs.length;

  // 1) Best leg to cut ("which leg would you cut?")
  if (n >= 3) {
    let best = null;
    legs.forEach((_, i) => {
      const without = scoreParlay(legs.filter((__, j) => j !== i));
      if (!best || without.score > best.result.score) best = { i, result: without };
    });
    if (best && best.result.score > result.score) {
      const leg = result.legs[best.i];
      out.push({
        type: 'cut_leg',
        priority: 1,
        legId: leg.id,
        title: `Cut "${leg.selection}"`,
        detail: `Grade ${result.grade} → ${best.result.grade}. Hit chance ${fmtPct(result.hitProb)} → ${fmtPct(best.result.hitProb)}; payout ${fmtOdds(result.payoutAmerican)} → ${fmtOdds(best.result.payoutAmerican)}.`,
      });
    }
  }

  // 2) Contradictions / same game
  for (const c of result.conflicts) {
    out.push({
      type: c.type,
      priority: c.type === 'contradiction' ? 0 : 3,
      title: c.type === 'contradiction' ? 'Conflicting legs' : c.type === 'duplicate' ? 'Duplicate leg' : 'Same-game legs',
      detail: c.message,
    });
  }

  // 3) Heavy chalk adds risk for little payout
  for (const l of result.legs.filter((x) => x.isHeavyChalk)) {
    const boost = ((l.decimal - 1) * 100).toFixed(0);
    out.push({
      type: 'heavy_chalk',
      priority: 2,
      legId: l.id,
      title: `"${l.selection}" (${fmtOdds(l.odds)}) is dead weight`,
      detail: `It only grows your payout by ${boost}% but still loses about ${fmtPct(1 - l.fairProb)} of the time. Bet it straight or drop it.`,
    });
  }

  // 4) Long shots
  const longShots = result.legs.filter((x) => x.isLongShot);
  if (longShots.length > 1) {
    out.push({
      type: 'long_shots',
      priority: 2,
      title: `${longShots.length} long shots stacked`,
      detail: `Each one alone hits under ${fmtPct(Math.max(...longShots.map((l) => l.fairProb)))}. Keep at most one long shot per parlay.`,
    });
  }

  // 5) Too many legs
  if (n >= 5) {
    out.push({
      type: 'leg_count',
      priority: 2,
      title: `${n} legs is a lottery ticket`,
      detail: `This hits about 1 in ${Math.round(1 / result.hitProb)} times. 2–4 legs keep the grade up.`,
    });
  }

  // 6) Vig compounding
  if (result.houseEdge > 0.15) {
    out.push({
      type: 'vig',
      priority: 4,
      title: 'The house edge compounds',
      detail: `Estimated house edge on this ticket: ${fmtPct(result.houseEdge)}, vs roughly 4–5% on a single straight bet.`,
    });
  }

  // 7) Model-backed value legs
  const valueLegs = result.legs.filter((l) => typeof l.modelProb === 'number' && l.edge > 0.03);
  if (valueLegs.length) {
    out.push({
      type: 'value',
      priority: 3,
      title: 'Value spotted',
      detail: `Sports Jedi's model likes: ${valueLegs.map((l) => `"${l.selection}" (+${fmtPct(l.edge)} edge)`).join(', ')}.`,
    });
  }

  if (!out.length) {
    out.push({ type: 'solid', priority: 5, title: 'Solid build', detail: 'No red flags. Keep the stake small; parlays are high variance.' });
  }
  return out.sort((a, b) => a.priority - b.priority);
}

/**
 * Grade a parlay.
 * @param {Array} legs
 * @returns full result with suggestions
 */
export function gradeParlay(legs) {
  if (!Array.isArray(legs) || legs.length < 2) {
    throw new Error('A parlay needs at least 2 legs.');
  }
  if (legs.length > 12) throw new Error('Max 12 legs.');
  const result = scoreParlay(legs);
  return { ...result, suggestions: buildSuggestions(result, legs), gradedAt: new Date().toISOString() };
}

/**
 * Trim a result to what a user's plan allows.
 * Free: letter grade, score, hit chance, payout, + count of locked tips.
 * Paid (or premium credit): everything.
 * Do this on the server once the API serves the grader, so paid data never reaches free clients.
 */
export function forTier(result, { isPaid = false, premiumCredits = 0 } = {}) {
  if (isPaid || premiumCredits > 0) return { ...result, tier: 'full', usedCredit: !isPaid };
  return {
    tier: 'free',
    grade: result.grade,
    score: result.score,
    hitProb: result.hitProb,
    payoutAmerican: result.payoutAmerican,
    legs: result.legs.map(({ id, selection, odds, game, market }) => ({ id, selection, odds, game, market })),
    lockedSuggestions: result.suggestions.length,
    teaser: result.suggestions[0]?.title ?? null,
    gradedAt: result.gradedAt,
  };
}

export default gradeParlay;
