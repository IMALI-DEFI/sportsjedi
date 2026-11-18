import {recordPredictions,settlePredictions,performance} from "../src/services/predictionLedger.js";
const sports={NFL:"football/nfl",NCAAF:"football/college-football",NBA:"basketball/nba",MLB:"baseball/mlb"};
const toDay=d=>d.toISOString().slice(0,10).replaceAll("-","");
async function fetchGames(league,day) {
 const url=`https://site.api.espn.com/apis/site/v2/sports/${sports[league]}/scoreboard?limit=100&dates=${day}`;
 const response=await fetch(url,{signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error(`${league} provider HTTP ${response.status}`);
 const body=await response.json();
 return (body.events||[]).map(e=>{
  const c=e.competitions?.[0]||{}, home=c.competitors?.find(t=>t.homeAway==="home")||{},away=c.competitors?.find(t=>t.homeAway==="away")||{};
  const record=t=>{const m=/^(\d+)-(\d+)/.exec(t.records?.[0]?.summary||"");return m?((Number(m[1])+1)/(Number(m[1])+Number(m[2])+2)):null};
  const h=record(home),a=record(away), p=h!==null&&a!==null?1/(1+Math.exp(-(Math.log(h/(1-h))-Math.log(a/(1-a))+0.12))):null;
  return {id:e.id,league,date:e.date,status:e.status?.type?.name,
    home:{name:home.team?.displayName,score:home.score},away:{name:away.team?.displayName,score:away.score},
    model:p===null?null:{homeWinProbability:+Math.max(.05,Math.min(.95,p)).toFixed(4)}};
 });
}
const now=new Date();
let failures=0;
for(const league of Object.keys(sports)){
 try {
  const today=await fetchGames(league,toDay(now));
  const yesterday=await fetchGames(league,toDay(new Date(now.getTime()-86400000)));
  const recorded=await recordPredictions(today.filter(g=>g.status==="STATUS_SCHEDULED" && new Date(g.date)>now));
  const settled=await settlePredictions([...today,...yesterday]);
  console.log(league,JSON.stringify({recorded,settled}));
 }catch(e){failures++;console.error(league,e.message)}
}
console.log("Performance",JSON.stringify(await performance()));
if(failures)process.exitCode=1;
