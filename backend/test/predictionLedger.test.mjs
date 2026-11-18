import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
const folder=await mkdtemp(path.join(tmpdir(),"jedi-ledger-test-"));
process.env.JEDI_PREDICTION_LEDGER=path.join(folder,"ledger.json");
const {recordPredictions,settlePredictions,performance}=await import("../src/services/predictionLedger.js");
test("prediction ledger saves pregame snapshot, avoids duplicates, and settles",async()=>{
 const date=new Date(Date.now()+86400000).toISOString();
 const game={id:"test-1",league:"NBA",date,status:"STATUS_SCHEDULED",
 home:{name:"Home",score:null},away:{name:"Away",score:null},
 model:{homeWinProbability:.7,awayWinProbability:.3}};
 assert.equal((await recordPredictions([game])).added,1);
 assert.equal((await recordPredictions([game])).added,0);
 assert.equal((await settlePredictions([{...game,status:"STATUS_FINAL",home:{...game.home,score:null},away:{...game.away,score:90}}])).settled,0);
 assert.equal((await settlePredictions([{...game,status:"STATUS_FINAL",home:{...game.home,score:105},away:{...game.away,score:90}}])).settled,1);
 const stats=await performance();
 assert.equal(stats.tracked,1);assert.equal(stats.settled,1);assert.equal(stats.accuracy,1);
 assert.ok(Math.abs(stats.brierScore-.09)<1e-8);
});
test("rejects completed games as new predictions",async()=>{
 const g={id:"test-2",league:"NBA",date:new Date(Date.now()-86400000).toISOString(),status:"STATUS_FINAL",model:{homeWinProbability:.5}};
 assert.equal((await recordPredictions([g])).added,0);
});
process.on("exit",()=>{import("node:fs").then(fs=>fs.rmSync(folder,{recursive:true,force:true}))});
