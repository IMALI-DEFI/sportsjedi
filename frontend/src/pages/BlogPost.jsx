import {
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  BarChart3,
  Clock,
} from "lucide-react";

import {
  Link,
  useParams,
} from "react-router-dom";

import { api, assetUrl } from "../lib/api";

export default function BlogPost() {
  const { slug } = useParams();

  const [article, setArticle] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setArticle(null);
    setError("");

    api
      .blogPost(slug)
      .then((data) => {
        setArticle(data);
        document.title =
          `${data.title} | Sports Jedi`;

        let meta = document.querySelector(
          'meta[name="description"]'
        );

        if (!meta) {
          meta = document.createElement("meta");
          meta.name = "description";
          document.head.appendChild(meta);
        }

        meta.content = data.description;
      })
      .catch((err) =>
        setError(err.message)
      );
  }, [slug]);

  if (error) {
    return (
      <main className="shell">
        <div className="error">{error}</div>

        <Link to="/blog" className="back">
          <ArrowLeft />
          Back to Jedi Insights
        </Link>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="shell">
        <div className="loading">
          Loading analysis…
        </div>
      </main>
    );
  }

  return (
    <main className="shell article-page">
      <Link to="/blog" className="back">
        <ArrowLeft />
        Back to Jedi Insights
      </Link>

      <article className="article-card">
        <div className="article-heading">
          <span className="eyebrow">
            {article.league} market analysis
          </span>

          <h1>{article.title}</h1>

          <p>{article.description}</p>

          <div className="article-meta">
            <span>
              <Clock size={15} />
              {new Date(
                article.gameTime
              ).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZone: "America/New_York",
                timeZoneName: "short",
              })}
            </span>

            <span>
              <BarChart3 size={15} />
              {article.booksAnalyzed} books analyzed
            </span>
          </div>
        </div>

        <img
          className="article-image"
          src={assetUrl(article.imageUrl)}
          alt={article.title}
        />

        <div className="article-body">
          {article.paragraphs.map(
            (paragraph, index) => (
              <p key={index}>
                {paragraph}
              </p>
            )
          )}

          <div className="article-signal">
            <span>Sports Jedi signal</span>
            <strong>{article.pick}</strong>

            <div>
              <b>
                {article.confidence}%
                <small>Confidence</small>
              </b>

              <b>
                {article.marketAgreement}%
                <small>Book agreement</small>
              </b>
            </div>
          </div>

          <div className="article-actions">
            <Link
              to="/picks"
              className="primary-btn"
            >
              View ranked signals
            </Link>

            <Link
              to="/pricing"
              className="secondary-btn"
            >
              See plans
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
