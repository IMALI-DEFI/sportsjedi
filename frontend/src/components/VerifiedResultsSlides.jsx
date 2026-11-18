import { Link } from 'react-router-dom';
import { calculateVerifiedPerformance } from '../lib/verifiedPerformance';

/** Display only independently settled and validated past picks. */
export default function VerifiedResultsSlides({ records = [] }) {
  const stats = calculateVerifiedPerformance(records);
  if (!stats) return null;
  const cards = [
    { label: 'WIN RATE', value: stats.winRate + '%', description: stats.wins + ' wins / ' + stats.losses + ' losses', accent: '#0f766e' },
    { label: 'NET UNITS', value: (Number(stats.netUnits) > 0 ? '+' : '') + stats.netUnits, description: 'At recorded odds and stakes', accent: '#4f46e5' },
    { label: 'RETURN ON STAKES', value: stats.roi + '%', description: 'Includes losses; excludes pushes and voids', accent: '#c2410c' },
    { label: 'GRADED PICKS', value: String(stats.sampleSize), description: 'Verified settled decisions', accent: '#a21caf' }
  ];
  return (
    <section aria-label="Verified Sports Jedi prediction results" style={{ background: '#fafafa', color: '#101827', padding: '3rem 1rem' }}>
      <div style={{ maxWidth: 1100, margin: 'auto' }}>
        <p style={{ fontSize: 12, fontWeight: 900, letterSpacing: 3 }}>SPORTS JEDI / VERIFIED RESULTS</p>
        <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', margin: '0.5rem 0 1rem' }}>Every pick has a result.</h2>
        <div style={{ display: 'flex', overflowX: 'auto', gap: 18, padding: '1rem 0 2rem', scrollSnapType: 'x mandatory' }}>
          {cards.map((card, index) => (
            <article key={card.label} style={{ flex: '0 0 min(80vw, 310px)', scrollSnapAlign: 'start', minHeight: 300, padding: 28, background: '#fff',
              border: '1px solid #e5e7eb', borderRadius: index % 2 ? 30 : 8, boxShadow: '0 10px 30px #00000012',
              transform: 'rotate(' + (index % 2 ? '1deg' : '-1deg') + ')' }}>
              <p style={{ letterSpacing: 2, fontWeight: 900, fontSize: 12 }}>{card.label}</p>
              <strong style={{ display: 'block', margin: '2rem 0', color: card.accent, fontSize: 'clamp(3.5rem, 6vw, 5rem)', lineHeight: 1.1 }}>{card.value}</strong>
              <p style={{ fontWeight: 700 }}>{card.description}</p>
              <small>Period: {stats.period} · Sample: {stats.sampleSize}</small>
            </article>
          ))}
        </div>
        <p style={{ fontSize: 13, color: '#475569', maxWidth: 730 }}>Historical recorded predictions, not guaranteed future results. Win rate alone does not indicate profitability. Figures exclude betting fees and taxes.</p>
        <Link to="/pricing" style={{ display: 'inline-block', padding: '1rem 1.5rem', marginTop: 12, background: '#111827', color: '#fff', borderRadius: 24, fontWeight: 800, textDecoration: 'none' }}>See today's Sports Jedi picks →</Link>
      </div>
    </section>
  );
}
