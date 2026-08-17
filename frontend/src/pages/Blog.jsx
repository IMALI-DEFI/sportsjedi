import {
  useEffect,
  useState,
} from "react";

import {
  ArrowRight,
  BookOpen,
} from "lucide-react";

import { Link } from "react-router-dom";
import { api, assetUrl } from "../lib/api";

export default function Blog() {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title =
      "Sports Picks & Market Analysis | Sports Jedi";

    api
      .blog()
      .then(setArticles)
      .catch((err) =>
        setError(err.message)
      )
      .finally(() =>
        setLoading(false)
      );
  }, []);

  return (
    <main className="shell blog-page">
      <section className="page-banner">
        <div>
          <span className="eyebrow">
            <BookOpen size={15} />
            Market intelligence
          </span>

          <h1>Jedi Insights</h1>

          <p>
            Daily sports picks supported by no-vig
            probability, sportsbook agreement and
            market consensus.
          </p>
        </div>

        <BookOpen size={68} />
      </section>

      {loading && (
        <div className="loading">
          Loading Sports Jedi analysis…
        </div>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {!loading &&
       !error &&
       articles.length === 0 && (
        <div className="loading">
          No articles are available yet.
        </div>
      )}

      <section className="blog-grid">
        {articles.map((article) => (
          <article
            className="blog-card"
            key={article.id}
          >
            <Link
              to={`/blog/${article.slug}`}
              className="blog-image"
            >
              <img
                src={assetUrl(article.imageUrl)}
                alt={article.title}
                loading="lazy"
              />
            </Link>

            <div className="blog-card-copy">
              <div className="blog-meta">
                <span>{article.league}</span>

                <time>
                  {new Date(
                    article.createdAt
                  ).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }
                  )}
                </time>
              </div>

              <h2>
                <Link
                  to={`/blog/${article.slug}`}
                >
                  {article.title}
                </Link>
              </h2>

              <p>{article.description}</p>

              <div className="blog-stats">
                <span>
                  {article.confidence}% confidence
                </span>

                <span>
                  {article.marketAgreement}% agreement
                </span>
              </div>

              <Link
                to={`/blog/${article.slug}`}
                className="read-link"
              >
                Read analysis
                <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
