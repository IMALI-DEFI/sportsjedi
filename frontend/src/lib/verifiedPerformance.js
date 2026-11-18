/**
 * Grade a chronological, immutable prediction ledger, not current picks.
 * Records must have: id, publishedAt, eventStart, settledAt, result
 * (win|loss|push|void), oddsAmerican, stakeUnits, verified, source.
 * Never include predictions edited after event start or unverified settlements.
 */
export function calculateVerifiedPerformance(records = []) {
  const eligible = records.filter((r) =>
    r && r.verified === true && r.source && r.id &&
    ['win', 'loss', 'push', 'void'].includes(r.result) &&
    Number.isFinite(Date.parse(r.publishedAt)) &&
    Number.isFinite(Date.parse(r.eventStart)) &&
    Number.isFinite(Date.parse(r.settledAt)) &&
    Date.parse(r.publishedAt) < Date.parse(r.eventStart) &&
    Date.parse(r.settledAt) >= Date.parse(r.eventStart) &&
    Number.isFinite(r.stakeUnits) && r.stakeUnits > 0 &&
    Number.isFinite(r.oddsAmerican) &&
    (r.oddsAmerican <= -100 || r.oddsAmerican >= 100)
  );
  if (new Set(eligible.map((r) => r.id)).size !== eligible.length) {
    return null; // Duplicates require manual reconciliation
  }
  const decisions = eligible.filter((r) => r.result === 'win' || r.result === 'loss');
  if (!decisions.length) return null;
  const wins = decisions.filter((r) => r.result === 'win').length;
  const losses = decisions.length - wins;
  const netUnits = eligible.reduce((sum, r) => {
    if (r.result === 'win') {
      const multiplier = r.oddsAmerican > 0 ? r.oddsAmerican / 100 : 100 / Math.abs(r.oddsAmerican);
      return sum + r.stakeUnits * multiplier;
    }
    if (r.result === 'loss') return sum - r.stakeUnits;
    return sum;
  }, 0);
  const staked = decisions.reduce((sum, r) => sum + r.stakeUnits, 0);
  return {
    wins, losses, pushes: eligible.filter((r) => r.result === 'push').length,
    voids: eligible.filter((r) => r.result === 'void').length,
    sampleSize: decisions.length,
    winRate: (100 * wins / decisions.length).toFixed(1),
    netUnits: netUnits.toFixed(2),
    roi: (100 * netUnits / staked).toFixed(1),
    period: eligible.map((r) => r.settledAt.slice(0, 10)).sort().filter((v, i, a) => i === 0 || i === a.length - 1).join(' – ')
  };
}
