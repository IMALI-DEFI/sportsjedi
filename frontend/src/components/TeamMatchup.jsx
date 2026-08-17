export default function TeamMatchup({
  article,
  large = false,
}) {
  return (
    <section
      className={
        large
          ? "matchup-visual article-matchup"
          : "matchup-visual"
      }
      style={{
        backgroundImage: article.homeFanart
          ? `linear-gradient(rgba(5,9,15,.65), rgba(5,9,15,.94)), url(${article.homeFanart})`
          : undefined,
      }}
    >
      <div className="team-visual">
        {article.awayBadge && (
          <img
            src={article.awayBadge}
            alt={article.awayTeam}
            loading="lazy"
          />
        )}

        <strong>{article.awayTeam}</strong>
      </div>

      <span>AT</span>

      <div className="team-visual">
        {article.homeBadge && (
          <img
            src={article.homeBadge}
            alt={article.homeTeam}
            loading="lazy"
          />
        )}

        <strong>{article.homeTeam}</strong>
      </div>
    </section>
  );
}
