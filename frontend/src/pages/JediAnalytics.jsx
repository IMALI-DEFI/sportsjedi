import { useEffect, useState } from "react";
const BASE = import.meta.env.VITE_API_BASE_URL || "https://api.sportsjedi.com";
const leagues = ["NFL","NCAAF","NBA","MLB"];
export default function JediAnalytics() {
 const [league,setLeague]=useState("NBA"),[games,setGames]=useState([]),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;setLoading(true);setError("");
 fetch(`${BASE}/api/v1/predictions?league=${league}`).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||"Unable to load");return d;})
 .then(d=>{if(active)setGames(d.games||[])}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});
 return()=>{active=false}},[league]);
 return <main className="shell" style={{paddingTop:40,paddingBottom:70}}>
 <h1>Sports Jedi Analytics Lab</h1><p>Independent estimated win probabilities and fair odds from team records. Experimental baseline; not validated betting predictions or sportsbook lines.</p>
 <div style={{display:"flex",gap:10,flexWrap:"wrap",margin:"20px 0"}}>{leagues.map(l=><button key={l} onClick={()=>setLeague(l)} aria-pressed={league===l} style={{padding:"10px 18px",borderRadius:10,background:league===l?"#235c96":"#172a41",color:"white",border:"1px solid #6686a5"}}>{l}</button>)}</div>
 {loading&&<p>Loading games…</p>}{error&&<p role="alert">Statistics temporarily unavailable: {error}</p>}
 {!loading&&!error&&!games.length&&<p>No upcoming games returned for this league.</p>}
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:16}}>
 {games.map(g=><article key={g.id} style={{padding:20,border:"1px solid #35516d",borderRadius:16,background:"#10243c"}}>
 <small>{new Date(g.date).toLocaleString()}</small><h3>{g.away.name||"Away"} at {g.home.name||"Home"}</h3>
 {g.model?<><p>{g.home.name}: <strong>{(g.model.homeWinProbability*100).toFixed(1)}%</strong> · Fair {g.model.homeFairAmerican>0?"+":""}{g.model.homeFairAmerican}</p>
 <p>{g.away.name}: <strong>{(g.model.awayWinProbability*100).toFixed(1)}%</strong> · Fair {g.model.awayFairAmerican>0?"+":""}{g.model.awayFairAmerican}</p>
 <small>Unvalidated record-based estimate. No market comparison.</small></>:<p>{g.reason||"Not enough data"}</p>}</article>)}</div>
 </main>
}
