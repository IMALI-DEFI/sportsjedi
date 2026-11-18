import {recordPredictions,settlePredictions,performance} from "../services/predictionLedger.js";
import { Router } from "express";
const router = Router();
const leagues = { NFL:["football","nfl"], NCAAF:["football","college-football"], NBA:["basketball","nba"], MLB:["baseball","mlb"] };
const cache = new Map();
const ttl = Math.max(60000, Number(process.env.JEDI_STATS_CACHE_MS || 900000));
export async function scoreboard(league, date = "") {
  const parts = leagues[league];
  if (!parts) throw Object.assign(new Error("Unsupported league"),{status:400});
  const key = league + ":" + date, old = cache.get(key);
  if (old && Date.now()-old.time < ttl) return old.data;
  const url = `https://site.api.espn.com/apis/site/v2/sports/${parts[0]}/${parts[1]}/scoreboard?limit=100${date ? "&dates=" + encodeURIComponent(date) : ""}`;
  const response = await fetch(url, {signal:AbortSignal.timeout(9000),headers:{"User-Agent":"SportsJedi/1.0"}});
  if (!response.ok) throw new Error("Stats provider unavailable");
  const raw = await response.json();
  const data = (raw.events||[]).map(e=>{
    const competition=e.competitions?.[0]||{};
    const home=competition.competitors?.find(c=>c.homeAway==="home")||{};
    const away=competition.competitors?.find(c=>c.homeAway==="away")||{};
    return {id:e.id,league,date:e.date,status:e.status?.type?.name||"unknown",
      home:{id:home.team?.id,name:home.team?.displayName,score:home.score??null,record:home.records?.[0]?.summary||null},
      away:{id:away.team?.id,name:away.team?.displayName,score:away.score??null,record:away.records?.[0]?.summary||null}};
  });
  cache.set(key,{time:Date.now(),data}); return data;
}
function probability(record) {
  const match=/^(\d+)-(\d+)/.exec(record||"");
  if (!match) return null;
  const w=Number(match[1]),l=Number(match[2]);
  return (w+1)/(w+l+2);
}
function american(p) {return p>=.5 ? -Math.round(100*p/(1-p)) : Math.round(100*(1-p)/p);}
export function model(g) {
  const h=probability(g.home.record),a=probability(g.away.record);
  if(h===null||a===null) return {...g,model:null,reason:"Insufficient team record data"};
  const logit=p=>Math.log(p/(1-p));
  const p=1/(1+Math.exp(-(logit(h)-logit(a)+0.12)));
  const home=Math.min(.95,Math.max(.05,p)),away=1-home;
  return {...g,model:{homeWinProbability:+home.toFixed(4),awayWinProbability:+away.toFixed(4),
    homeFairAmerican:american(home),awayFairAmerican:american(away),
    method:"record_based_baseline",validated:false,marketOdds:false}};
}
router.get("/performance",async(req,res)=>{try{res.json(await performance())}catch(e){res.status(500).json({error:"Performance data unavailable"})}});
router.get("/games",async(req,res)=>{try {res.json({source:"ESPN unofficial public scoreboard; verify commercial rights",league:String(req.query.league||"NFL").toUpperCase(),games:await scoreboard(String(req.query.league||"NFL").toUpperCase())});}catch(e){res.status(e.status||502).json({error:e.message});}});
router.get("/predictions",async(req,res)=>{try {const league=String(req.query.league||"NFL").toUpperCase();res.json({league,disclaimer:"Experimental baseline, not validated betting advice",games:(await scoreboard(league)).filter(g=>g.status==="STATUS_SCHEDULED" && new Date(g.date)>new Date()).map(model)});}catch(e){res.status(e.status||502).json({error:e.message});}});
router.post("/track",async(req,res)=>{try{if(!process.env.JEDI_TRACKING_TOKEN || req.get("x-jedi-tracking-token")!==process.env.JEDI_TRACKING_TOKEN)return res.sendStatus(403);const results={};for(const league of Object.keys(leagues)){const games=await scoreboard(league);const prior=new Date(Date.now()-86400000).toISOString().slice(0,10).replaceAll("-","");const yesterday=await scoreboard(league,prior);results[league]={recorded:await recordPredictions(games.map(model)),settled:await settlePredictions([...games,...yesterday])}}res.json(results)}catch(e){res.status(502).json({error:"Tracking failed"})}});
router.get("/odds",async(req,res)=>{try {const league=String(req.query.league||"NFL").toUpperCase();res.json({league,type:"model_fair_odds_not_sportsbook_lines",games:(await scoreboard(league)).filter(g=>g.status==="STATUS_SCHEDULED" && new Date(g.date)>new Date()).map(model)});}catch(e){res.status(e.status||502).json({error:e.message});}});
export default router;
