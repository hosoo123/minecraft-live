"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Block = { name: string; hp: number; colors: [string,string,string]; icon: string; reward: number };
const blocks: Block[] = [
  {name:"GRASS BLOCK",hp:120,colors:["#78b43d","#82532d","#54331e"],icon:"🌱",reward:120},
  {name:"STONE",hp:220,colors:["#aaa","#707070","#444"],icon:"🪨",reward:220},
  {name:"COPPER ORE",hp:340,colors:["#d78b61","#5d9184","#555"],icon:"🔶",reward:340},
  {name:"IRON ORE",hp:480,colors:["#dbc4ad","#817b74","#555"],icon:"⛓",reward:480},
  {name:"GOLD ORE",hp:680,colors:["#ffdc3c","#a18c32","#65615a"],icon:"⭐",reward:680},
  {name:"DIAMOND ORE",hp:950,colors:["#55e8df","#238c93","#424d50"],icon:"💎",reward:950},
  {name:"CINNABAR",hp:1250,colors:["#ef5948","#982f2b","#482a29"],icon:"♦",reward:1250},
  {name:"SULFUR BLOCK",hp:1550,colors:["#f2e85b","#aaa42f","#595633"],icon:"⚡",reward:1550},
  {name:"OBSIDIAN",hp:2200,colors:["#674487","#281a38","#100d18"],icon:"◆",reward:2200},
];
type Fx={id:number;x:number;y:number;text:string;kind:string};

export default function Home(){
  const [level,setLevel]=useState(0),[hp,setHp]=useState(blocks[0].hp),[score,setScore]=useState(2200),[hits,setHits]=useState(0),[combo,setCombo]=useState(1),[gems,setGems]=useState(0);
  const [tool,setTool]=useState<"idle"|"drop"|"hit"|"return">("idle"),[boom,setBoom]=useState<""|"tnt"|"nuke">(""),[flash,setFlash]=useState(false),[fx,setFx]=useState<Fx[]>([]),[notice,setNotice]=useState(""),[soundOn,setSoundOn]=useState(false);
  const busy=useRef(false),levelRef=useRef(0),comboTimer=useRef<number|undefined>(undefined),particleId=useRef(0);
  const baseBlock=blocks[level%blocks.length],isBoss=(level+1)%5===0,block={...baseBlock,hp:isBoss?baseBlock.hp*2:baseBlock.hp},nextBlock=blocks[(level+1)%blocks.length],bossProgress=(level%5)+1;
  useEffect(()=>{levelRef.current=level},[level]);
  const playSound=useCallback((tone:"hit"|"break"|"boom")=>{if(!soundOn)return;const AudioCtx=window.AudioContext||(window as typeof window & {webkitAudioContext:typeof AudioContext}).webkitAudioContext,ctx=new AudioCtx(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type=tone==="hit"?"square":"sawtooth";osc.frequency.setValueAtTime(tone==="hit"?150:tone==="break"?420:70,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(tone==="boom"?30:90,ctx.currentTime+.16);gain.gain.setValueAtTime(.07,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.18);osc.start();osc.stop(ctx.currentTime+.18)},[soundOn]);
  const particles=useCallback((text:string,kind="hit")=>{const batch=Array.from({length:kind==="nuke"?18:8},(_,i)=>({id:++particleId.current,x:30+Math.random()*40,y:48+Math.random()*12,text:i===0?text:kind==="nuke"?"✦":"■",kind}));const ids=new Set(batch.map(p=>p.id));setFx(o=>[...o,...batch]);setTimeout(()=>setFx(o=>o.filter(p=>!ids.has(p.id))),900)},[]);
  const damage=useCallback((amount:number,source="hit")=>{setHp(current=>{const oldLevel=levelRef.current,currentBlock=blocks[oldLevel%blocks.length],boss=(oldLevel+1)%5===0,left=current-amount;setScore(s=>s+Math.min(amount,current));setHits(h=>h+1);setCombo(c=>Math.min(c+1,99));clearTimeout(comboTimer.current);comboTimer.current=window.setTimeout(()=>setCombo(1),2600);particles(`-${Math.min(amount,current)}`,source);if(left>0){playSound(source==="hit"?"hit":"boom");return left}playSound("break");setFlash(true);setTimeout(()=>setFlash(false),260);const next=oldLevel+1,lucky=next%3===0;setGems(g=>g+(boss?5:lucky?2:1));setNotice(boss?"BOSS DEFEATED! +5 💎":lucky?"GOLDEN DROP! +500 ⭐":"BLOCK CLEARED!");setTimeout(()=>setNotice(""),1500);levelRef.current=next;setLevel(next);setScore(s=>s+currentBlock.reward+(boss?1000:0)+(lucky?500:0));const nextBase=blocks[next%blocks.length];return (next+1)%5===0?nextBase.hp*2:nextBase.hp})},[particles,playSound]);
  const dropPickaxe=useCallback((amount=35)=>{if(busy.current)return;busy.current=true;setTool("drop");setTimeout(()=>{setTool("hit");damage(amount)},520);setTimeout(()=>setTool("return"),690);setTimeout(()=>{setTool("idle");busy.current=false},1050)},[damage]);
  const explode=useCallback((kind:"tnt"|"nuke",amount:number)=>{if(boom)return;setBoom(kind);setTimeout(()=>damage(amount,kind),kind==="nuke"?650:450);setTimeout(()=>setBoom(""),kind==="nuke"?1250:850)},[boom,damage]);
  useEffect(()=>{const t=setInterval(()=>dropPickaxe(35),1850);return()=>clearInterval(t)},[dropPickaxe]);
  const percent=Math.max(0,hp/block.hp*100),crack=percent>70?0:percent>40?1:percent>15?2:3;
  return <main className={`page ${boom?`shake ${boom}`:""} ${flash?"levelFlash":""}`}><section className="game">
    <div className="sun"/><div className="cloud c1"/><div className="cloud c2"/><div className="stars">✦　·　✦　·　✦</div>
    <header><div className="live"><i/> LIVE</div><div className="score"><small>SCORE</small><b>{score.toLocaleString()}</b></div><div className="wallet">💎 {gems}</div><button className="sound" onClick={()=>setSoundOn(v=>!v)}>{soundOn?"🔊":"🔇"}</button></header>
    <div className="headline"><span>BREAK</span><span>THE BLOCK!</span></div><div className="subtitle">EVERY LIKE DROPS A PICKAXE</div>
    {notice&&<div className="notice">{notice}</div>}<div className={`arena ${isBoss?"bossArena":""}`}>
      <div className={`pickaxe ${tool}`}><span className="pickHead"/><span className="pickHandle"/></div>
      {boom==="tnt"&&<div className="fallingTnt"><span>TNT</span></div>}{boom==="nuke"&&<div className="nukeDrop">☢</div>}{boom&&<div className={`explosion ${boom}`}>💥</div>}
      <div className="combo">COMBO <b>x{combo}</b></div>{isBoss&&<div className="bossTag">☠ BOSS BLOCK</div>}<div className="blockLabel"><span>{block.icon}</span> {block.name}</div>
      <div className="hpRow"><b>{Math.max(0,hp).toLocaleString()} HP</b><span>{Math.round(percent)}%</span></div><div className="hpBar"><div style={{width:`${percent}%`}}/></div>
      <button className={`minecraftBlock crack${crack} ${isBoss?"bossBlock":""}`} style={{"--c1":block.colors[0],"--c2":block.colors[1],"--c3":block.colors[2]} as React.CSSProperties} onClick={()=>dropPickaxe(35)} aria-label={`Mine ${block.name}`}><i className="ore o1"/><i className="ore o2"/><i className="ore o3"/><i className="cracks"/></button>
      <div className="ground"><i/><i/><i/><i/><i/></div><div className="depth"><span>⬇ DEPTH <b>{level+1}</b></span><span>⛏ HITS <b>{hits}</b></span></div><div className="bossRoad"><span style={{width:`${bossProgress*20}%`}}/></div><div className="next">{bossProgress===4?"⚠ NEXT: BOSS BLOCK":<>NEXT: <b>{nextBlock.icon} {nextBlock.name}</b></>}</div>
      {fx.map(p=><span key={p.id} className={`particle ${p.kind}`} style={{left:`${p.x}%`,top:`${p.y}%`}}>{p.text}</span>)}
    </div>
    <div className="eventGuide"><div><b>👍 LIKE</b><span>+ PICKAXE</span></div><div><b>🔔 SUBSCRIBE</b><span>+ TNT</span></div><div><b>💬 CHAT “BOOM”</b><span>+ 100 DMG</span></div></div>
    <div className="controls"><button onClick={()=>dropPickaxe(35)}>👍 <b>LIKE</b><small>DROP PICKAXE</small></button><button onClick={()=>explode("tnt",180)}>🧨 <b>TNT</b><small>180 DAMAGE</small></button><button className="nukeButton" onClick={()=>explode("nuke",9999)}>☢ <b>NUKE</b><small>BREAK BLOCK</small></button></div>
    <footer><i/> DEMO MODE • AUTO MINING ON</footer>
  </section></main>
}
