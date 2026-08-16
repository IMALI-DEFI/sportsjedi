import {
  CheckCircle2,
  Crown,
} from "lucide-react";

import { Link } from "react-router-dom";

export default function Success() {
  return (
    <main className="shell success-page">
      <section className="success-card">
        <CheckCircle2 size={70} />

        <span className="eyebrow">
          <Crown size={14} />
          Sports Jedi Pro
        </span>

        <h1>You&apos;re in.</h1>

        <p>
          Your Sports Jedi Pro
          subscription checkout was
          completed.
        </p>

        <Link
          className="primary-btn"
          to="/picks"
        >
          Open Jedi Picks
        </Link>
      </section>
    </main>
  );
}
