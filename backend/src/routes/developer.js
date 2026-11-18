import { scoreboard, model } from './jediStats.js';
import { consume } from '../services/usageStore.js';
import { Router } from 'express';
const router = Router();
const tiers = {free:500,starter:20000,pro:100000,business:500000,enterprise:2000000};

const clamp = p => Math.min(0.9999, Math.max(0.0001, p));
const american = p => p >= 0.5 ? -Math.round(100*p/(1-p)) : Math.round(100*(1-p)/p);
const decimal = odds => odds > 0 ? 1+odds/100 : 1+100/Math.abs(odds);
const implied = odds => 1/decimal(odds);
router.use((req,res,next) => {
  const configured = (process.env.SPORTSJEDI_DEVELOPER_KEYS || '').split(',').map(s=>s.trim()).filter(Boolean);
  if (!configured.length) return res.status(503).json({error:'Developer API disabled: configure SPORTSJEDI_DEVELOPER_KEYS'});
  const supplied = req.get('x-api-key') || '';
  if (!configured.includes(supplied)) return res.status(401).json({error:'Invalid API key'});
  const keyIndex = configured.indexOf(supplied);
  const tierNames = (process.env.SPORTSJEDI_DEVELOPER_TIERS || '').split(',').map(s=>s.trim().toLowerCase());
  const tier = tiers[tierNames[keyIndex]] ? tierNames[keyIndex] : 'free';
  let usage;
  try { usage = consume(supplied,tier); }
  catch (error) { return res.status(503).json({error:'Usage metering unavailable'}); }
  res.set('X-RateLimit-Limit',String(usage.limit));
  res.set('X-RateLimit-Remaining',String(usage.remaining));
  if (!usage.allowed) return res.status(429).json({error:'Monthly API quota exceeded',tier});
  req.developerTier = tier;
  next();
});
router.get('/predictions',async(req,res)=>{
  const league = String(req.query.league || 'NFL').toUpperCase();
  if (!['NFL','NCAAF','NBA','MLB'].includes(league)) return res.status(400).json({error:'Unsupported league'});
  try {
    const games = (await scoreboard(league)).filter(g=>g.status==='STATUS_SCHEDULED' && new Date(g.date)>new Date()).map(model);
    res.json({league,source:'Unofficial ESPN scoreboard; commercial redistribution rights unverified',model:'record_based_baseline',validated:false,games});
  } catch(error) { res.status(502).json({error:'Prediction data unavailable'}); }
});
router.get('/usage',(req,res)=>res.json({tier:req.developerTier,remaining:Number(res.getHeader('X-RateLimit-Remaining')),reset:'next UTC calendar month',note:'Counters persist across restarts on a single server; multi-instance deployments require a transactional shared store'}));
router.get('/capabilities',(req,res)=>res.json({product:'Sports Jedi Predictions API',version:'v1',markets:['moneyline'],status:'experimental',dataSource:'caller-supplied probability',validated:false}));
router.post('/fair-odds',(req,res)=>{
  const {probability,offeredAmericanOdds} = req.body || {};
  if (typeof probability !== 'number' || !Number.isFinite(probability) || probability <= 0 || probability >= 1) return res.status(400).json({error:'probability must be a number strictly between 0 and 1'});
  if (offeredAmericanOdds !== undefined && (typeof offeredAmericanOdds !== 'number' || !Number.isInteger(offeredAmericanOdds) || Math.abs(offeredAmericanOdds) < 100)) return res.status(400).json({error:'offeredAmericanOdds must be an integer <= -100 or >= 100'});
  const p = clamp(probability);
  const result = {probability:p,fairAmericanOdds:american(p),fairDecimalOdds:+(1/p).toFixed(4),model:'caller_supplied_probability',validated:false};
  if (offeredAmericanOdds !== undefined) result.comparison={offeredAmericanOdds,impliedProbability:+implied(offeredAmericanOdds).toFixed(4),expectedReturnPerDollar:+(p*decimal(offeredAmericanOdds)-1).toFixed(4)};
  res.json(result);
});
export default router;
