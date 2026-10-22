import React, {useEffect, useState} from "react";

const activities = [
  {title:"Practice safely",detail:"Try the free demo without money.",path:"/parlay"},
  {title:"Understand the signals",detail:"Read how the tools interpret information.",path:"/methodology"},
  {title:"Explore your tools",detail:"See available features and controls.",path:"/picks"}
];
const STORAGE_KEY="sports-jedi-learning-progress-v1";
export default function LearningProgress() {
  const [done,setDone]=useState([]);
  useEffect(()=>{
    try {const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); if(Array.isArray(saved))setDone(saved.filter(x=>Number.isInteger(x)&&x>=0&&x<activities.length));}
    catch(e){/* Private browsing can block persistence; keep this session usable. */}
  },[]);
  const toggle=(i)=>{
    const next=done.includes(i)?done.filter(n=>n!==i):[...done,i];
    setDone(next);
    try {localStorage.setItem(STORAGE_KEY,JSON.stringify(next));} catch(e){/* Session-only fallback. */}
  };
  return <section aria-label="Learning progress" style={{margin:"18px 0",padding:18,borderRadius:18,background:"rgba(29,78,103,.22)",border:"1px solid rgba(105,225,195,.3)"}}>
    <h3 style={{margin:"0 0 8px",fontWeight:800}}>Your Learning Quest · {done.length}/{activities.length}</h3>
    <div role="progressbar" aria-label="Self-reported learning progress" aria-valuenow={done.length} aria-valuemin={0} aria-valuemax={activities.length} style={{height:10,background:"rgba(255,255,255,.15)",borderRadius:8,overflow:"hidden"}}>
      <div style={{height:"100%",width:Math.round(done.length/activities.length*100)+"%",background:"#34d399",transition:"width .2s"}}/>
    </div>
    <p style={{fontSize:12,opacity:.8}}>Personal checklist saved in this browser only. Mark tasks yourself; no trade results, betting wins, account rewards, or server-verified achievements are implied.</p>
    <div style={{display:"grid",gap:12,gridTemplateColumns:"repeat(auto-fit,minmax(185px,1fr))"}}>
      {activities.map((a,i)=><div key={i} style={{padding:12,borderRadius:12,background:"rgba(255,255,255,.06)"}}>
        <strong style={{display:"block"}}>{done.includes(i)?"✓ ":"○ "}{a.title}</strong>
        <p style={{fontSize:13,opacity:.8}}>{a.detail}</p>
        <a href={a.path} style={{color:"#6ee7b7",textDecoration:"underline"}}>Open activity →</a>
        <label style={{display:"block",marginTop:12,fontSize:13,cursor:"pointer"}}><input type="checkbox" checked={done.includes(i)} onChange={()=>toggle(i)}/> I completed this</label>
      </div>)}
    </div>
  </section>;
}
