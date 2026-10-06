import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Users } from "lucide-react";

const API = import.meta.env.VITE_IMALI_API_URL || "https://api.imali-defi.com";
const fallback = [
  { id: "sj-1", title: "Latest from Sports Jedi", caption: "Fresh matchup signals, market insights, and daily sports content.", media_url: "/sports-jedi-logo.webp" },
  { id: "sj-2", title: "Jedi Picks & Parlays", caption: "Follow the latest Sports Jedi picks, confidence signals, and parlay content.", media_url: "/sports-jedi-logo.webp" },
];

export default function RecentSocialShowcase() {
  const [posts, setPosts] = useState(fallback);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch(`${API}/api/public/social/recent?product=sports-jedi&limit=8`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        const rows = j?.data?.posts || j?.posts || j?.data;
        if (alive && Array.isArray(rows) && rows.length) setPosts(rows);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (posts.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % posts.length), 6500);
    return () => clearInterval(timer);
  }, [posts.length]);

  const post = posts[index % posts.length] || fallback[0];
  const media = post.media_url || post.image_url || post.thumbnail_url;
  const isVideo = /video/i.test(post.media_type || post.type || "") || /\.mp4(?:$|\?)/i.test(media || "");

  return (
    <section className="social-showcase">
      <div className="section-head">
        <div>
          <span className="eyebrow">Latest from Sports Jedi</span>
          <h2>Recent social posts</h2>
          <p>Fresh picks, matchups, and market intelligence from our social channels.</p>
        </div>
      </div>

      <div className="social-slide">
        <div className="social-media">
          {media && (isVideo ? (
            <video src={media} controls playsInline preload="metadata" />
          ) : (
            <img src={media} alt={post.title || "Sports Jedi social post"} />
          ))}
        </div>

        <div className="social-copy">
          <div>
            <span className="eyebrow">{post.platform || "SPORTS JEDI SOCIAL"}</span>
            <h3>{post.title || post.topic || "Latest Sports Jedi update"}</h3>
            <p>{post.caption || post.text || "Follow Sports Jedi for the latest updates."}</p>
          </div>

          <div className="social-controls">
            <button aria-label="Previous post" onClick={() => setIndex((i) => (i - 1 + posts.length) % posts.length)}><ArrowLeft size={17} /></button>
            <button aria-label="Next post" onClick={() => setIndex((i) => (i + 1) % posts.length)}><ArrowRight size={17} /></button>
            <span>{index % posts.length + 1} / {posts.length}</span>
          </div>
        </div>
      </div>

      <div className="home-referral-banner">
        <div>
          <span className="eyebrow">SPORTS JEDI PARTNER PROGRAM</span>
          <h3>Share Sports Jedi. Earn recurring commission.</h3>
          <p>Earn 25% recurring commission on eligible paid subscriptions for up to 12 months.</p>
        </div>
        <Link className="primary-btn" to="/referrals"><Users size={18} /> Join the Partner Program</Link>
      </div>
    </section>
  );
}
