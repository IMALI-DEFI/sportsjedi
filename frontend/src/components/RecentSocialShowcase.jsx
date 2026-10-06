import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Users } from "lucide-react";

const API = import.meta.env.VITE_IMALI_API_URL || "https://api.imali-defi.com";
const approvedPlatforms = new Set(["instagram", "threads", "facebook", "x", "youtube", "tiktok"]);
const goodPosts = (rows = []) => {
  const seen = new Set();
  return rows.filter((post) => {
    const media = post?.media_url || post?.image_url || post?.thumbnail_url;
    const caption = String(post?.caption || post?.text || "").trim();
    const platform = String(post?.platform || "").toLowerCase();
    if (!media || !post?.public_url || caption.length < 40 || !approvedPlatforms.has(platform)) return false;
    if (/logo|fallback|placeholder/i.test(media) || !/APPROVED_|premium_/i.test(media) || seen.has(media)) return false;
    seen.add(media);
    return true;
  }).slice(0, 6);
};

export default function RecentSocialShowcase() {
  const [posts, setPosts] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch(`${API}/api/public/social/recent?product=sports-jedi&limit=8`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        const rows = goodPosts(j?.data?.posts || j?.posts || j?.data || []);
        if (alive) setPosts(rows);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (posts.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % posts.length), 6500);
    return () => clearInterval(timer);
  }, [posts.length]);

  const post = posts.length ? posts[index % posts.length] : null;
  const rawMedia = post?.media_url || post?.image_url || post?.thumbnail_url;
  const media = rawMedia?.startsWith("/api/") ? `${API}${rawMedia}` : rawMedia;
  const isVideo = /video/i.test(post?.media_type || post?.type || "") || /\.mp4(?:$|\?)/i.test(media || "");

  return (
    <section className="social-showcase">
      <div className="section-head">
        <div>
          <span className="eyebrow">Latest from Sports Jedi</span>
          <h2>Recent social posts</h2>
          <p>Fresh picks, matchups, and market intelligence from our social channels.</p>
        </div>
      </div>

      {post && (
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
              <p>{post.caption || post.text}</p>
            </div>

            <div className="social-controls">
              <button aria-label="Previous post" onClick={() => setIndex((i) => (i - 1 + posts.length) % posts.length)}><ArrowLeft size={17} /></button>
              <button aria-label="Next post" onClick={() => setIndex((i) => (i + 1) % posts.length)}><ArrowRight size={17} /></button>
              <span>{index % posts.length + 1} / {posts.length}</span>
            </div>
          </div>
        </div>
      )}

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
