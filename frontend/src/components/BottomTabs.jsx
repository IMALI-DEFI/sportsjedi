import { NavLink, useLocation } from "react-router-dom";
import { Home, Trophy, Layers, GraduationCap, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Phone-only app-style tab bar for every page except the home page,
// which keeps its own banner navigation. Hidden on wide screens (sj-simple.css).
export default function BottomTabs() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (pathname === "/") return null;
  const tabs = [
    ["/", "Home", Home, true],
    ["/picks", "Picks", Trophy],
    ["/parlay", "Parlay", Layers],
    ["/methodology", "Learn", GraduationCap],
    [user ? "/account" : "/login", user ? "Me" : "Sign in", UserRound],
  ];
  return (
    <>
      <div className="sj-tabs-spacer" aria-hidden="true" />
      <nav className="sj-tabs" aria-label="Main sections">
        {tabs.map(([to, label, Icon, end]) => (
          <NavLink key={label} to={to} end={!!end} className={({ isActive }) => (isActive ? "active" : "")}>
            <Icon size={22} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
