const BASE = "https://statsapi.mlb.com/api/v1";
const cache = new Map();
async function getJson(url) {
 const old=cache.get(url);
 if(old && Date.now()-old.time<30000) return old.value;
 const r=await fetch(url,{signal:AbortSignal.timeout(9000)});
 if(!r.ok) throw new Error(`MLB stats unavailable (${r.status})`);
 const value=await r.json();cache.set(url,{value,time:Date.now()});return value;
}
const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
function state(g) {
 const s=g.status?.abstractGameState||"Preview";
 return s==="Final"?"final":s==="Live"?"live":"upcoming";
}
export async function matchMlbGame({homeTeam,awayTeam,startTime}) {
 const date=new Date(startTime);
 if(Number.isNaN(date.getTime())) return null;
 const day=date.toISOString().slice(0,10);
 const data=await getJson(`${BASE}/schedule?sportId=1&date=${day}&hydrate=linescore`);
 const games=data.dates?.flatMap(d=>d.games||[])||[];
 const g=games.find(x=>norm(x.teams?.home?.team?.name)===norm(homeTeam)&&norm(x.teams?.away?.team?.name)===norm(awayTeam));
 if(!g) return null;
 return {gamePk:g.gamePk,status:state(g),detailedStatus:g.status?.detailedState,abstractStatus:g.status?.abstractGameState,
 inning:g.linescore?.currentInning??null,inningState:g.linescore?.inningState??null,inningOrdinal:g.linescore?.currentInningOrdinal??null,
 homeScore:g.teams?.home?.score??null,awayScore:g.teams?.away?.score??null};
}
export async function getMlbGamecast(gamePk) {
 if(!/^\d+$/.test(String(gamePk))) throw new Error("Invalid MLB game id");
 const data=await getJson(`${BASE}/game/${gamePk}/feed/live`);
 const g=data.gameData||{}, live=data.liveData||{}, line=live.linescore||{};
 return {gamePk:Number(gamePk),status:state({status:g.status}),detailedStatus:g.status?.detailedState,
 home:g.teams?.home?.name,away:g.teams?.away?.name,
 homeScore:line.teams?.home?.runs??null,awayScore:line.teams?.away?.runs??null,
 inning:line.currentInning??null,inningState:line.inningState??null,inningOrdinal:line.currentInningOrdinal??null,
 plays:live.plays?.allPlays?.slice(-15).map(p=>({description:p.result?.description,inning:p.about?.inning,half:p.about?.halfInning}))||[]};
}
