import {
  NavLink,
  Link,
} from "react-router-dom";

import {
  Menu,
  Sparkles,
  X,
} from "lucide-react";

import { useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="nav-wrap">
        <Link
          to="/"
          className="brand"
          onClick={() => setOpen(false)}
        >
          <img
            src="/sports-jedi-logo.webp"
            alt="Sports Jedi"
            className="brand-logo"
          />

          <div className="brand-copy">
            <strong>SPORTS JEDI</strong>
            <span>SPORTS INTELLIGENCE</span>
          </div>
        </Link>

        <nav
          className={
            open
              ? "nav-links open"
              : "nav-links"
          }
        >
          <NavLink
            to="/"
            end
            onClick={() => setOpen(false)}
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/picks"
            onClick={() => setOpen(false)}
          >
            Jedi Picks
          </NavLink>

          <NavLink
            to="/parlay"
            onClick={() => setOpen(false)}
          >
            Parlay Lab
          </NavLink>

          <NavLink
            to="/methodology"
            onClick={() => setOpen(false)}
          >
            Methodology
          </NavLink>

          <NavLink
            to="/pricing"
            onClick={() => setOpen(false)}
          >
            Pricing
          </NavLink>
        </nav>

        <div className="nav-actions">
          <span className="engine-pill">
            <Sparkles size={14} />
            Live Markets
          </span>

          <button
            className="menu-btn"
            onClick={() =>
              setOpen((value) => !value)
            }
            aria-label="Menu"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  );
}
