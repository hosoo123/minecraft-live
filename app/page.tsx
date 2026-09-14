"use client";

import { useCallback, useEffect, useState } from "react";

type Block = { name: string; hp: number; maxHp: number; icon: string };

const initialBlocks: Block[] = [
  { name: "GRASS", hp: 100, maxHp: 100, icon: "🌱" },
  { name: "STONE", hp: 180, maxHp: 180, icon: "🪨" },
  { name: "IRON", hp: 300, maxHp: 300, icon: "⛓️" },
  { name: "GOLD", hp: 450, maxHp: 450, icon: "🟨" },
  { name: "DIAMOND", hp: 700, maxHp: 700, icon: "💎" },
  { name: "OBSIDIAN", hp: 1200, maxHp: 1200, icon: "⬛" },
];

export default function Home() {
  const [level, setLevel] = useState(0);
  const [hp, setHp] = useState(initialBlocks[0].hp);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [falling, setFalling] = useState(false);
  const [boom, setBoom] = useState(false);

  const block = initialBlocks[level % initialBlocks.length];

  const damage = useCallback((amount: number) => {
    setHp((current) => {
      if (current - amount > 0) return current - amount;
      setScore((s) => s + block.maxHp);
      setLevel((l) => l + 1);
      const next = initialBlocks[(level + 1) % initialBlocks.length];
      return next.hp;
    });
    setHits((h) => h + 1);
  }, [block.maxHp, level]);

  const dropPickaxe = useCallback((amount = 20) => {
    if (falling) return;
    setFalling(true);
    window.setTimeout(() => {
      damage(amount);
      setFalling(false);
    }, 430);
  }, [damage, falling]);

  const explode = (amount: number) => {
    setBoom(true);
    damage(amount);
    window.setTimeout(() => setBoom(false), 450);
  };

  useEffect(() => {
    const timer = window.setInterval(() => dropPickaxe(20), 1700);
    return () => window.clearInterval(timer);
  }, [dropPickaxe]);

  const hpPercent = Math.max(0, (hp / block.maxHp) * 100);

  return (
    <main className={`page ${boom ? "shake" : ""}`}>
      <section className="game">
        <div className="skyGlow" />
        <header>
          <div className="live">● LIVE</div>
          <div className="score">SCORE {score.toLocaleString()}</div>
        </header>

        <div className="title">BREAK THE BLOCK!</div>
        <div className="subtitle">LIKE = PICKAXE • SUB = TNT</div>

        <div className="arena">
          <div className={`pickaxe ${falling ? "fall" : ""}`}>⛏️</div>
          {boom && <div className="explosion">💥</div>}
          <div className="blockName">{block.icon} {block.name}</div>
          <div className="hpText">{hp} / {block.maxHp} HP</div>
          <div className="hpBar"><div style={{ width: `${hpPercent}%` }} /></div>
          <button className="block" onClick={() => dropPickaxe(20)} aria-label="Mine block">
            <span>{block.icon}</span>
            <span className="cracks">✦</span>
          </button>
          <div className="depth">DEPTH {level + 1} • HITS {hits}</div>
        </div>

        <div className="controls">
          <button onClick={() => dropPickaxe(20)}>👍 LIKE<br/><small>+ PICKAXE</small></button>
          <button onClick={() => explode(120)}>🔔 SUB<br/><small>+ TNT</small></button>
          <button onClick={() => explode(300)}>🧨 TNT<br/><small>120 DMG</small></button>
          <button className="nuke" onClick={() => explode(9999)}>☢️ NUKE<br/><small>DESTROY</small></button>
        </div>

        <footer>DEMO MODE • YouTube events will be connected next</footer>
      </section>
    </main>
  );
}
