import BottomTabs from "./components/BottomTabs";
import PageGuide from "./components/PageGuide";
import Account from "./pages/Account";
import Login from "./pages/Login";
import Starfield from "./components/Starfield";
import {
  BrowserRouter,
  Route,
  Routes,
  Link,
  Navigate,
} from "react-router-dom";

import Header from "./components/Header";
import MarketingTracker from "./components/MarketingTracker";
import SEO from "./components/SEO";
import Dashboard from "./pages/Dashboard";
import GameDetail from "./pages/GameDetail";
import Picks from "./pages/Picks";
import Parlay from "./pages/Parlay";
import Methodology from "./pages/Methodology";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Pricing from "./pages/Pricing";
import Success from "./pages/Success";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Referrals from "./pages/Referrals";
import SEOLanding from "./pages/SEOLanding";
import PainLanding from "./pages/PainLanding";
import Compare from "./pages/Compare";
import JediAnalytics from "./pages/JediAnalytics";
import Developers from "./pages/Developers";
import ParlayGrader from "./pages/ParlayGrader";

export default function App() {
  return (
    <BrowserRouter>
      <SEO />
      <MarketingTracker />
      <Starfield />
      <Header />
      <PageGuide />

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/picks" element={<Picks />} />
        <Route path="/analytics-lab" element={<JediAnalytics />} />
        <Route path="/parlay" element={<Parlay />} />
        <Route path="/parlay-grader" element={<ParlayGrader />} />
        <Route path="/game/:id" element={<GameDetail />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Navigate to="/login?mode=signup" replace />} />
          <Route path="/account" element={<Account />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/success" element={<Success />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/referrals" element={<Referrals />} />
        <Route path="/developers" element={<Developers />} />
        <Route path="/ai-sports-picks" element={<SEOLanding />} />
        <Route path="/sports-betting-analytics" element={<SEOLanding />} />
        <Route path="/parlay-analysis" element={<SEOLanding />} />
        <Route path="/player-prop-analysis" element={<SEOLanding />} />
        <Route path="/lost-by-one-leg" element={<PainLanding />} />
        <Route path="/too-many-tabs" element={<PainLanding />} />
        <Route path="/real-odds" element={<PainLanding />} />
        <Route path="/compare/oddsjam" element={<Compare />} />
        <Route path="/compare/rithmm" element={<Compare />} />
        <Route path="/compare/action-network" element={<Compare />} />
      </Routes>

      <footer>
        <div className="footer-brand">
          <img
            src="/sports-jedi-logo.webp"
            alt="Sports Jedi"
          />

          <div>
            <b>SPORTS JEDI</b>
            <span>
              Sports market intelligence, simplified.
            </span>
          </div>
        </div>

        <div className="footer-links">
          <Link to="/blog">Insights</Link>
          <Link to="/methodology">Methodology</Link>
          <Link to="/analytics-lab">Analytics Lab</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/parlay-grader">Parlay Grader</Link>
          <Link to="/referrals">Partner Program</Link>
          <Link to="/developers">API for Developers</Link>
        </div>

        <p className="footer-disclaimer">
          Sports Jedi provides informational analytics and probability
          estimates. No prediction or sporting outcome is guaranteed.
        </p>
      </footer>
      <BottomTabs />
    </BrowserRouter>
  );
}
