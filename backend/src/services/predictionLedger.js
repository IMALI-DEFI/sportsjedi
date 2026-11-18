import { promises as fs } from "node:fs";
import path from "node:path";
const file=process.env.JEDI_PREDICTION_LEDGER || path.join(import.meta.dirname,"../../data/prediction-ledger.json");
async function read() {try {const v=JSON.parse(await fs.readFile(file,"utf8"));return Array.isArray(v)?v:[]}catch(e){if(e.code==="ENOENT")return [];throw e}}
export async function recordPredictions(games) {
 const rows=await read();let added=0;
 for(const g of games) {
  if(g.status!=="STATUS_SCHEDULED"||!g.model||new Date(g.date)<=new Date()) continue;
  if(rows.some(r=>r.league===g.league&&r.id===g.id))continue;
  rows.push({id:g.id,league:g.league,date:g.date,recordedAt:new Date().toISOString(),
    home:g.home.name,away:g.away.name,homeProbability:g.model.homeWinProbability,
    awayProbability:g.model.awayWinProbability,homeScore:null,awayScore:null});
  added++;
 }
 if(added){await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+"."+process.pid+".tmp";await fs.writeFile(temp,JSON.stringify(rows,null,2));await fs.rename(temp,file)}
 return {added,total:rows.length};
}
export async function settlePredictions(finalGames) {
 const rows=await read();let settled=0;
 for(const g of finalGames) {
  if(g.status!=="STATUS_FINAL")continue;
  const r=rows.find(x=>x.league===g.league&&x.id===g.id&&x.homeScore===null);
  if(!r)continue;
  if(g.home.score===null||g.home.score===undefined||g.away.score===null||g.away.score===undefined)continue;
  const home=Number(g.home.score),away=Number(g.away.score);
  if(!Number.isFinite(home)||!Number.isFinite(away)||home===away)continue;
  r.homeScore=home;r.awayScore=away;r.settledAt=new Date().toISOString();settled++;
 }
 if(settled){await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+"."+process.pid+".tmp";await fs.writeFile(temp,JSON.stringify(rows,null,2));await fs.rename(temp,file)}
 return {settled};
}
export async function performance() {
 const rows=await read(),settled=rows.filter(r=>r.homeScore!==null);
 const correct=settled.filter(r=>(r.homeScore>r.awayScore)===(r.homeProbability>=0.5)).length;
 const brier=settled.length?settled.reduce((sum,r)=>sum+(r.homeProbability-(r.homeScore>r.awayScore?1:0))**2,0)/settled.length:null;
 return {tracked:rows.length,settled:settled.length,correct,accuracy:settled.length?correct/settled.length:null,brierScore:brier,unvalidated: true};
}
