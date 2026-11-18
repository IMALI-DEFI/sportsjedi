import { Link, useLocation } from "react-router-dom";
const items=[["Home","/","⌂"],["Picks","/picks","🏆"],["Build Parlay","/parlay","◈"],["Games","/#featured-matchups","▦"],["Jedi Academy","/methodology","🎓"],["VIP","/pricing","♛"]];
export default function PremiumPageNav(){
 const {pathname}=useLocation();
 if(pathname==="/" || pathname.startsWith("/game/") || pathname.startsWith("/games/"))return null;
 return <div className="sj-premium-subnav" aria-label="Sports Jedi sections">
  <Link className="sj-premium-subnav-brand" to="/"><img src="/sports-jedi-logo.webp" alt="Sports Jedi"/><strong>SPORTS <em>JEDI</em></strong></Link>
  <nav>{items.map(([name,to,icon])=><Link key={name} to={to} className={(pathname===to?"selected ":"")+"sj-premium-nav-tile"}><span aria-hidden="true">{icon}</span><span>{name}</span></Link>)}</nav>
 </div>
}
