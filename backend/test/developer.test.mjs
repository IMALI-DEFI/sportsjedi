import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import developer from '../src/routes/developer.js';

process.env.SPORTSJEDI_DEVELOPER_KEYS = 'local-test-only-key';
process.env.SPORTSJEDI_DEVELOPER_TIERS = 'free';
const app = express();
app.use(express.json());
app.use('/api/developer/v1',developer);
const server = app.listen(0);
const url = `http://127.0.0.1:${server.address().port}/api/developer/v1`;
test.after(()=>server.close());
const request = (path,options={}) => fetch(url+path,{...options,headers:{'x-api-key':'local-test-only-key',...(options.headers||{})}});

test('unauthorized key rejected',async()=>{
 const r=await fetch(url+'/capabilities'); assert.equal(r.status,401);
});
test('capabilities report experimental status',async()=>{
 const r=await request('/capabilities'); assert.equal(r.status,200); assert.equal((await r.json()).validated,false);
});
test('fair odds validates probability and optional offered odds',async()=>{
 for(const payload of [{probability:0},{probability:1},{probability:'0.5'},{probability:0.5,offeredAmericanOdds:-50}]){
  const r=await request('/fair-odds',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  assert.equal(r.status,400);
 }
});
test('fair odds and caller comparison',async()=>{
 const r=await request('/fair-odds',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({probability:0.55,offeredAmericanOdds:110})});
 assert.equal(r.status,200); const body=await r.json(); assert.equal(body.fairAmericanOdds,-122); assert.ok(body.comparison.expectedReturnPerDollar>0);
});
test('usage endpoint',async()=>{
 const r=await request('/usage'); assert.equal(r.status,200); assert.equal((await r.json()).tier,'free');
});

test('predictions rejects unsupported league without external fetch',async()=>{
 const r=await request('/predictions?league=NOT_A_LEAGUE'); assert.equal(r.status,400);
});
