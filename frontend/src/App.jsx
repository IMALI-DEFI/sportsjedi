import {
  BrowserRouter,
  Route,
  Routes,
  Link,
} from "react-router-dom";

import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import GameDetail from "./pages/GameDetail";
import Picks from "./pages/Picks";
import Parlay from "./pages/Parlay";
import Methodology from "./pages/Methodology";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";

export default function App() {
  return (
    <BrowserRouter>
      <Header />

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/picks" element={<Picks />} />
        <Route path="/parlay" element={<Parlay />} />
        <Route path="/game/:id" element={<GameDetail />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
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
          <Link to="/methodology">Methodology</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
        </div>

        <p className="footer-disclaimer">
          Sports Jedi provides informational analytics and probability
          estimates. No prediction or sporting outcome is guaranteed.
        </p>
      </footer>
    </BrowserRouter>
  );
}
