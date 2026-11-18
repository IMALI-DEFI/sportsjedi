import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, Check, Copy, KeyRound, Trash2, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import "./Developers.css";

const DOCS_URL = "https://api.sportsjedi.com/v1/docs";
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const when = (v) => (v ? new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

function PlanCards({ plans, current, onUpgrade, busyPlan, loggedIn }) {
  return (
    <div className="dev-plans">
      {plans.map((plan) => {
        const isCurrent = current === plan.id;
        return (
          <article key={plan.id} className={`dev-plan${isCurrent ? " is-current" : ""}${plan.id === "starter" ? " is-featured" : ""}`}>
            <h3>{plan.name}</h3>
            <p className="dev-price">{plan.price}</p>
            <ul>
              <li><Check size={16} /> {fmt(plan.requestsPerDay)} requests / day</li>
              <li><Check size={16} /> {fmt(plan.requestsPerMinute)} requests / minute</li>
              <li><Check size={16} /> Up to {plan.maxKeys} keys</li>
              <li><Check size={16} /> Picks, win probabilities, parlay scoring</li>
            </ul>
            {isCurrent ? (
              <span className="dev-badge">Your plan</span>
            ) : plan.id === "free" ? null : !loggedIn ? (
              <Link className="dev-btn ghost" to="/login?next=/developers">Sign in to upgrade</Link>
            ) : plan.purchasable ? (
              <button className="dev-btn" onClick={() => onUpgrade(plan.id)} disabled={busyPlan === plan.id}>
                {busyPlan === plan.id ? "Opening checkout…" : `Upgrade to ${plan.name}`}
              </button>
            ) : (
              <span className="dev-badge muted">Coming soon</span>
            )}
          </article>
        );
      })}
    </div>
  );
}

export default function Developers() {
  const { user, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState("");

  const loadAccount = useCallback(async () => {
    try {
      setAccount(await api.developerAccount());
    } catch (e) {
      setError(e.message || "Couldn't load your developer account.");
    }
  }, []);

  useEffect(() => {
    api.developerPlans().then(setPlans).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) loadAccount();
  }, [user, loadAccount]);

  // Back from Stripe Checkout: activate the plan.
  useEffect(() => {
    const sessionId = params.get("session_id");
    if (!sessionId || !user) return;
    (async () => {
      try {
        const result = await api.apiCheckoutConfirm(sessionId);
        setNotice(`You're on the ${result.plan} plan. Your existing keys already have the new limits.`);
        await loadAccount();
      } catch (e) {
        setError(e.message || "We couldn't confirm the payment yet. Refresh in a minute.");
      } finally {
        params.delete("session_id");
        setParams(params, { replace: true });
      }
    })();
  }, [params, setParams, user, loadAccount]);

  async function createKey(event) {
    event.preventDefault();
    setError("");
    setBusy("create");
    try {
      const created = await api.createApiKey(keyName.trim() || "default");
      setNewKey(created);
      setCopied(false);
      setKeyName("");
      await loadAccount();
    } catch (e) {
      setError(e.message || "Couldn't create a key.");
    } finally {
      setBusy("");
    }
  }

  async function revokeKey(key) {
    if (!window.confirm(`Revoke "${key.name}" (${key.prefix}…)? Apps using it stop working immediately.`)) return;
    setError("");
    try {
      await api.revokeApiKey(key.id);
      if (newKey?.id === key.id) setNewKey(null);
      await loadAccount();
    } catch (e) {
      setError(e.message || "Couldn't revoke the key.");
    }
  }

  async function upgrade(planId) {
    setError("");
    setBusy(planId);
    try {
      const { url } = await api.apiCheckout(planId);
      window.location.href = url;
    } catch (e) {
      setError(e.message || "Checkout is unavailable right now.");
      setBusy("");
    }
  }

  async function manageBilling() {
    try {
      const { url } = await api.apiBillingPortal();
      window.location.href = url;
    } catch (e) {
      setError(e.message || "Billing portal unavailable.");
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(newKey.key);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const activeKeys = account?.keys?.filter((k) => k.status === "active") || [];
  const usedPct = account ? Math.min(100, Math.round((account.usedToday / account.limits.requestsPerDay) * 100)) : 0;

  return (
    <main className="shell dev-page">
      <section className="dev-hero">
        <div className="eyebrow">Sports Jedi API</div>
        <h1>Put Sports Jedi picks in your app.</h1>
        <p>
          Confidence-ranked picks, win probabilities and parlay scoring for NFL, college football, NBA and MLB,
          as simple JSON. Start free, upgrade when you grow.
        </p>
        <div className="dev-actions">
          {user ? (
            <a className="dev-btn" href="#keys"><KeyRound size={18} /> Your API keys</a>
          ) : (
            <Link className="dev-btn" to="/login?next=/developers"><KeyRound size={18} /> Get a free API key</Link>
          )}
          <a className="dev-btn ghost" href={DOCS_URL} target="_blank" rel="noreferrer"><BookOpen size={18} /> Read the docs</a>
        </div>
      </section>

      {notice && <p className="dev-alert ok">{notice}</p>}
      {error && <p className="dev-alert">{error}</p>}

      {user && !loading && account && (
        <section className="dev-panel" id="keys">
          <div className="dev-panel-head">
            <div>
              <div className="eyebrow">Your plan</div>
              <h2>{account.plan[0].toUpperCase() + account.plan.slice(1)}</h2>
            </div>
            {account.hasSubscription && (
              <button className="dev-btn ghost small" onClick={manageBilling}>Manage billing</button>
            )}
          </div>

          <div className="dev-usage">
            <div className="dev-usage-label">
              <span>Today</span>
              <span>{fmt(account.usedToday)} / {fmt(account.limits.requestsPerDay)} requests</span>
            </div>
            <div className="dev-meter"><span style={{ width: `${usedPct}%` }} /></div>
            <p className="dev-muted">Resets at midnight UTC · {fmt(account.limits.requestsPerMinute)} requests per minute</p>
          </div>

          {newKey && (
            <div className="dev-newkey">
              <p><b>Your new key.</b> Copy it now. For your security it won't be shown again.</p>
              <div className="dev-keybox">
                <code>{newKey.key}</code>
                <button className="dev-btn small" onClick={copyKey}>{copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}</button>
              </div>
            </div>
          )}

          <h3>API keys ({activeKeys.length} of {account.limits.maxKeys})</h3>
          {account.keys.length === 0 ? (
            <p className="dev-muted">No keys yet. Create one below.</p>
          ) : (
            <div className="dev-keys">
              {account.keys.map((key) => (
                <div key={key.id} className={`dev-key${key.status !== "active" ? " is-revoked" : ""}`}>
                  <div>
                    <b>{key.name}</b> <code>{key.prefix}…</code>
                    <div className="dev-muted">
                      Created {when(key.created_at)} · Last used {when(key.last_used_at)}
                      {key.status !== "active" && " · Revoked"}
                    </div>
                  </div>
                  {key.status === "active" && (
                    <button className="dev-icon" onClick={() => revokeKey(key)} aria-label={`Revoke ${key.name}`}>
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <form className="dev-create" onSubmit={createKey}>
            <input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Key name, e.g. my-app"
              maxLength={40}
              aria-label="Key name"
            />
            <button className="dev-btn" disabled={busy === "create" || activeKeys.length >= account.limits.maxKeys}>
              <KeyRound size={18} /> {busy === "create" ? "Creating…" : "Create key"}
            </button>
          </form>
        </section>
      )}

      <section>
        <h2 className="dev-h2"><Zap size={22} /> Plans</h2>
        <PlanCards plans={plans} current={account?.plan} onUpgrade={upgrade} busyPlan={busy} loggedIn={Boolean(user)} />
      </section>

      <section className="dev-panel">
        <h2>Quick start</h2>
        <pre className="dev-code">{`curl https://api.sportsjedi.com/v1/picks?league=NFL \\
  -H "X-API-Key: sj_live_your_key_here"`}</pre>
        <p className="dev-muted">
          Keep keys on your server. Full endpoint reference, examples in JavaScript and Python, and error codes are in the{" "}
          <a href={DOCS_URL} target="_blank" rel="noreferrer">API docs</a>.
        </p>
      </section>

      <p className="dev-muted dev-terms">
        Picks and probabilities are model estimates for information and entertainment, not guarantees or betting advice.
        If you show them to people, say so and follow the gambling laws where your users are.
      </p>
    </main>
  );
}
