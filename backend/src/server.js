import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import healthRoutes from "./routes/health.js";
import internalAdminRoutes from "./routes/internalAdmin.js";
import gameRoutes from "./routes/games.js";
import teamRoutes from "./routes/teams.js";
import picksRoutes from "./routes/picks.js";
import parlayRoutes from "./routes/parlays.js";
import billingRoutes from "./routes/billing.js";
import accountRoutes from "./routes/account.js";
import blogRoutes from "./routes/blog.js";
import sitemapRoutes from "./routes/sitemap.js";
import sourceRoutes from "./routes/sources.js";

import {
  notFound,
  errorHandler,
} from "./middleware/errorHandler.js";

import { optionalAuth } from "./middleware/auth.js";

const app = express();

const PORT =
  Number(
    process.env.PORT || 4100
  );

const allowedOrigins =
  (
    process.env.FRONTEND_ORIGIN ||
    ""
  )
    .split(",")
    .map((origin) =>
      origin.trim()
    )
    .filter(Boolean);

app.use(helmet());

app.use(
  cors({
    origin: (
      origin,
      callback
    ) => {
      if (
        !origin ||
        !allowedOrigins.length ||
        allowedOrigins.includes(
          origin
        )
      ) {
        return callback(
          null,
          true
        );
      }

      callback(
        new Error(
          "Origin not allowed"
        )
      );
    },

    credentials: true,
  })
);

app.use(
  express.json({
    limit: "100kb",
  })
);

app.use(morgan("dev"));

app.use(optionalAuth);

app.get("/", (req, res) => {
  res.json({
    name:
      "Sports Jedi API",
    version: "1.1.0",
    provider:
      process.env
        .SPORTS_PROVIDER ||
      "mock",
  });
});

app.use(
  "/api/health",
  healthRoutes
);

app.use(
  "/api/internal",
  internalAdminRoutes
);

app.use(
  "/api/games",
  gameRoutes
);

app.use(
  "/api/teams",
  teamRoutes
);

app.use(
  "/api/picks",
  picksRoutes
);

app.use(
  "/api/parlays",
  parlayRoutes
);

app.use(
  "/api/billing",
  billingRoutes
);


app.use(
  "/api/account",
  accountRoutes
);

app.use(
  "/api/blog",
  blogRoutes
);

app.use(
  "/sitemap.xml",
  sitemapRoutes
);

app.use(
  "/api/sources",
  sourceRoutes
);

app.get("/api/demo", (req, res) => { res.set("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; script-src-attr 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; object-src 'none'; form-action 'none'"); res.type("html").send("<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Build a Demo Parlay | Sports Jedi</title><style>body{font:16px system-ui;background:#0b1427;color:white;max-width:920px;margin:auto;padding:25px}button,select,input{padding:12px;margin:5px;background:#253653;color:white;border:1px solid #63708c;border-radius:9px}article{background:#152640;border-radius:14px;padding:18px;margin:14px 0}.active{background:teal}a{color:#8fe8df}body{max-width:1120px;background:radial-gradient(ellipse at 65% 0%,#1b5370 0,#0a1227 52%,#050816 100%);min-height:100vh}h1{font-size:clamp(2.3rem,6vw,4.6rem);letter-spacing:-.055em;line-height:1.03;margin:8px 0 20px}h2{letter-spacing:-.03em}nav{display:flex;flex-wrap:wrap;gap:5px}button{transition:transform .15s,background .15s;cursor:pointer;font-weight:700}button:hover{transform:translateY(-2px);border-color:#30d4d1}.hero{padding:30px 0 24px}.eyebrow{color:#5ce4d2;text-transform:uppercase;letter-spacing:.15em;font-size:12px;font-weight:900}.hero p{max-width:650px;color:#c2d3e8;font-size:1.1rem;line-height:1.6}.primary{background:linear-gradient(125deg,#3bede0,#10b981);color:#051924;border:0;padding:15px 25px;display:inline-block;text-decoration:none;font-weight:900;border-radius:12px;box-shadow:0 12px 45px #1ef1cd35}.hero-actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:26px}.secondary{padding:13px 22px;border:1px solid #527c8d;border-radius:12px;color:#fff;text-decoration:none}.intro-stat{display:flex;flex-wrap:wrap;gap:14px;margin:25px 0}.intro-stat span{border:1px solid #3e6b7a;border-radius:12px;padding:13px 16px;background:#0c203a;color:#a9e8e3}.intro-stat strong{color:white}.board-title{font-size:2rem;margin-top:22px}#cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:12px}#cards article{margin:5px 0;border:1px solid #356076;box-shadow:0 15px 35px #02091670}#cards article h3{font-size:1.12rem}#cards button{background:#137f85;border-color:#27b0ae}#parlay{border:1px solid #32aeb1;box-shadow:0 15px 55px #00e1c219;position:static;bottom:auto;z-index:auto;background:#102039ef}#return{font-size:1.25rem;color:#70f4cb;font-weight:900}.mini{color:#aabed6;font-size:.87rem}.signup{background:linear-gradient(115deg,#164c68,#153246);border:1px solid #3ac0be}.signup a{display:inline-block;margin:6px;padding:12px;border:1px solid #65c7c6;border-radius:10px;font-weight:800;text-decoration:none}@media(min-width:760px){#parlay{position:relative;bottom:auto}}@media(max-width:570px){body{padding:14px}article{padding:15px}#parlay{box-shadow:none.hero{padding-top:18px}} .steps{border:1px solid #38a9b2;background:#102842}.steps-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.steps-grid div{background:#071b31;border:1px solid #355e74;border-radius:13px;padding:14px}.steps-grid p{color:#b5cbe0;line-height:1.5}.amount-label{display:block;margin:18px 0;font-weight:800}#selected{line-height:1.8;font-size:1rem;background:#0a2037;border-radius:12px;padding:14px}#parlay{scroll-margin-top:20px}#cards button{min-height:46px} </style><div class=\"hero\"><div class=\"eyebrow\">SPORTS JEDI \u2022 THE PARLAY LAB</div><h1>YOUR NEXT PARLAY<br>STARTS HERE.</h1><p>Stop guessing. Start exploring. Pick your sport, discover model-style insights and build a demo parlay in seconds.</p><div class=\"hero-actions\"><a class=\"primary\" href=\"#cards\">BUILD MY PARLAY \u2192</a><a class=\"secondary\" href=\"https://sportsjedi.com/pricing?utm_source=threads&amp;utm_medium=direct_share&amp;utm_campaign=parlay_demo\">Explore Membership</a></div><div class=\"intro-stat\"><span>\ud83c\udfc8 <strong>Four sports</strong> to explore</span><span>\u26a1 <strong>Tap to build</strong> your card</span><span>\ud83c\udfaf <strong>Preview</strong> hypothetical returns</span></div><p class=\"mini\">DEMO MODE \u2022 All games, odds and confidence scores below are fictional illustrations, not today's picks or betting recommendations.</p></div><article class=\"steps\"><h2>New to parlays? Start here.</h2><div class=\"steps-grid\"><div><b>1. Choose a sport</b><p>Tap NFL, NBA, College Football or MLB.</p></div><div><b>2. Add picks</b><p>A <strong>leg</strong> is one prediction. Tap \u201cAdd this pick\u201d on two or more games.</p></div><div><b>3. Review your slip</b><p>See all your picks together. Adjust the example amount to see how payouts work.</p></div></div><p class=\"mini\">This is only a practice tool. No money or real bets are involved.</p></article><h2 class=\"board-title\" id=\"pick-board\">Step 1: Choose your sport</h2><p class=\"mini\">Then tap \u201cAdd this pick\u201d on any sample game below.</p><nav id=\"tabs\"></nav><p>Filter example confidence: <select id=\"filter\"><option value=\"0\">All</option><option value=\"70\">70%+</option><option value=\"80\">80%+</option></select></p><h2>Step 2: Pick your teams</h2><section id=\"cards\"></section><article id=\"parlay\"><h2>Step 3: Your Practice Parlay</h2><p class=\"mini\">A parlay combines two or more predictions. For the parlay to win, <strong>every pick must be correct</strong>.</p><div id=\"selected\" aria-live=\"polite\">No picks added yet. Choose a sport, then tap \u201cAdd this pick.\u201d</div><label class=\"amount-label\">Practice amount in dollars<br><input type=\"number\" min=\"1\" max=\"1000\" value=\"10\" id=\"stake\" inputmode=\"decimal\"></label><p class=\"mini\">This is pretend money. Nothing will be charged.</p><p id=\"return\" aria-live=\"polite\"></p><button id=\"clear\">Start over</button><a href=\"#pick-board\" class=\"secondary\" style=\"display:inline-block;margin:8px\">Find more picks \u2191</a></article><article class=\"signup\"><h2>Ready to see what the Jedi sees?</h2><p>Build a smarter research routine. Compare membership plans and explore the real Sports Jedi board.</p><a href=\"https://sportsjedi.com/pricing?utm_source=threads&amp;utm_medium=direct_share&amp;utm_campaign=parlay_demo\">View plans</a> | <a href=\"https://sportsjedi.com/register?utm_source=threads&amp;utm_medium=direct_share&amp;utm_campaign=parlay_demo\">Sign up</a></article><script>const data=[['NFL','Demo Lions vs Bears',77,-110],['NFL','Demo Jets vs Bills',68,115],['NBA','Demo Celtics vs Knicks',83,-120],['NBA','Demo Lakers vs Suns',73,105],['CFB','Demo Tigers vs Wildcats',75,-105],['MLB','Demo Dodgers vs Mets',72,120]];let league='NFL',chosen=[];const e=id=>document.getElementById(id);function render(){e('tabs').innerHTML=['NFL','NBA','CFB','MLB'].map(x=>'<button class=\"'+(x===league?'active':'')+'\" onclick=\"league=\\''+x+'\\';render()\">'+x+'</button>').join('');e('cards').innerHTML=data.map((x,i)=>({x,i})).filter(o=>o.x[0]===league&&o.x[2]>=+e('filter').value).map(({x,i})=>'<article><h3>'+x[1]+'</h3><p>Example confidence: '+x[2]+'% | Example odds: '+(x[3]>0?'+':'')+x[3]+'</p><button onclick=\"toggle('+i+')\">'+(chosen.includes(i)?'Remove this pick':'Add this pick + ')+'</button></article>').join('')||'<p>No examples for this filter.</p>';e('selected').textContent=chosen.length?chosen.map((i,n)=>(n+1)+'. '+data[i][1]).join(' | '):'No picks added yet. Choose a sport, then tap \u201cAdd this pick.\u201d';const mult=chosen.reduce((v,i)=>v*(data[i][3]>0?1+data[i][3]/100:1+100/Math.abs(data[i][3])),1);e('return').textContent=chosen.length<2?'Add at least two picks to see a parlay example.':('If every pick wins, the example total returned would be $'+(mult*(+e('stake').value||0)).toFixed(2)+' including your practice amount. If any pick loses, the parlay loses.');}function toggle(i){chosen=chosen.includes(i)?chosen.filter(n=>n!==i):[...chosen,i];render()}e('clear').onclick=()=>{chosen=[];render()};e('filter').onchange=render;e('stake').oninput=render;render();</script></html>"); });

app.use(notFound);

app.use(errorHandler);

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Sports Jedi API running on port ${PORT}`
    );
  }
);
