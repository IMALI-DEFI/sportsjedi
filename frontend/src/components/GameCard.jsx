import {approvedMatchups} from "../lib/approvedMatchups";
import {artFor} from "../lib/sportsArt";
import {Link} from "react-router-dom";
import {useState,useEffect} from "react";
import {Clock,ChevronRight} from "lucide-react";
const arenaFor=league=>({NFL:"nfl",NBA:"nba",MLB:"mlb",NCAAF:"ncaaf",CFB:"ncaaf"})[league]||"nfl";
const when=s=>{const d=new Date(s);return Number.isNaN(d.getTime())?"Time TBA":new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit",timeZone:"America/New_York",timeZoneName:"short"}).format(d)};
const nflLogoCodes={ "arizona cardinals":"ari","atlanta falcons":"atl","baltimore ravens":"bal","buffalo bills":"buf","carolina panthers":"car","chicago bears":"chi","cincinnati bengals":"cin","cleveland browns":"cle","dallas cowboys":"dal","denver broncos":"den","detroit lions":"det","green bay packers":"gb","houston texans":"hou","indianapolis colts":"ind","jacksonville jaguars":"jax","kansas city chiefs":"kc","las vegas raiders":"lv","los angeles chargers":"lac","los angeles rams":"lar","miami dolphins":"mia","minnesota vikings":"min","new england patriots":"ne","new orleans saints":"no","new york giants":"nyg","new york jets":"nyj","philadelphia eagles":"phi","pittsburgh steelers":"pit","san francisco 49ers":"sf","seattle seahawks":"sea","tampa bay buccaneers":"tb","tennessee titans":"ten","washington commanders":"wsh" };
const nbaLogoCodes={"atlanta hawks":"atl","boston celtics":"bos","brooklyn nets":"bkn","charlotte hornets":"cha","chicago bulls":"chi","cleveland cavaliers":"cle","dallas mavericks":"dal","denver nuggets":"den","detroit pistons":"det","golden state warriors":"gs","houston rockets":"hou","indiana pacers":"ind","los angeles clippers":"lac","los angeles lakers":"lal","memphis grizzlies":"mem","miami heat":"mia","milwaukee bucks":"mil","minnesota timberwolves":"min","new orleans pelicans":"no","new york knicks":"ny","oklahoma city thunder":"okc","orlando magic":"orl","philadelphia 76ers":"phi","phoenix suns":"phx","portland trail blazers":"por","sacramento kings":"sac","san antonio spurs":"sa","toronto raptors":"tor","utah jazz":"utah","washington wizards":"wsh"};
const collegeLogoIds={"appalachian state mountaineers":"2026","georgia southern eagles":"290","washington state cougars":"265","san diego state aztecs":"21","michigan wolverines":"130","ohio state buckeyes":"194","alabama crimson tide":"333","georgia bulldogs":"61","syracuse orange":"183","smu mustangs":"2567","california golden bears":"25","nc state wolfpack":"152"};
function authenticLogo(league,name){
 const key=String(name||"").toLowerCase().trim();
 if(league==="NFL"&&nflLogoCodes[key])return "https://a.espncdn.com/i/teamlogos/nfl/500/"+nflLogoCodes[key]+".png";
 if(league==="NBA"&&nbaLogoCodes[key])return "https://a.espncdn.com/i/teamlogos/nba/500/"+nbaLogoCodes[key]+".png";
 if(["NCAAF","CFB"].includes(league)&&collegeLogoIds[key])return "https://a.espncdn.com/i/teamlogos/ncaa/500/"+collegeLogoIds[key]+".png";
 return null;
}
function Team({team,league}) {
 const name=team?.name||team?.abbr||"Team";
 const asset=team?.licensedHelmetUrl||team?.approvedHelmetUrl||team?.licensedLogoUrl||team?.approvedLogoUrl||authenticLogo(league,name)||team?.helmetUrl||team?.logoUrl||team?.logo||artFor(league,name);
 const portrait=team?.licensedPlayerImageUrl||team?.approvedPlayerImageUrl||team?.playerImageUrl||null;
 const football=["NFL","NCAAF","CFB"].includes(league);
 const [failed,setFailed]=useState(false);
 const fallback=artFor(league,name);
 useEffect(()=>setFailed(false),[asset,portrait]);
 return <div className="sj-match-team">
   <div className={`sj-team-art ${football?"sj-team-art-helmet":"sj-team-art-player"}`}>
     {!failed && (portrait || asset) ? <img src={portrait || asset} onError={e=>{if(fallback&&e.currentTarget.src!==new URL(fallback,window.location.origin).href){e.currentTarget.src=fallback}else{setFailed(true)}}} alt={name+" team artwork"} loading="lazy"/> :
       <span className="sj-team-clean-fallback">{name}</span>}
   </div>
   <strong>{name}</strong>
 </div>;
}
const approvedFor=game=>{
 const names=[game?.away?.name||"",game?.home?.name||""].map(s=>s.toLowerCase());
 const has=(a,b)=>names.some(s=>s.includes(a))&&names.some(s=>s.includes(b));
 if(has("raven","chief"))return approvedMatchups["ravens-chiefs"];
 if(has("laker","celtic"))return approvedMatchups["lakers-celtics"];
 if(has("commander","eagle"))return approvedMatchups["commanders-eagles"];
 if(has("michigan","ohio state"))return approvedMatchups["michigan-ohio-state"];
 if(has("notre dame","navy"))return approvedMatchups["notre-dame-navy"];
 if(has("miami","clemson"))return approvedMatchups["miami-clemson"];
 return null;
};
export default function GameCard({game}) {const approved=approvedFor(game);return <Link className={`game-card sj-premium-match sj-match-${String(game.league||"").toLowerCase()}`} to={`/game/${encodeURIComponent(game.id)}`}>
  <div className="sj-match-top"><span className="sj-league-tag">{game.league}</span><span><Clock size={13}/>{when(game.startTime)}</span></div>
  <div className={`sj-match-arena sj-dynamic-match-arena ${approved?"sj-approved-match-arena":""}`} style={{backgroundImage:`linear-gradient(0deg,#07132e77,#07132e11),url(/artwork/library/stadiums/${arenaFor(game.league)}-arena.svg)`}}>
    {approved && <img className="sj-approved-match-image" src={approved} alt={`${game.away?.name} vs ${game.home?.name} approved Sports Jedi matchup artwork`} loading="lazy"/>}
    <div className="sj-match-arena-lights" aria-hidden="true"/>
    <div className="sj-match-versus" style={approved?{display:"none"}:undefined}>
      <Team team={game.away} league={game.league}/>
      <b>VS</b>
      <Team team={game.home} league={game.league}/>
    </div>
  </div>
  <div className="sj-match-bottom"><span>{game.status==="live"?"🔴 LIVE":game.status==="upcoming"?"UPCOMING":game.status}</span><span>View matchup <ChevronRight size={17}/></span></div>
</Link>}
