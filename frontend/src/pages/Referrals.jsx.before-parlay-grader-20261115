import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Link2, Users, DollarSign, Trophy, Share2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const IMALI_API =
  import.meta.env.VITE_IMALI_API_URL ||
  "https://api.imali-defi.com";

export default function Referrals() {
  const { user, getToken, loading } = useAuth();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function loadDashboard() {
    const token = getToken();
    if (!token) return;
    const r = await fetch(`${IMALI_API}/api/referrals/partner/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return;
    const j = await r.json();
    setData(j.data || null);
  }

  useEffect(() => {
    if (user) loadDashboard();
  }, [user]);

  async function enroll() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setNotice("");
    try {
      const r = await fetch(`${IMALI_API}/api/referrals/partner/enroll`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ display_name: "Sports Jedi Partner" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Unable to enroll");
      await loadDashboard();
      setNotice("Your Sports Jedi referral link is ready.");
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(false);
    }
  }

  const code = data?.partner?.referral_code || "";
  const referralLink = code
    ? `https://sportsjedi.com/login?mode=signup&ref=${encodeURIComponent(code)}`
    : "";

  async function copyLink() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setNotice("Referral link copied.");
  }

  return (
    <main className="shell referrals-page">
      <section className="page-banner referral-hero">
        <div>
          <span className="eyebrow">SPORTS JEDI PARTNER PROGRAM</span>
          <h1>
            Share Sports Jedi.
            <br />
            <em>Earn recurring commission.</em>
          </h1>
          <p>
            Refer sports fans and bettors to Sports Jedi and earn 25% recurring
            commission on eligible paid subscriptions for up to 12 months.
          </p>
        </div>
        <Trophy size={72} />
      </section>

      <section className="referral-benefits">
        <article className="account-card">
          <Link2 size={30} />
          <h2>Your tracked link</h2>
          <p>Every eligible signup from your Sports Jedi link stays tied to your partner account.</p>
        </article>
        <article className="account-card">
          <DollarSign size={30} />
          <h2>25% recurring</h2>
          <p>Earn commission on eligible paid Sports Jedi subscriptions for up to 12 months.</p>
        </article>
        <article className="account-card">
          <Users size={30} />
          <h2>Built for audiences</h2>
          <p>Ideal for sports creators, communities, analysts, podcasts and social pages.</p>
        </article>
      </section>

      {!loading && !user ? (
        <section className="referral-join-card">
          <span className="eyebrow">READY TO PARTNER?</span>
          <h2>Create or sign in to your Sports Jedi account</h2>
          <p>Your partner dashboard and tracked link will be created from your existing account.</p>
          <Link className="primary-btn" to="/login?mode=signup&next=/referrals">
            <Share2 size={18} />
            Join the Partner Program
          </Link>
        </section>
      ) : (
        <section className="referral-join-card">
          <span className="eyebrow">YOUR PARTNER DASHBOARD</span>
          {!data ? (
            <>
              <h2>Activate your referral link</h2>
              <p>One click creates your tracked Sports Jedi partner link.</p>
              <button className="primary-btn" disabled={busy} onClick={enroll}>
                {busy ? "Activating…" : "Activate Partner Link"}
              </button>
            </>
          ) : (
            <>
              <div className="referral-link-box">
                <div>
                  <small>YOUR SPORTS JEDI REFERRAL LINK</small>
                  <strong>{referralLink}</strong>
                </div>
                <button className="secondary-btn" onClick={copyLink}>
                  <Copy size={17} /> Copy
                </button>
              </div>
              <div className="referral-stats">
                <div><span>Clicks</span><strong>{data.metrics?.clicks || 0}</strong></div>
                <div><span>Signups</span><strong>{data.metrics?.signups || 0}</strong></div>
                <div><span>Paid</span><strong>{data.metrics?.paid_customers || 0}</strong></div>
                <div><span>Earned</span><strong>${Number(data.metrics?.commissions_earned || 0).toFixed(2)}</strong></div>
              </div>
            </>
          )}
          {notice && <p className="referral-notice">{notice}</p>}
        </section>
      )}

      <section className="referral-terms-note">
        <p>
          Commissions apply to eligible referred subscriptions and are subject
          to the partner-program terms, verification and hold period.
        </p>
      </section>
    </main>
  );
}
