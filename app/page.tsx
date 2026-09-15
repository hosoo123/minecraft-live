"use client";
import { useCallback, useEffect, useRef, useState } from "react";
type Drop = {
  id: number;
  type: "pick" | "tnt";
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  life: number;
  name: string;
  tier: number;
};
type Cell = {
  hp: number;
  max: number;
  ore: number;
  kind: number;
  crack: number;
};
type Leader = { name: string; points: number };
type Weather = "clear" | "rain" | "snow";
const NAMES = [
    "Ariumikka",
    "you",
    "андрэй",
    "keith",
    "豚さん",
    "andrew",
    "dontbody",
    "imissu",
    "ささみ",
    "xiang pe",
  ],
  ORES = ["COAL", "COPPER", "GOLD", "LAPIS", "DIAMOND", "EMERALD"];
export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    drops = useRef<Drop[]>([]),
    grid = useRef<Cell[][]>([]),
    uid = useRef(0),
    frame = useRef(0),
    depthRef = useRef(0),
    scrollY = useRef(0),
    scrollRows = useRef(0),
    soundRef = useRef(false),
    audioRef = useRef<AudioContext | null>(null),
    audioFiles = useRef<Record<string, HTMLAudioElement>>({}),
    ambienceRef = useRef<HTMLAudioElement | null>(null),
    lastSound = useRef<Record<string, number>>({}),
    weatherRef = useRef<Weather>("clear"),
    weatherStarted = useRef(0),
    pageHidden = useRef(false),
    assets = useRef<Record<string, HTMLImageElement>>({}),
    playerPoints = useRef<Record<string, number>>({});
  const [score, setScore] = useState(0),
    [depth, setDepth] = useState(0),
    [combo, setCombo] = useState(1),
    [sound, setSound] = useState(false),
    [event, setEvent] = useState("PICKAXE RAIN"),
    [count, setCount] = useState([0, 0, 0, 0, 0, 0]),
    [leaders, setLeaders] = useState<Leader[]>([]),
    [feed, setFeed] = useState<string[]>([]),
    [raid, setRaid] = useState(45),
    [mounted, setMounted] = useState(false);
  const changeWeather = (next: Weather) => {
    weatherRef.current = next;
    weatherStarted.current = performance.now();
    setEvent(
      next === "rain"
        ? "🌧 RAIN STORM"
        : next === "snow"
          ? "❄ SNOW BIOME"
          : "☀ CLEAR SKY",
    );
    ambienceRef.current?.pause();
    ambienceRef.current = null;
    if (next === "rain" && soundRef.current) {
      const rain = new Audio("/sounds/rain.ogg");
      rain.loop = true;
      rain.volume = 0.14;
      ambienceRef.current = rain;
      void rain.play().catch(() => undefined);
    }
  };
  const toggleSound = () => {
    const next = !soundRef.current;
    soundRef.current = next;
    setSound(next);
    if (!next) {
      ambienceRef.current?.pause();
      ambienceRef.current = null;
    }
    if (next) {
      audioRef.current ||= new AudioContext();
      void audioRef.current.resume();
      const audio = audioRef.current;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(440, audio.currentTime);
      osc.frequency.setValueAtTime(660, audio.currentTime + 0.08);
      gain.gain.setValueAtTime(0.07, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.22);
      osc.start();
      osc.stop(audio.currentTime + 0.23);
      const sample = audioFiles.current.hit;
      if (sample) {
        const test = sample.cloneNode(true) as HTMLAudioElement;
        test.volume = 0.22;
        void test.play();
      }
      if (weatherRef.current === "rain") changeWeather("rain");
    }
  };
  useEffect(() => setMounted(true), []);
  const makeRow = useCallback(
    (row: number) =>
      Array.from({ length: 8 }, (_, x) => {
        const ore =
            Math.random() < 0.22
              ? Math.min(5, Math.floor(row / 7) + Math.floor(Math.random() * 2))
              : -1,
          max = 2,
          isBedrock = x === 0 || x === 7;
        return {
          hp: isBedrock ? 1 : max,
          max: isBedrock ? 1 : max,
          ore: isBedrock ? -1 : ore,
          kind: isBedrock ? 9 : (x + row) % 4,
          crack: 0,
        };
      }),
    [],
  );
  const spawn = useCallback(
    (type: "pick" | "tnt" | "mega" = "pick", forcedName?: string) => {
      if (pageHidden.current) return;
      const amount = type === "mega" ? 5 : type === "tnt" ? 3 : 1,
        name = forcedName || NAMES[Math.floor(Math.random() * NAMES.length)],
        points = type === "mega" ? 90 : type === "tnt" ? 30 : 10;
      for (let i = 0; i < amount; i++)
        drops.current.push({
          id: ++uid.current,
          type: type === "mega" ? "pick" : type,
          x: 75 + Math.random() * 300,
          y: -40 - Math.random() * 170,
          vx: (Math.random() - 0.5) * 2.2,
          vy: 1 + Math.random() * 2,
          rot: Math.random() * 6.2,
          vr: (Math.random() - 0.5) * 0.16,
          life: 900,
          name: i === 0 ? name : "",
          tier: Math.min(
            3,
            Math.floor(Math.random() * (1 + depthRef.current / 8)),
          ),
        });
      playerPoints.current[name] = (playerPoints.current[name] || 0) + points;
      setLeaders(
        Object.entries(playerPoints.current)
          .map(([n, p]) => ({ name: n, points: p }))
          .sort((a, b) => b.points - a.points)
          .slice(0, 3),
      );
      setFeed((f) => [`${name}  +${points} XP`, ...f].slice(0, 2));
      setEvent(
        type === "mega"
          ? "⚡ PICKAXE STORM!"
          : type === "tnt"
            ? "💥 TNT DROP!"
            : "⛏ NEW PICKAXE",
      );
    },
    [],
  );
  useEffect(() => {
    const handleVisibility = () => {
      pageHidden.current = document.hidden;
    };
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    const files = [
      "stone",
      "coal_ore",
      "copper_ore",
      "gold_ore",
      "lapis_ore",
      "diamond_ore",
      "emerald_ore",
      "bedrock",
      "tnt",
      "wooden_pickaxe",
      "copper_pickaxe",
      "diamond_pickaxe",
      "netherite_pickaxe",
      "cave_background",
      "snow",
    ];
    for (const file of files) {
      const img = new Image();
      img.src =
        file === "cave_background"
          ? "/assets/cave_background.webp"
          : `/assets/${file}.png`;
      img.onload = () => {
        assets.current[file] = img;
      };
    }
    for (const file of ["hit", "break", "boom"]) {
      const audio = new Audio(`/sounds/${file}.wav`);
      audio.preload = "auto";
      audioFiles.current[file] = audio;
    }
    grid.current = Array.from({ length: 13 }, (_, r) => makeRow(r));
    const t = setInterval(() => spawn("pick"), 1650);
    const r = setInterval(
      () =>
        setRaid((v) => {
          if (v > 1) return v - 1;
          spawn("mega", "LUCKY RAID");
          return 45;
        }),
      1000,
    );
    const c = setInterval(() => setCombo((v) => Math.max(1, v - 1)), 1800);
    const w = setInterval(
      () =>
        changeWeather(
          weatherRef.current === "clear"
            ? "rain"
            : weatherRef.current === "rain"
              ? "snow"
              : "clear",
        ),
      28000,
    );
    return () => {
      clearInterval(t);
      clearInterval(r);
      clearInterval(c);
      clearInterval(w);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [makeRow, spawn]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 450;
    canvas.height = 800;
    const play = (kind: "hit" | "break" | "boom") => {
      const now = performance.now();
      const cooldown = kind === "hit" ? 150 : kind === "break" ? 260 : 650;
      if (!soundRef.current || now - (lastSound.current[kind] || 0) < cooldown)
        return;
      lastSound.current[kind] = now;
      const sample = audioFiles.current[kind];
      if (sample) {
        const voice = sample.cloneNode(true) as HTMLAudioElement;
        voice.volume = kind === "boom" ? 0.34 : kind === "break" ? 0.2 : 0.1;
        void voice.play().catch(() => undefined);
        return;
      }
      const audio = audioRef.current;
      if (!audio) return;
      const osc = audio.createOscillator(),
        gain = audio.createGain();
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.type = kind === "hit" ? "square" : "sawtooth";
      osc.frequency.setValueAtTime(
        kind === "hit" ? 115 : kind === "break" ? 360 : 75,
        audio.currentTime,
      );
      osc.frequency.exponentialRampToValueAtTime(
        kind === "boom" ? 28 : 70,
        audio.currentTime + 0.14,
      );
      gain.gain.setValueAtTime(
        kind === "boom" ? 0.32 : kind === "break" ? 0.2 : 0.16,
        audio.currentTime,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audio.currentTime + (kind === "boom" ? 0.48 : 0.22),
      );
      osc.start();
      osc.stop(audio.currentTime + (kind === "boom" ? 0.5 : 0.23));
    };
    const hit = (d: Drop) => {
      if (scrollRows.current) return false;
      const halfWidth = d.type === "tnt" ? 28 : 36,
        leftWall = 56.25,
        rightWall = 8 * 56.25 - 56.25;
      if (d.x - halfWidth < leftWall) {
        d.x = leftWall + halfWidth;
        d.vx = Math.abs(d.vx) + 0.25;
        return true;
      }
      if (d.x + halfWidth > rightWall) {
        d.x = rightWall - halfWidth;
        d.vx = -Math.abs(d.vx) - 0.25;
        return true;
      }
      const top = 285,
        row = Math.floor((d.y + halfWidth - top) / 50),
        col = Math.floor(d.x / 56.25);
      if (row < 0 || row >= grid.current.length || col < 0 || col > 7)
        return false;
      let collisionRow = row;
      while (collisionRow > 0 && grid.current[collisionRow - 1]?.[col]?.hp > 0)
        collisionRow--;
      const cell = grid.current[collisionRow]?.[col];
      if (!cell || cell.hp <= 0 || cell.kind === 9) return false;
      const damage = d.type === "tnt" ? 8 : 1;
      cell.hp -= damage;
      cell.crack = 1 - cell.hp / cell.max;
      play(d.type === "tnt" ? "boom" : cell.hp <= 0 ? "break" : "hit");
      setScore((s) => s + damage * 10);
      setCombo((c) => Math.min(99, c + 1));
      if (cell.hp <= 0) {
        if (cell.ore >= 0)
          setCount((old) => old.map((v, i) => (i === cell.ore ? v + 1 : v)));
        setScore((s) => s + 100 + (cell.ore + 1) * 80);
      }
      if (d.type === "tnt") {
        for (
          let ry = Math.max(0, collisionRow - 1);
          ry <= Math.min(12, collisionRow + 1);
          ry++
        )
          for (
            let cx = Math.max(0, col - 1);
            cx <= Math.min(7, col + 1);
            cx++
          ) {
            const c = grid.current[ry][cx];
            if (c.kind === 9) continue;
            c.hp -= 5;
            c.crack = 1 - c.hp / c.max;
          }
        d.life = 0;
      } else {
        d.vy = -Math.abs(d.vy) * 0.48;
        d.vx += (Math.random() - 0.5) * 2;
        d.y = top + collisionRow * 50 - 18;
        d.life -= 90;
      }
      return true;
    };
    const drawDrop = (d: Drop) => {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.imageSmoothingEnabled = false;
      const names = [
          "wooden_pickaxe",
          "copper_pickaxe",
          "diamond_pickaxe",
          "netherite_pickaxe",
        ],
        img = assets.current[d.type === "tnt" ? "tnt" : names[d.tier]],
        size = d.type === "tnt" ? 56 : 72;
      if (img) ctx.drawImage(img, -size / 2, -size / 2, size, size);
      else {
        ctx.fillStyle = d.type === "tnt" ? "#e53935" : "#b9e8ee";
        ctx.fillRect(-18, -18, 36, 36);
      }
      ctx.restore();
      ctx.font = "bold 11px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 5;
      if (d.name) ctx.fillText(d.name, d.x, d.y - 40);
      ctx.shadowBlur = 0;
    };
    const loop = () => {
      frame.current = requestAnimationFrame(loop);
      if (pageHidden.current) return;
      ctx.clearRect(0, 0, 450, 800);
      const g = ctx.createLinearGradient(0, 0, 0, 800);
      g.addColorStop(0, "#08172d");
      g.addColorStop(0.36, "#163c63");
      g.addColorStop(0.365, "#162235");
      g.addColorStop(1, "#080b16");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 450, 800);
      const background = assets.current.cave_background;
      if (background) {
        ctx.globalAlpha = weatherRef.current === "clear" ? 0.72 : 0.38;
        ctx.drawImage(background, 0, 0, 450, 285);
        ctx.globalAlpha = 1;
      }
      if (weatherRef.current === "rain") {
        ctx.fillStyle = "rgba(7,16,30,.5)";
        ctx.fillRect(0, 0, 450, 800);
        ctx.fillStyle = "rgba(122,180,220,.72)";
        for (let i = 0; i < 52; i++) {
          const x = (i * 79 + (i % 4) * 17) % 450;
          const y = (i * 113 + performance.now() * 0.48) % 820;
          ctx.fillRect(Math.floor(x), Math.floor(y), 2, 15 + (i % 3) * 5);
        }
      }
      if (weatherRef.current === "snow") {
        ctx.fillStyle = "rgba(170,205,226,.2)";
        ctx.fillRect(0, 0, 450, 800);
        for (let i = 0; i < 48; i++) {
          const x =
            (i * 97 + Math.sin(performance.now() * 0.001 + i) * 14) % 460;
          const y = (i * 61 + performance.now() * 0.055 * ((i % 3) + 1)) % 820;
          const size = 2 + (i % 2) * 2;
          ctx.fillStyle = i % 3 ? "#fff" : "#dcefff";
          ctx.fillRect(x, y, size, size);
        }
      }
      ctx.fillStyle = "#ffffff08";
      for (let i = 0; i < 30; i++)
        ctx.fillRect((i * 97) % 450, (i * 53) % 270, 2, 2);
      const top = 285;
      grid.current.forEach((row, r) =>
        row.forEach((c, x) => {
          if (c.hp <= 0) return;
          const px = x * 56.25,
            py = top + r * 50 + scrollY.current,
            texture =
              c.kind === 9
                ? "bedrock"
                : c.ore >= 0
                  ? `${ORES[c.ore].toLowerCase()}_ore`
                  : "stone",
            img = assets.current[texture];
          ctx.imageSmoothingEnabled = false;
          if (img) ctx.drawImage(img, px, py, 57, 51);
          else {
            ctx.fillStyle = "#666";
            ctx.fillRect(px, py, 57, 51);
          }
          ctx.strokeStyle = "#1119";
          ctx.strokeRect(px + 0.5, py + 0.5, 55.25, 49);
          const aboveOpen = r === 0 || grid.current[r - 1][x].hp <= 0;
          if (weatherRef.current === "snow" && aboveOpen) {
            const snow = assets.current.snow;
            ctx.globalAlpha = Math.min(
              1,
              (performance.now() - weatherStarted.current) / 9000,
            );
            if (snow) ctx.drawImage(snow, px, py - 2, 57, 9);
            else {
              ctx.fillStyle = "#f5fbff";
              ctx.fillRect(px, py - 2, 57, 8);
            }
            ctx.globalAlpha = 1;
          }
          if (c.crack > 0.15) {
            const crackStage = Math.ceil(c.crack * 3);
            ctx.save();
            ctx.strokeStyle = `rgba(8,10,14,${Math.min(0.95, c.crack + 0.25)})`;
            ctx.lineWidth = 2.5;
            ctx.lineCap = "square";
            const cracks = [
              [
                [px + 28, py],
                [px + 24, py + 13],
                [px + 34, py + 24],
                [px + 25, py + 39],
                [px + 30, py + 50],
              ],
              [
                [px + 24, py + 13],
                [px + 12, py + 9],
                [px + 5, py + 17],
              ],
              [
                [px + 34, py + 24],
                [px + 46, py + 19],
                [px + 54, py + 27],
              ],
              [
                [px + 25, py + 39],
                [px + 13, py + 43],
                [px + 6, py + 49],
              ],
            ];
            cracks.slice(0, crackStage + 1).forEach((path) => {
              ctx.beginPath();
              path.forEach(([xPoint, yPoint], index) =>
                index ? ctx.lineTo(xPoint, yPoint) : ctx.moveTo(xPoint, yPoint),
              );
              ctx.stroke();
            });
            ctx.restore();
          }
        }),
      );
      const bedrock = assets.current.bedrock;
      if (bedrock) {
        ctx.imageSmoothingEnabled = false;
        for (let y = top; y < 800; y += 50) {
          ctx.drawImage(bedrock, 0, y, 56.25, 51);
          ctx.drawImage(bedrock, 393.75, y, 56.25, 51);
        }
      }
      let cleared = 0;
      for (const row of grid.current) {
        const shaftOpen = row.some(
          (cell, index) =>
            index < row.length - 1 && cell.hp <= 0 && row[index + 1].hp <= 0,
        );
        if (shaftOpen) cleared++;
        else break;
      }
      if (cleared && !scrollRows.current) {
        scrollRows.current = cleared;
        setEvent(cleared >= 2 ? "🔥 DEEP DROP!" : "⬇ SMOOTH DESCENT");
      }
      if (scrollRows.current) {
        const targetOffset = -50 * scrollRows.current;
        scrollY.current += (targetOffset - scrollY.current) * 0.14;
        if (Math.abs(targetOffset - scrollY.current) < 0.7) {
          const rows = scrollRows.current;
          grid.current.splice(0, rows);
          for (let i = 0; i < rows; i++) {
            const target = depthRef.current + rows + 13 + i;
            grid.current.push(makeRow(target));
          }
          depthRef.current += rows;
          setDepth(depthRef.current);
          if (depthRef.current % 25 === 0) setEvent("☠ BEDROCK BOSS!");
          scrollY.current = 0;
          scrollRows.current = 0;
        }
      }
      for (const d of drops.current) {
        d.vy = Math.min(d.vy + 0.16, 8);
        d.x += d.vx;
        d.y += d.vy;
        d.rot += d.vr;
        d.life--;
        if (d.x < 15 || d.x > 435) d.vx *= -0.8;
        if (d.y > 265) hit(d);
        drawDrop(d);
      }
      drops.current = drops.current.filter((d) => d.life > 0 && d.y < 820);
    };
    loop();
    return () => cancelAnimationFrame(frame.current);
  }, [makeRow, mounted]);
  if (!mounted) return null;
  return (
    <main className="shell">
      <section className="liveGame">
        <canvas ref={canvasRef} />
        <header>
          <div className="live">
            <i />
            LIVE
          </div>
          <div className="metric">
            <small>SCORE</small>
            <b>{score.toLocaleString()}</b>
          </div>
          <div className="metric">
            <small>DEPTH</small>
            <b>{depth}m</b>
          </div>
          <button
            onClick={toggleSound}
            title={sound ? "Sound on" : "Sound off"}
          >
            {sound ? "🔊" : "🔇"}
          </button>
        </header>
        <div className="logo">
          <small>INTERACTIVE LIVE</small>
          <strong>
            MINE <em>RUSH</em>
          </strong>
          <span>LIKE = PICKAXE　•　SUB = TNT</span>
        </div>
        <aside>
          {ORES.map((o, i) => (
            <div key={o}>
              <img src={`/assets/${o.toLowerCase()}_ore.png`} alt="" />
              <span>{o}</span>
              <b>{count[i]}</b>
            </div>
          ))}
        </aside>
        <div className="event">
          <span>{event}</span>
          <b>COMBO x{combo}</b>
        </div>
        <div className="leaderboard">
          <h3>🏆 TOP MINERS</h3>
          {leaders.map((p, i) => (
            <div key={p.name}>
              <b>#{i + 1}</b>
              <span>{p.name}</span>
              <em>{p.points} XP</em>
            </div>
          ))}
        </div>
        <div className="raidTimer">
          LUCKY RAID IN <b>{raid}s</b>
        </div>
        <div className="bossMeter">
          <label>NEXT BEDROCK BOSS</label>
          <div>
            <i style={{ width: `${(depth % 25) * 4}%` }} />
          </div>
          <b>{25 - (depth % 25)}m</b>
        </div>
        <nav>
          <button onClick={() => spawn("pick", "LIKE")}>
            👍<b>LIKE</b>
            <small>+ PICKAXE</small>
          </button>
          <button onClick={() => spawn("tnt", "NEW SUB")}>
            🔔<b>SUB</b>
            <small>+ 3 TNT</small>
          </button>
          <button onClick={() => spawn("mega", "SUPER CHAT")}>
            ⚡<b>STORM</b>
            <small>5× PICKAXE</small>
          </button>
        </nav>
      </section>
    </main>
  );
}
