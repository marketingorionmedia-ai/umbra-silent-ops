/* UMBRA // SILENT OPS — juego de sigilo top-down. Sin dependencias. */
'use strict';
(() => {
const T = 32;                 // tamaño de tile (unidades de mundo)
const MAX_LEVEL = 100;
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

/* ---------- RNG determinista por nivel ---------- */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ---------- Zonas ---------- */
const ZONES = [
  { name: 'MUELLE',      floor: '#18222f', floor2: '#1b2635', wall: '#3a4b63', wallTop: '#55698a', crate: '#6b5537', accent: '#2ee6ff' },
  { name: 'OFICINAS',    floor: '#1f1d2b', floor2: '#232131', wall: '#48425e', wallTop: '#6a6288', crate: '#4b5a6e', accent: '#a46bff' },
  { name: 'LABORATORIO', floor: '#13231e', floor2: '#162922', wall: '#2c5547', wallTop: '#46806b', crate: '#5d6b74', accent: '#37f59a' },
  { name: 'CASINO',      floor: '#26131d', floor2: '#2c1622', wall: '#57283e', wallTop: '#81405f', crate: '#7a5a22', accent: '#ff4fa3' },
  { name: 'FORTALEZA',   floor: '#1b1a19', floor2: '#201f1d', wall: '#4a3f36', wallTop: '#6e5e50', crate: '#5b4a2c', accent: '#ff8a2e' },
];
const zoneOf = L => ZONES[Math.min(4, Math.floor((L - 1) / 20))];

/* ---------- Dificultad ---------- */
function params(L) {
  const k = (L - 1) / (MAX_LEVEL - 1);
  return {
    detTime: lerp(0.95, 0.38, k),
    range: lerp(4.0, 6.2, k) * T,
    fov: 72 * Math.PI / 180,
    fireInt: lerp(1.05, 0.6, k),
    react: lerp(0.5, 0.25, k),
    patrolSpd: lerp(36, 50, k),
    chaseSpd: lerp(70, 108, k),
    bulletSpd: lerp(270, 360, k),
  };
}

function missionFor(L) {
  if (L % 10 === 0) return 'boss';
  if (L <= 3) return 'eliminate';
  if (L >= 12 && L % 7 === 5) return 'ghost';
  return ['eliminate', 'target', 'intel'][L % 3];
}

/* ---------- Grid helpers ---------- */
function flood(grid, cols, rows, sx, sy) {
  const dist = new Int16Array(cols * rows).fill(-1);
  const q = [sx + sy * cols]; dist[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % cols, y = (i / cols) | 0;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of n) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const j = nx + ny * cols;
      if (grid[j] !== 0 || dist[j] >= 0) continue;
      dist[j] = dist[i] + 1; q.push(j);
    }
  }
  return dist;
}

function bfsPath(grid, cols, rows, sx, sy, gx, gy) {
  if (sx === gx && sy === gy) return [{ x: gx, y: gy }];
  const prev = new Int32Array(cols * rows).fill(-2);
  const s = sx + sy * cols, g = gx + gy * cols;
  if (grid[g] !== 0) return null;
  const q = [s]; prev[s] = -1;
  for (let h = 0; h < q.length; h++) {
    const i = q[h]; if (i === g) break;
    const x = i % cols, y = (i / cols) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const j = nx + ny * cols;
      if (grid[j] !== 0 || prev[j] !== -2) continue;
      prev[j] = i; q.push(j);
    }
  }
  if (prev[g] === -2) return null;
  const out = [];
  for (let i = g; i !== -1; i = prev[i]) out.push({ x: i % cols, y: (i / cols) | 0 });
  return out.reverse();
}

/* ---------- Generador de niveles ---------- */
function genLevel(L) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const lv = tryGen(L, attempt);
    if (lv) return lv;
  }
  throw new Error('No se pudo generar el nivel ' + L);
}

function tryGen(L, attempt) {
  const R = rng(L * 7919 + 1234 + attempt * 104729);
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const cols = Math.min(13 + Math.floor(L / 9), 23);
  const rows = Math.min(19 + Math.floor(L / 6), 35);
  const grid = new Uint8Array(cols * rows).fill(1);
  const at = (x, y) => grid[x + y * cols];
  const set = (x, y, v) => { if (x > 0 && y > 0 && x < cols - 1 && y < rows - 1) grid[x + y * cols] = v; };

  // Salas
  const want = Math.min(4 + Math.floor(L / 8), 12);
  const rooms = [];
  for (let t = 0; t < 400 && rooms.length < want; t++) {
    const w = ri(4, 7), h = ri(4, 7);
    const x = ri(1, cols - w - 1), y = ri(1, rows - h - 1);
    if (rooms.some(r => x - 1 < r.x + r.w && x + w + 1 > r.x && y - 1 < r.y + r.h && y + h + 1 > r.y)) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
  }
  if (rooms.length < 3) return null;
  for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) set(x, y, 0);
  rooms.sort((a, b) => b.cy - a.cy || a.cx - b.cx); // sala 0 = la de más abajo (inicio)

  const corridor = (a, b) => {
    const wide = R() < 0.35;
    const carve = (x, y) => { set(x, y, 0); if (wide) { set(x + 1, y, 0); set(x, y + 1, 0); } };
    let x = a.cx, y = a.cy;
    const hFirst = R() < 0.5;
    const stepX = () => { while (x !== b.cx) { carve(x, y); x += Math.sign(b.cx - x); } };
    const stepY = () => { while (y !== b.cy) { carve(x, y); y += Math.sign(b.cy - y); } };
    if (hFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
    carve(x, y);
  };
  for (let i = 1; i < rooms.length; i++) {
    let best = 0, bd = 1e9;
    for (let j = 0; j < i; j++) { const d = Math.abs(rooms[i].cx - rooms[j].cx) + Math.abs(rooms[i].cy - rooms[j].cy); if (d < bd) { bd = d; best = j; } }
    corridor(rooms[i], rooms[best]);
  }
  const extra = Math.floor(rooms.length / 3);
  for (let i = 0; i < extra; i++) { const a = ri(0, rooms.length - 1), b = ri(0, rooms.length - 1); if (a !== b) corridor(rooms[a], rooms[b]); }

  const start = { x: rooms[0].cx, y: rooms[0].cy };
  const countFloor = () => { let c = 0; for (let i = 0; i < grid.length; i++) if (grid[i] === 0) c++; return c; };
  const reachAll = () => { const d = flood(grid, cols, rows, start.x, start.y); let c = 0; for (let i = 0; i < d.length; i++) if (d[i] >= 0) c++; return c === countFloor(); };
  if (!reachAll()) return null;

  // Cajas (cobertura) sin romper conectividad
  for (let ri2 = 1; ri2 < rooms.length; ri2++) {
    const r = rooms[ri2];
    const n = ri(0, Math.floor(r.w * r.h / 9));
    for (let k = 0; k < n; k++) {
      const x = ri(r.x + 1, r.x + r.w - 2), y = ri(r.y + 1, r.y + r.h - 2);
      if (at(x, y) !== 0 || (x === r.cx && y === r.cy)) continue;
      grid[x + y * cols] = 2;
      if (!reachAll()) grid[x + y * cols] = 0;
    }
  }

  const dStart = flood(grid, cols, rows, start.x, start.y);
  const floorTiles = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (at(x, y) === 0) floorTiles.push({ x, y, d: dStart[x + y * cols] });
  const maxD = Math.max(...floorTiles.map(t => t.d));
  if (maxD < 12) return null;

  // Salida: centro de sala más lejano
  let exitRoom = rooms[1];
  for (const r of rooms) if (dStart[r.cx + r.cy * cols] > dStart[exitRoom.cx + exitRoom.cy * cols]) exitRoom = r;
  const exit = { x: exitRoom.cx, y: exitRoom.cy };

  const used = [];
  const far = (t, m) => used.every(u => Math.abs(u.x - t.x) + Math.abs(u.y - t.y) >= m);
  const pickTile = (minD, sep, filter) => {
    const c = floorTiles.filter(t => t.d >= minD && !(t.x === exit.x && t.y === exit.y) && far(t, sep) && (!filter || filter(t)));
    if (!c.length) return null;
    const t = c[Math.floor(R() * c.length)];
    used.push(t); return t;
  };
  used.push(start, exit);

  const mission = missionFor(L);
  const P = params(L);
  const guards = [];
  const nG = Math.min(2 + Math.floor(L * 0.11) + (L > 50 ? 1 : 0), 15);

  const mkPatrol = (t) => {
    const d = flood(grid, cols, rows, t.x, t.y);
    const cand = floorTiles.filter(f => { const v = d[f.x + f.y * cols]; return v >= 4 && v <= 12 && f.d >= 4; });
    if (cand.length < 2) return null;
    const pts = [t];
    const wp = ri(1, 2);
    for (let i = 0; i < wp; i++) pts.push(cand[Math.floor(R() * cand.length)]);
    pts.push(t);
    let path = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = bfsPath(grid, cols, rows, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
      if (!p) return null;
      path = path.concat(i ? p.slice(1) : p);
    }
    path.pop();
    return path.length > 2 ? path : null;
  };

  const pickType = () => {
    const r = R();
    if (L >= 45 && r < 0.14) return 'heavy';
    if (L >= 30 && r < 0.26) return 'sniper';
    if (L >= 8 && r < 0.42) return 'dog';
    return 'guard';
  };

  for (let i = 0; i < nG; i++) {
    const t = pickTile(7, 3); if (!t) break;
    let type = i < 2 && L < 8 ? 'guard' : pickType();
    let patrol = null;
    if (type !== 'sniper' && R() < (type === 'dog' ? 0.85 : 0.62)) patrol = mkPatrol(t);
    guards.push({ type, x: t.x, y: t.y, ang: R() * Math.PI * 2, patrol, target: false });
  }
  if (guards.length < 2) return null;

  // Cámaras: en baldosas junto a muro
  const cams = [];
  if (L >= 18) {
    const nC = Math.min(Math.floor((L - 10) / 22) + (R() < 0.5 ? 1 : 0), 4);
    for (let i = 0; i < nC; i++) {
      const t = pickTile(8, 4, f => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(f.x + dx, f.y + dy) === 1));
      if (!t) break;
      // mira hacia el lado contrario al muro
      let base = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(t.x + dx, t.y + dy) === 1) base = Math.atan2(-dy, -dx);
      cams.push({ x: t.x, y: t.y, base });
    }
  }

  // Objetivos de misión
  const intel = [];
  if (mission === 'target') {
    const c = guards.filter(g => g.type === 'guard' || g.type === 'sniper');
    if (!c.length) return null;
    const n = Math.min(c.length, 1 + Math.floor(L / 35));
    for (let i = 0; i < n; i++) c[i].target = true;
  }
  if (mission === 'boss') {
    const t = pickTile(Math.floor(maxD * 0.55), 3);
    if (!t) return null;
    guards.push({ type: 'boss', x: t.x, y: t.y, ang: R() * Math.PI * 2, patrol: null, target: true });
  }
  if (mission === 'intel') {
    const n = 1 + Math.floor(L / 30);
    for (let i = 0; i < n; i++) { const t = pickTile(8, 5); if (!t) return null; intel.push({ x: t.x, y: t.y }); }
  }
  const coins = [];
  const nCoins = 6 + Math.floor(L / 15);
  for (let i = 0; i < nCoins; i++) { const t = pickTile(2, 2); if (t) coins.push({ x: t.x, y: t.y }); }

  return { L, cols, rows, grid, start, exit, guards, cams, intel, coins, mission, P, zone: zoneOf(L) };
}

/* ---------- Guardado ---------- */
const SAVE_KEY = 'umbra-save-v1';
const DEFAULT_SAVE = { unlocked: 1, stars: {}, coins: 0, upg: { hp: 0, spd: 0, reach: 0 }, skins: ['sombra'], skin: 'sombra', sound: true, vib: true };
let save;
function loadSave() {
  try { save = Object.assign({}, DEFAULT_SAVE, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); }
  catch (e) { save = JSON.parse(JSON.stringify(DEFAULT_SAVE)); }
  save.upg = Object.assign({ hp: 0, spd: 0, reach: 0 }, save.upg);
  if (!Array.isArray(save.skins)) save.skins = ['sombra'];
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const SKINS = [
  { id: 'sombra', name: 'Sombra', price: 0, body: '#15171c', scarf: '#2ee6ff' },
  { id: 'carmesi', name: 'Carmesí', price: 300, body: '#1a1012', scarf: '#ff3b4e' },
  { id: 'jade', name: 'Jade', price: 600, body: '#0f1a15', scarf: '#37f59a' },
  { id: 'oro', name: 'Oro', price: 1200, body: '#1c1810', scarf: '#ffcf3a' },
  { id: 'neon', name: 'Neón', price: 2000, body: '#160f22', scarf: '#c86bff' },
  { id: 'fantasma', name: 'Fantasma', price: 3500, body: '#d9e2ec', scarf: '#ffffff' },
];
const UPGRADES = {
  hp:    { name: 'Vida extra', desc: '+1 corazón', prices: [200, 600] },
  spd:   { name: 'Velocidad', desc: '+8% de movimiento', prices: [150, 450, 900] },
  reach: { name: 'Alcance', desc: 'Golpeas desde más lejos', prices: [150, 450, 900] },
};

/* ---------- Audio ---------- */
let AC = null;
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
function tone(freq, dur, type = 'square', vol = 0.06, slide = 0) {
  if (!save.sound) return; const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = freq;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), a.currentTime + dur);
  g.gain.value = vol; g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + dur);
}
function noise(dur, vol = 0.08, hp = 800) {
  if (!save.sound) return; const a = audio(); if (!a) return;
  const b = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol; s.buffer = b; s.connect(f); f.connect(g); g.connect(a.destination); s.start();
}
const SFX = {
  kill() { noise(0.12, 0.12, 1200); tone(180, 0.15, 'sawtooth', 0.05, -120); },
  coin() { tone(988, 0.07, 'square', 0.04); setTimeout(() => tone(1319, 0.09, 'square', 0.04), 60); },
  shot() { noise(0.08, 0.07, 2000); },
  alert() { tone(660, 0.1, 'square', 0.05); setTimeout(() => tone(880, 0.14, 'square', 0.05), 90); },
  hurt() { tone(140, 0.2, 'sawtooth', 0.08, -60); },
  pick() { tone(523, 0.08, 'triangle', 0.06); setTimeout(() => tone(784, 0.12, 'triangle', 0.06), 70); },
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.07), i * 90)); },
  lose() { [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sawtooth', 0.05), i * 120)); },
  alarm() { tone(900, 0.25, 'square', 0.05, -400); },
};
const vibe = p => { if (save.vib && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} };

/* ---------- Estado del juego ---------- */
const cv = $('#game'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() { DPR = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight; cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
window.addEventListener('resize', resize); resize();

let G = null;   // partida actual
let running = false, paused = false;

function solidAt(tx, ty) { if (!G) return true; if (tx < 0 || ty < 0 || tx >= G.cols || ty >= G.rows) return true; return G.grid[tx + ty * G.cols] !== 0; }

function ray(x, y, ang, max) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  let tx = Math.floor(x / T), ty = Math.floor(y / T);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
  const tdx = Math.abs(T / dx), tdy = Math.abs(T / dy);
  let tmx = dx > 0 ? ((tx + 1) * T - x) / dx : dx < 0 ? (x - tx * T) / -dx : Infinity;
  let tmy = dy > 0 ? ((ty + 1) * T - y) / dy : dy < 0 ? (y - ty * T) / -dy : Infinity;
  for (let i = 0; i < 64; i++) {
    let d;
    if (tmx < tmy) { tx += sx; d = tmx; tmx += tdx; } else { ty += sy; d = tmy; tmy += tdy; }
    if (d >= max) return max;
    if (solidAt(tx, ty)) return d;
  }
  return max;
}
function los(a, b) { const d = Math.hypot(b.x - a.x, b.y - a.y); return ray(a.x, a.y, Math.atan2(b.y - a.y, b.x - a.x), d) >= d - 2; }

function moveCircle(e, dx, dy) {
  const r = e.r;
  if (dx) {
    e.x += dx;
    const y0 = Math.floor((e.y - r + 0.5) / T), y1 = Math.floor((e.y + r - 0.5) / T);
    if (dx > 0) { const tx = Math.floor((e.x + r) / T); for (let y = y0; y <= y1; y++) if (solidAt(tx, y)) { e.x = tx * T - r - 0.01; break; } }
    else { const tx = Math.floor((e.x - r) / T); for (let y = y0; y <= y1; y++) if (solidAt(tx, y)) { e.x = (tx + 1) * T + r + 0.01; break; } }
  }
  if (dy) {
    e.y += dy;
    const x0 = Math.floor((e.x - r + 0.5) / T), x1 = Math.floor((e.x + r - 0.5) / T);
    if (dy > 0) { const ty = Math.floor((e.y + r) / T); for (let x = x0; x <= x1; x++) if (solidAt(x, ty)) { e.y = ty * T - r - 0.01; break; } }
    else { const ty = Math.floor((e.y - r) / T); for (let x = x0; x <= x1; x++) if (solidAt(x, ty)) { e.y = (ty + 1) * T + r + 0.01; break; } }
  }
}
const ctr = t => ({ x: t.x * T + T / 2, y: t.y * T + T / 2 });

function startLevel(L) {
  const lv = genLevel(L);
  const P = lv.P;
  const hpMax = 3 + save.upg.hp;
  G = {
    L, lv, P, cols: lv.cols, rows: lv.rows, grid: lv.grid.slice(), zone: lv.zone, mission: lv.mission,
    t: 0, grace: 1.2,
    player: { ...ctr(lv.start), r: 10, ang: -Math.PI / 2, hp: hpMax, hpMax, inv: 0, spd: 118 * (1 + 0.08 * save.upg.spd), reach: 14 + save.upg.reach * 4, walk: 0, dash: 0 },
    guards: lv.guards.map(s => mkGuard(s, P)),
    cams: lv.cams.map(c => ({ ...ctr(c), base: c.base, ang: c.base, meter: 0, cool: 0, phase: Math.random() * 6 })),
    coins: lv.coins.map(c => ({ ...ctr(c), got: false })),
    intel: lv.intel.map(c => ({ ...ctr(c), got: false })),
    exit: ctr(lv.exit),
    bullets: [], parts: [], floaters: [],
    coinsGot: 0, detected: false, over: false, endT: 0, shake: 0,
    cam: { x: 0, y: 0 },
  };
  const ct = camTarget(); G.cam.x = ct.x; G.cam.y = ct.y;
  updateHUD();
}

function mkGuard(s, P) {
  const base = ctr(s);
  const g = {
    type: s.type, x: base.x, y: base.y, ang: s.ang, home: { ...base, ang: s.ang }, r: 11, target: s.target,
    state: s.patrol ? 'patrol' : 'idle', meter: 0, path: null, pi: 0,
    patrol: s.patrol ? s.patrol.map(ctr) : null, ppi: 0,
    range: P.range, fov: P.fov, spd: P.patrolSpd, chase: P.chaseSpd, fireInt: P.fireInt, react: P.react,
    fireCd: 0, reactT: 0, lastSeen: null, searchT: 0, lookT: Math.random() * 6, lostT: 0, repath: 0,
    seesPlayer: false, bodiesSeen: new Set(), dead: false, bite: 0, dmg: 1, bulletSpd: P.bulletSpd,
  };
  if (g.type === 'dog') { g.r = 9; g.range = P.range * 0.7; g.fov = 110 * Math.PI / 180; g.spd *= 1.3; g.chase *= 1.55; }
  if (g.type === 'sniper') { g.range = P.range * 1.6; g.fov = 26 * Math.PI / 180; g.fireInt *= 1.7; g.bulletSpd *= 1.6; g.dmg = 2; }
  if (g.type === 'heavy') { g.r = 13; g.spd *= 0.8; g.chase *= 0.75; g.fireInt *= 0.7; }
  if (g.type === 'boss') { g.r = 14; g.range = P.range * 1.15; g.fov = 84 * Math.PI / 180; }
  return g;
}

const killableGuards = () => G.guards;
function objectivesDone() {
  const m = G.mission;
  if (m === 'eliminate') return G.guards.every(g => g.dead);
  if (m === 'target' || m === 'boss') return G.guards.filter(g => g.target).every(g => g.dead);
  if (m === 'intel') return G.intel.every(i => i.got);
  return true; // ghost
}
function needsExit() { return G.mission !== 'eliminate'; }

/* ---------- Input ---------- */
const input = { active: false, ox: 0, oy: 0, x: 0, y: 0, keys: {} };
cv.addEventListener('pointerdown', e => { if (!running || paused) return; audio(); input.active = true; input.ox = input.x = e.clientX; input.oy = input.y = e.clientY; input.id = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
cv.addEventListener('pointermove', e => { if (input.active && e.pointerId === input.id) { input.x = e.clientX; input.y = e.clientY; } });
const endPtr = e => { if (e.pointerId === input.id) input.active = false; };
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
window.addEventListener('keydown', e => { input.keys[e.key.toLowerCase()] = true; if (e.key === 'Escape' && running) togglePause(); });
window.addEventListener('keyup', e => { input.keys[e.key.toLowerCase()] = false; });
function moveVec() {
  let x = 0, y = 0;
  const k = input.keys;
  if (k['a'] || k['arrowleft']) x -= 1; if (k['d'] || k['arrowright']) x += 1;
  if (k['w'] || k['arrowup']) y -= 1; if (k['s'] || k['arrowdown']) y += 1;
  if (x || y) { const m = Math.hypot(x, y); return { x: x / m, y: y / m, m: 1 }; }
  if (input.active) {
    let dx = input.x - input.ox, dy = input.y - input.oy; const d = Math.hypot(dx, dy); const R = 46;
    if (d > R) { input.ox = input.x - dx / d * R; input.oy = input.y - dy / d * R; dx = input.x - input.ox; dy = input.y - input.oy; }
    const dd = Math.hypot(dx, dy); if (dd < 6) return { x: 0, y: 0, m: 0 };
    return { x: dx / dd, y: dy / dd, m: clamp(dd / R, 0.35, 1) };
  }
  return { x: 0, y: 0, m: 0 };
}

/* ---------- Update ---------- */
function update(dt) {
  G.t += dt; G.grace -= dt; G.shake = Math.max(0, G.shake - dt * 18);
  const p = G.player;
  if (!G.over) {
    const v = moveVec();
    if (v.m) {
      moveCircle(p, v.x * p.spd * v.m * dt, v.y * p.spd * v.m * dt);
      p.ang = Math.atan2(v.y, v.x); p.walk += dt * 12 * v.m;
    }
    p.inv = Math.max(0, p.inv - dt); p.dash = Math.max(0, p.dash - dt);

    // Eliminaciones
    for (const g of G.guards) {
      if (g.dead) continue;
      const d = Math.hypot(g.x - p.x, g.y - p.y);
      if (d > p.r + g.r + p.reach) continue;
      const fromAng = Math.atan2(p.y - g.y, p.x - g.x);
      const behind = Math.abs(angDiff(g.ang, fromAng)) > 1.9;
      let ok;
      if (g.type === 'heavy' || g.type === 'boss') ok = behind || (g.state !== 'alert' && !g.seesPlayer && Math.abs(angDiff(g.ang, fromAng)) > 1.2);
      else if (g.type === 'dog') ok = g.state !== 'alert';
      else ok = g.state !== 'alert' || d < p.r + g.r + 4 || behind;
      if (ok) killGuard(g);
      else if (g.type === 'heavy' || g.type === 'boss') { if (g.state !== 'alert') alertGuard(g); }
    }

    // Recolección
    for (const c of G.coins) if (!c.got && Math.hypot(c.x - p.x, c.y - p.y) < 18) { c.got = true; G.coinsGot++; SFX.coin(); floater(c.x, c.y, '+5', '#ffd23a'); updateHUD(); }
    for (const c of G.intel) if (!c.got && Math.hypot(c.x - p.x, c.y - p.y) < 20) { c.got = true; SFX.pick(); vibe(30); floater(c.x, c.y, 'INTEL', '#2ee6ff'); updateHUD(); }

    // Salida
    if (needsExit() && objectivesDone() && Math.hypot(G.exit.x - p.x, G.exit.y - p.y) < 20) finish(true);
    if (!needsExit() && objectivesDone()) finish(true);
  }

  for (const g of G.guards) updateGuard(g, dt);
  for (const c of G.cams) updateCam(c, dt);

  // Balas
  for (const b of G.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (solidAt(Math.floor(b.x / T), Math.floor(b.y / T))) { b.life = 0; spark(b.x, b.y, '#ffd28a', 4); continue; }
    if (!G.over && Math.hypot(b.x - p.x, b.y - p.y) < p.r + 3) { b.life = 0; hurt(b.dmg); }
  }
  G.bullets = G.bullets.filter(b => b.life > 0);
  for (const q of G.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.9; q.vy *= 0.9; q.life -= dt; }
  G.parts = G.parts.filter(q => q.life > 0);
  for (const f of G.floaters) { f.y -= 24 * dt; f.life -= dt; }
  G.floaters = G.floaters.filter(f => f.life > 0);

  // Cámara
  const ct = camTarget();
  G.cam.x = lerp(G.cam.x, ct.x, 1 - Math.pow(0.0005, dt));
  G.cam.y = lerp(G.cam.y, ct.y, 1 - Math.pow(0.0005, dt));

  if (G.over) { G.endT -= dt; if (G.endT <= 0 && !G.shown) { G.shown = true; showResult(); } }
}

function camTarget() {
  const p = G.player, sc = viewScale();
  const vw = W / sc, vh = H / sc, mw = G.cols * T, mh = G.rows * T;
  return { x: mw <= vw ? mw / 2 : clamp(p.x, vw / 2, mw - vw / 2), y: mh <= vh ? mh / 2 : clamp(p.y, vh / 2, mh - vh / 2) };
}

function canSee(g, tgt) {
  const dx = tgt.x - g.x, dy = tgt.y - g.y, d = Math.hypot(dx, dy);
  if (d > g.range + (tgt.r || 0)) return false;
  if (Math.abs(angDiff(g.ang, Math.atan2(dy, dx))) > g.fov / 2) return false;
  return los(g, tgt);
}

function turnTo(g, a, rate, dt) { const d = angDiff(g.ang, a); g.ang += clamp(d, -rate * dt, rate * dt); }

function followPath(g, spd, dt) {
  if (!g.path || g.pi >= g.path.length) return true;
  const n = g.path[g.pi];
  const dx = n.x - g.x, dy = n.y - g.y, d = Math.hypot(dx, dy);
  if (d < 2) { g.pi++; return g.pi >= g.path.length; }
  const s = Math.min(d, spd * dt);
  g.x += dx / d * s; g.y += dy / d * s;
  turnTo(g, Math.atan2(dy, dx), 7, dt);
  return false;
}
function pathTo(g, x, y) {
  const p = bfsPath(G.grid, G.cols, G.rows, Math.floor(g.x / T), Math.floor(g.y / T), Math.floor(x / T), Math.floor(y / T));
  g.path = p ? p.map(ctr) : null; g.pi = 0;
  if (g.path && g.path.length > 1) g.pi = 1;
}

function alertGuard(g, silent) {
  if (g.dead || g.state === 'alert') return;
  g.state = 'alert'; g.meter = 1; g.reactT = g.react; g.fireCd = 0; g.lostT = 0;
  g.lastSeen = { x: G.player.x, y: G.player.y };
  if (!G.detected) { G.detected = true; updateHUD(); }
  if (!silent) { SFX.alert(); vibe(40); floater(g.x, g.y - 18, '!', '#ff3b4e'); }
  // avisa a guardias cercanos
  for (const o of G.guards) if (o !== g && !o.dead && o.state !== 'alert' && Math.hypot(o.x - g.x, o.y - g.y) < 6 * T) investigate(o, G.player.x, G.player.y);
  if (G.mission === 'ghost') fail('Te detectaron');
}
function investigate(g, x, y) {
  if (g.dead || g.state === 'alert') return;
  g.state = 'search'; g.searchT = 3.2; g.lastSeen = { x, y }; pathTo(g, x, y); g.meter = Math.max(g.meter, 0.35);
  floater(g.x, g.y - 18, '?', '#ffd23a');
}

function updateGuard(g, dt) {
  if (g.dead) return;
  const p = G.player;
  g.lookT += dt; g.fireCd -= dt; g.bite -= dt;
  const seen = !G.over && G.grace <= 0 && canSee(g, p);
  g.seesPlayer = seen;
  const d = Math.hypot(p.x - g.x, p.y - g.y);
  if (seen) {
    const prox = 1.7 - d / g.range;
    const mult = g.state === 'search' ? 1.7 : 1;
    g.meter = Math.min(1, g.meter + dt / G.P.detTime * prox * mult);
    if (g.meter >= 1) alertGuard(g);
  } else if (g.state !== 'alert') g.meter = Math.max(0, g.meter - dt * 0.35);

  // cuerpos
  if (g.state !== 'alert' && G.t > 1) {
    for (const o of G.guards) if (o.dead && !g.bodiesSeen.has(o) && canSee(g, o)) { g.bodiesSeen.add(o); investigate(g, o.x, o.y); break; }
  }

  switch (g.state) {
    case 'patrol': {
      if (g.meter > 0.25 && seen) { turnTo(g, Math.atan2(p.y - g.y, p.x - g.x), 2.4, dt); break; }
      const n = g.patrol[g.ppi];
      const dx = n.x - g.x, dy = n.y - g.y, dd = Math.hypot(dx, dy);
      if (dd < 2) { g.ppi = (g.ppi + 1) % g.patrol.length; break; }
      const want = Math.atan2(dy, dx);
      if (Math.abs(angDiff(g.ang, want)) > 0.5) { turnTo(g, want, 5, dt); break; }
      const s = Math.min(dd, g.spd * dt); g.x += dx / dd * s; g.y += dy / dd * s; turnTo(g, want, 5, dt);
      break;
    }
    case 'idle': {
      if (g.meter > 0.25 && seen) { turnTo(g, Math.atan2(p.y - g.y, p.x - g.x), 2.4, dt); break; }
      const amp = g.type === 'sniper' ? 0.7 : 1.1;
      const target = g.home.ang + Math.sin(g.lookT * (g.type === 'sniper' ? 0.45 : 0.6)) * amp;
      turnTo(g, target, 1.6, dt);
      break;
    }
    case 'search': {
      const arrived = followPath(g, g.spd * 1.5, dt);
      if (arrived) { g.searchT -= dt; g.ang += dt * 2.2 * Math.sin(g.lookT * 1.3 + 1); }
      if (g.searchT <= 0) { g.state = 'return'; pathTo(g, g.home.x, g.home.y); }
      break;
    }
    case 'return': {
      if (followPath(g, g.spd, dt)) { g.state = g.patrol ? 'patrol' : 'idle'; g.ppi = 0; if (!g.patrol) { g.x = g.home.x; g.y = g.home.y; } }
      break;
    }
    case 'alert': {
      if (seen || (d < g.range && los(g, p) && !G.over)) {
        g.lastSeen = { x: p.x, y: p.y }; g.lostT = 0;
        const a = Math.atan2(p.y - g.y, p.x - g.x);
        turnTo(g, a, 9, dt);
        if (g.type === 'dog') {
          const s = g.chase * dt;
          moveCircle(g, Math.cos(a) * s, Math.sin(a) * s);
          if (d < g.r + p.r + 3 && g.bite <= 0) { g.bite = 0.9; hurt(1); }
        } else {
          g.reactT -= dt;
          if (g.reactT <= 0 && g.fireCd <= 0 && Math.abs(angDiff(g.ang, a)) < 0.35 && !G.over) shoot(g, a);
          if (d > g.range * 0.75) { const s = g.chase * 0.5 * dt; moveCircle(g, Math.cos(a) * s, Math.sin(a) * s); }
        }
      } else {
        g.lostT += dt; g.repath -= dt;
        if (g.repath <= 0) { pathTo(g, g.lastSeen.x, g.lastSeen.y); g.repath = 0.5; }
        if (followPath(g, g.chase, dt) && g.lostT > 0.6) { g.state = 'search'; g.searchT = 3.5; g.meter = 0.6; g.path = null; }
        if (g.lostT > 9) { g.state = 'return'; g.meter = 0; pathTo(g, g.home.x, g.home.y); }
      }
      break;
    }
  }
}

function shoot(g, a) {
  const shots = g.type === 'boss' ? [-0.18, 0, 0.18] : [0];
  for (const o of shots) {
    const aa = a + o + (Math.random() - 0.5) * 0.08;
    G.bullets.push({ x: g.x + Math.cos(aa) * 14, y: g.y + Math.sin(aa) * 14, vx: Math.cos(aa) * g.bulletSpd, vy: Math.sin(aa) * g.bulletSpd, life: 2.5, dmg: g.dmg, sniper: g.type === 'sniper' });
  }
  g.fireCd = g.fireInt; SFX.shot(); spark(g.x + Math.cos(a) * 16, g.y + Math.sin(a) * 16, '#fff2a8', 3);
  // el disparo se escucha
  for (const o of G.guards) if (o !== g && !o.dead && o.state !== 'alert' && o.state !== 'search' && Math.hypot(o.x - g.x, o.y - g.y) < 8 * T) investigate(o, G.player.x, G.player.y);
}

function updateCam(c, dt) {
  c.phase += dt * 0.7; c.cool -= dt;
  c.ang = c.base + Math.sin(c.phase) * 0.85;
  c.range = G.P.range * 1.1; c.fov = 50 * Math.PI / 180;
  const p = G.player;
  const seen = c.cool <= 0 && !G.over && G.grace <= 0 && canSee(c, p);
  c.seesPlayer = seen;
  if (seen) c.meter = Math.min(1, c.meter + dt / (G.P.detTime * 0.9));
  else c.meter = Math.max(0, c.meter - dt * 0.5);
  if (c.meter >= 1) {
    c.meter = 0; c.cool = 5; SFX.alarm(); vibe([40, 40, 40]); floater(c.x, c.y - 16, 'ALARMA', '#ff3b4e');
    if (!G.detected) { G.detected = true; updateHUD(); }
    for (const g of G.guards) if (!g.dead && Math.hypot(g.x - c.x, g.y - c.y) < 10 * T) investigate(g, p.x, p.y);
    if (G.mission === 'ghost') fail('Una cámara te vio');
  }
}

function killGuard(g) {
  g.dead = true; g.state = 'dead'; G.player.dash = 0.2;
  SFX.kill(); vibe(25); G.shake = 4;
  for (let i = 0; i < 14; i++) G.parts.push({ x: g.x, y: g.y, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.5) * 220, life: 0.4 + Math.random() * 0.3, c: i % 3 ? '#ff3b4e' : '#ffffff', s: 2 + Math.random() * 2 });
  floater(g.x, g.y - 16, g.target ? 'OBJETIVO' : '✕', g.target ? '#ffd23a' : '#ffffff');
  updateHUD();
}
function hurt(n) {
  const p = G.player; if (p.inv > 0 || G.over) return;
  p.hp -= n; p.inv = 0.6; G.shake = 6; SFX.hurt(); vibe(80);
  for (let i = 0; i < 8; i++) G.parts.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0.35, c: '#ff3b4e', s: 2 });
  updateHUD();
  if (p.hp <= 0) fail('Te eliminaron');
}
function spark(x, y, c, n) { for (let i = 0; i < n; i++) G.parts.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, life: 0.2, c, s: 1.5 }); }
function floater(x, y, txt, c) { G.floaters.push({ x, y, txt, c, life: 0.9 }); }

function finish(win) {
  if (G.over) return;
  G.over = true; G.win = win; G.endT = win ? 0.7 : 1.0; input.active = false;
  if (win) { SFX.win(); vibe([30, 40, 60]); } else { SFX.lose(); }
}
function fail(reason) { if (G.over) return; G.failReason = reason; finish(false); }

/* ---------- Render ---------- */
function viewScale() { const base = Math.min(W / (11 * T), H / (13 * T)); return G ? Math.max(base, Math.min(H / (G.rows * T), base * 1.45)) : base; }

function draw() {
  const z = G.zone, sc = viewScale();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#07090d'; ctx.fillRect(0, 0, W, H);
  const sx = (Math.random() - 0.5) * G.shake, sy = (Math.random() - 0.5) * G.shake;
  ctx.setTransform(DPR * sc, 0, 0, DPR * sc, DPR * (W / 2 - G.cam.x * sc + sx), DPR * (H / 2 - G.cam.y * sc + sy));
  const vw = W / sc, vh = H / sc;
  const x0 = Math.max(0, Math.floor((G.cam.x - vw / 2) / T) - 1), x1 = Math.min(G.cols - 1, Math.ceil((G.cam.x + vw / 2) / T) + 1);
  const y0 = Math.max(0, Math.floor((G.cam.y - vh / 2) / T) - 1), y1 = Math.min(G.rows - 1, Math.ceil((G.cam.y + vh / 2) / T) + 1);

  // suelo
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const v = G.grid[x + y * G.cols];
    if (v !== 1) { ctx.fillStyle = (x + y) & 1 ? z.floor : z.floor2; ctx.fillRect(x * T, y * T, T, T); }
  }
  // salida
  if (needsExit()) {
    const on = objectivesDone();
    const pulse = 0.5 + 0.5 * Math.sin(G.t * 4);
    ctx.save(); ctx.translate(G.exit.x, G.exit.y);
    ctx.fillStyle = on ? `rgba(55,245,154,${0.18 + pulse * 0.2})` : 'rgba(120,130,150,0.15)';
    ctx.fillRect(-14, -14, 28, 28);
    ctx.strokeStyle = on ? '#37f59a' : '#5a6475'; ctx.lineWidth = 2; ctx.strokeRect(-14, -14, 28, 28);
    ctx.fillStyle = on ? '#37f59a' : '#5a6475'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(on ? 'SALIDA' : '🔒', 0, 0);
    ctx.restore();
  }
  // conos de visión
  for (const g of G.guards) if (!g.dead) drawCone(g, coneColor(g));
  for (const c of G.cams) drawCone(c, c.cool > 0 ? 'rgba(255,59,78,0.10)' : c.meter > 0.05 ? `rgba(255,${Math.floor(210 - c.meter * 150)},60,0.30)` : 'rgba(255,90,90,0.14)');

  // muros
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const v = G.grid[x + y * G.cols];
    if (v === 1) {
      ctx.fillStyle = z.wall; ctx.fillRect(x * T, y * T, T, T);
      const below = y + 1 < G.rows && G.grid[x + (y + 1) * G.cols] !== 1;
      ctx.fillStyle = z.wallTop; ctx.fillRect(x * T, y * T, T, below ? T - 8 : T);
      if (below) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x * T, y * T + T, T, 5); }
    } else if (v === 2) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x * T + 4, y * T + 8, T - 4, T - 6);
      ctx.fillStyle = z.crate; ctx.fillRect(x * T + 3, y * T + 3, T - 6, T - 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(x * T + 6, y * T + 6, T - 12, T - 12);
      ctx.beginPath(); ctx.moveTo(x * T + 6, y * T + 6); ctx.lineTo(x * T + T - 6, y * T + T - 6); ctx.stroke();
    }
  }

  // monedas e intel
  for (const c of G.coins) if (!c.got) {
    const w = Math.abs(Math.cos(G.t * 3 + c.x)) * 6 + 1;
    ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.ellipse(c.x, c.y, w, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff1a8'; ctx.beginPath(); ctx.ellipse(c.x, c.y, w * 0.4, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const c of G.intel) if (!c.got) {
    const b = Math.sin(G.t * 3) * 2;
    ctx.fillStyle = 'rgba(46,230,255,0.2)'; ctx.beginPath(); ctx.arc(c.x, c.y, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8d2dc'; ctx.fillRect(c.x - 9, c.y - 6 + b, 18, 13);
    ctx.fillStyle = '#2ee6ff'; ctx.fillRect(c.x - 9, c.y - 1 + b, 18, 2);
    ctx.strokeStyle = '#c8d2dc'; ctx.lineWidth = 2; ctx.strokeRect(c.x - 4, c.y - 9 + b, 8, 4);
  }

  // cámaras
  for (const c of G.cams) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.ang);
    ctx.fillStyle = '#2a2f38'; ctx.fillRect(-7, -6, 14, 12);
    ctx.fillStyle = c.cool > 0 ? '#ff3b4e' : '#9aa6b5'; ctx.fillRect(4, -4, 7, 8);
    ctx.fillStyle = (Math.floor(G.t * 3) % 2) ? '#ff3b4e' : '#5a1520'; ctx.beginPath(); ctx.arc(-3, 0, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // cuerpos y guardias
  for (const g of G.guards) if (g.dead) drawGuard(g);
  for (const g of G.guards) if (!g.dead) drawGuard(g);
  drawPlayer();

  // balas
  for (const b of G.bullets) {
    ctx.strokeStyle = b.sniper ? '#ff6b6b' : '#ffe48a'; ctx.lineWidth = b.sniper ? 3 : 2.5;
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.025, b.y - b.vy * 0.025); ctx.stroke();
  }
  for (const q of G.parts) { ctx.globalAlpha = clamp(q.life * 3, 0, 1); ctx.fillStyle = q.c; ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of G.floaters) { ctx.globalAlpha = clamp(f.life * 2, 0, 1); ctx.font = '900 12px system-ui'; ctx.fillStyle = '#000'; ctx.fillText(f.txt, f.x + 1, f.y + 1); ctx.fillStyle = f.c; ctx.fillText(f.txt, f.x, f.y); }
  ctx.globalAlpha = 1;

  // UI en pantalla
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawIndicators(sc);
  const p = G.player;
  if (p.inv > 0.3) { ctx.fillStyle = `rgba(255,40,60,${(p.inv - 0.3) * 0.6})`; ctx.fillRect(0, 0, W, H); }
  if (input.active && running && !paused) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(input.ox, input.oy, 46, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(46,230,255,0.45)'; ctx.beginPath(); ctx.arc(input.x, input.y, 18, 0, Math.PI * 2); ctx.fill();
  }
}

function coneColor(g) {
  if (g.state === 'alert') return 'rgba(255,59,78,0.30)';
  if (g.state === 'search' || g.meter > 0.05) { const m = Math.max(g.meter, 0.3); return `rgba(255,${Math.floor(220 - m * 120)},60,${0.2 + m * 0.15})`; }
  return 'rgba(235,240,255,0.13)';
}
function drawCone(g, color) {
  const n = 26, half = g.fov / 2;
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(g.x, g.y);
  for (let i = 0; i <= n; i++) {
    const a = g.ang - half + (g.fov * i) / n;
    const d = ray(g.x, g.y, a, g.range);
    ctx.lineTo(g.x + Math.cos(a) * d, g.y + Math.sin(a) * d);
  }
  ctx.closePath(); ctx.fill();
  if (g.meter > 0.02 && g.state !== 'alert' && g.type !== undefined) {
    // parte llena del cono = nivel de detección
    ctx.fillStyle = 'rgba(255,200,60,0.18)'; ctx.beginPath(); ctx.moveTo(g.x, g.y);
    const rr = g.range * g.meter;
    for (let i = 0; i <= n; i++) { const a = g.ang - half + (g.fov * i) / n; const d = Math.min(rr, ray(g.x, g.y, a, g.range)); ctx.lineTo(g.x + Math.cos(a) * d, g.y + Math.sin(a) * d); }
    ctx.closePath(); ctx.fill();
  }
}

const GCOL = { guard: '#4f6b8f', dog: '#8a6a45', sniper: '#5d7a4a', heavy: '#6b6f78', boss: '#b8323f' };
function drawGuard(g) {
  ctx.save(); ctx.translate(g.x, g.y);
  if (g.dead) {
    ctx.rotate(g.ang + 1.2);
    ctx.fillStyle = 'rgba(120,10,20,0.55)'; ctx.beginPath(); ctx.ellipse(4, 0, g.r + 6, g.r, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3b4250'; ctx.beginPath(); ctx.ellipse(0, 0, g.r, g.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore(); return;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(2, 4, g.r, g.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  if (g.target) { ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(0, 0, g.r + 6 + Math.sin(G.t * 5), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  ctx.rotate(g.ang);
  if (g.type === 'dog') {
    ctx.fillStyle = GCOL.dog; ctx.beginPath(); ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, 0, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a4430'; ctx.fillRect(9, -6, 3, 3); ctx.fillRect(9, 3, 3, 3); ctx.fillRect(-15, -1, 5, 2);
  } else {
    ctx.fillStyle = '#20242c'; ctx.fillRect(g.r - 2, 2, g.type === 'sniper' ? 20 : 12, 3);
    ctx.fillStyle = GCOL[g.type]; ctx.beginPath(); ctx.arc(0, 0, g.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.arc(-2, -2, g.r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8c39e'; ctx.beginPath(); ctx.arc(3, 0, g.r * 0.45, 0, Math.PI * 2); ctx.fill();
    if (g.type === 'heavy' || g.type === 'boss') { ctx.strokeStyle = g.type === 'boss' ? '#ffd23a' : '#a9b0bb'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, g.r - 1, -1.2, 1.2); ctx.stroke(); }
    if (g.type === 'boss') { ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(-3, -1); ctx.lineTo(0, -6); ctx.lineTo(3, -1); ctx.lineTo(6, -5); ctx.lineTo(5, 3); ctx.lineTo(-5, 3); ctx.closePath(); ctx.rotate(0); ctx.fill(); }
  }
  ctx.restore();
  if (g.type === 'sniper' && g.state !== 'alert') {
    const d = ray(g.x, g.y, g.ang, g.range);
    ctx.strokeStyle = 'rgba(255,40,40,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x + Math.cos(g.ang) * d, g.y + Math.sin(g.ang) * d); ctx.stroke();
  }
  if (g.state === 'alert' || g.meter > 0.05) {
    ctx.font = '900 14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = g.state === 'alert' ? '#ff3b4e' : '#ffd23a';
    ctx.fillText(g.state === 'alert' ? '!' : '?', g.x, g.y - g.r - 10);
  }
}

function drawPlayer() {
  const p = G.player, sk = SKINS.find(s => s.id === save.skin) || SKINS[0];
  if (p.inv > 0 && Math.floor(G.t * 20) % 2) return;
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(2, 4, p.r, p.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  // aura de alcance
  ctx.strokeStyle = sk.scarf + '33'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, p.r + p.reach + 6, 0, Math.PI * 2); ctx.stroke();
  ctx.rotate(p.ang);
  const sw = Math.sin(p.walk) * 3;
  ctx.strokeStyle = sk.scarf; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-12, sw, -18, -sw * 1.5); ctx.stroke();
  ctx.fillStyle = sk.body; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = sk.scarf; ctx.fillRect(2, -5, 5, 3); ctx.fillRect(2, 2, 5, 3);
  if (p.dash > 0) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, p.r + 10, -0.9, 0.9); ctx.stroke(); }
  ctx.restore();
}

function drawIndicators(sc) {
  const pts = [];
  if (G.mission === 'target' || G.mission === 'boss') G.guards.forEach(g => { if (g.target && !g.dead) pts.push({ x: g.x, y: g.y, c: '#ffd23a' }); });
  if (G.mission === 'intel') G.intel.forEach(i => { if (!i.got) pts.push({ x: i.x, y: i.y, c: '#2ee6ff' }); });
  if (needsExit() && objectivesDone()) pts.push({ x: G.exit.x, y: G.exit.y, c: '#37f59a' });
  for (const q of pts) {
    const sx = (q.x - G.cam.x) * sc + W / 2, sy = (q.y - G.cam.y) * sc + H / 2;
    const m = 34, top = 74;
    if (sx > m && sx < W - m && sy > top && sy < H - m) continue;
    const cx = clamp(sx, m, W - m), cy = clamp(sy, top, H - m);
    const a = Math.atan2(sy - H / 2, sx - W / 2);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    ctx.fillStyle = q.c; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-6, -8); ctx.lineTo(-2, 0); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

/* ---------- HUD y pantallas ---------- */
const MISSION_TEXT = {
  eliminate: 'Elimina a todos los guardias',
  target: 'Elimina a los objetivos marcados y escapa',
  intel: 'Roba la información y escapa',
  boss: 'Elimina al jefe y escapa',
  ghost: 'Llega a la salida SIN ser detectado',
};
const TIPS = {
  1: 'Arrastra el dedo en cualquier parte para moverte. Toca a un guardia por la espalda para eliminarlo.',
  2: 'Evita los conos de luz. Si se ponen amarillos, te están viendo: ¡sal rápido!',
  3: 'Las cajas bloquean la visión. Úsalas para esconderte.',
  4: 'Los objetivos tienen un círculo dorado. Elimínalos y llega a la SALIDA.',
  5: 'Roba los maletines de información y escapa por la salida.',
  10: 'JEFE: blindado de frente. Solo cae si lo atacas por la espalda.',
  12: 'MISIÓN FANTASMA: si alguien te detecta, fallas. Paciencia.',
};
const TYPE_TIPS = {
  dog: 'NUEVO: perros. Son rápidos y muerden. Solo puedes eliminarlos si no te han visto.',
  cam: 'NUEVO: cámaras. No se pueden destruir y llaman a los guardias cercanos.',
  sniper: 'NUEVO: francotiradores. Ven muy lejos en línea recta y hacen 2 de daño.',
  heavy: 'NUEVO: pesados. Blindados de frente: rodéalos y atácalos por la espalda.',
};
let _first = null;
function firstAppear() {
  if (_first) return _first;
  _first = {};
  for (let L = 1; L <= MAX_LEVEL; L++) {
    const lv = genLevel(L);
    for (const g of lv.guards) if (!_first[g.type]) _first[g.type] = L;
    if (lv.cams.length && !_first.cam) _first.cam = L;
    if (_first.dog && _first.cam && _first.sniper && _first.heavy) break;
  }
  return _first;
}
function updateHUD() {
  if (!G) return;
  $('#hud-level').textContent = 'NIVEL ' + G.L;
  $('#hud-zone').textContent = G.zone.name;
  let obj = MISSION_TEXT[G.mission];
  if (G.mission === 'eliminate') { const a = G.guards.filter(g => g.dead).length; obj = `Elimina a todos · ${a}/${G.guards.length}`; }
  if (G.mission === 'target') { const t = G.guards.filter(g => g.target); obj = objectivesDone() ? '¡Ve a la SALIDA!' : `Objetivos · ${t.filter(g => g.dead).length}/${t.length}`; }
  if (G.mission === 'boss') obj = objectivesDone() ? '¡Ve a la SALIDA!' : 'Elimina al JEFE (por la espalda)';
  if (G.mission === 'intel') obj = objectivesDone() ? '¡Ve a la SALIDA!' : `Información · ${G.intel.filter(i => i.got).length}/${G.intel.length}`;
  if (G.mission === 'ghost') obj = 'Fantasma: llega a la SALIDA sin ser visto';
  $('#hud-obj').textContent = obj;
  const p = G.player;
  $('#hud-hp').innerHTML = Array.from({ length: p.hpMax }, (_, i) => `<span class="${i < p.hp ? 'on' : ''}">♥</span>`).join('');
  $('#hud-coins').textContent = G.coinsGot * 5;
  $('#hud-stealth').className = G.detected ? 'tag bad' : 'tag good';
  $('#hud-stealth').textContent = G.detected ? 'DETECTADO' : 'OCULTO';
}

const screens = ['menu', 'levels', 'shop', 'settings', 'brief', 'result', 'pause'];
function show(id) { for (const s of screens) $('#' + s).classList.toggle('hidden', s !== id); $('#hud').classList.toggle('hidden', !(id === null || id === 'pause')); }

function goMenu() { running = false; paused = false; G = null; show('menu'); $('#menu-coins').textContent = save.coins; $('#btn-continue').textContent = save.unlocked > 1 ? `CONTINUAR · NIVEL ${Math.min(save.unlocked, MAX_LEVEL)}` : 'JUGAR'; renderBg(); }

function openBrief(L) {
  startLevel(L); running = false; paused = false;
  show('brief');
  $('#brief-level').textContent = 'NIVEL ' + L;
  $('#brief-zone').textContent = G.zone.name;
  $('#brief-obj').textContent = MISSION_TEXT[G.mission];
  const counts = {};
  G.guards.forEach(g => counts[g.type] = (counts[g.type] || 0) + 1);
  const names = { guard: 'Guardias', dog: 'Perros', sniper: 'Francotiradores', heavy: 'Pesados', boss: 'Jefe' };
  let intel = Object.entries(counts).map(([k, v]) => `${v} ${names[k]}`).join(' · ');
  if (G.cams.length) intel += ` · ${G.cams.length} Cámaras`;
  $('#brief-enemies').textContent = intel;
  let tip = TIPS[L];
  const first = firstAppear();
  for (const [k, txt] of Object.entries(TYPE_TIPS)) if (first[k] === L) tip = txt;
  $('#brief-tip').textContent = tip || '';
  $('#brief-tip').classList.toggle('hidden', !tip);
  const st = save.stars[L] || 0;
  $('#brief-stars').innerHTML = starsHTML(st);
  draw();
}
function play() { audio(); show(null); running = true; paused = false; last = performance.now(); }
function togglePause() { if (!G || G.over) return; paused = !paused; show(paused ? 'pause' : null); if (!paused) last = performance.now(); }

function starsHTML(n) { return [0, 1, 2].map(i => `<span class="star ${i < n ? 'on' : ''}">★</span>`).join(''); }

function showResult() {
  running = false;
  const win = G.win, L = G.L;
  show('result');
  $('#result').classList.toggle('lose', !win);
  if (win) {
    const all = G.coins.every(c => c.got);
    const stars = 1 + (G.detected ? 0 : 1) + (all ? 1 : 0);
    const prev = save.stars[L] || 0;
    let earned = G.coinsGot * 5 + 20 + L * 2;
    if (stars > prev) earned += (stars - prev) * 25;
    save.stars[L] = Math.max(prev, stars);
    save.coins += earned;
    if (L >= save.unlocked && L < MAX_LEVEL) save.unlocked = L + 1;
    if (L === MAX_LEVEL) save.unlocked = MAX_LEVEL;
    persist();
    $('#result-title').textContent = L === MAX_LEVEL ? '¡OPERACIÓN COMPLETA!' : 'MISIÓN CUMPLIDA';
    $('#result-stars').innerHTML = starsHTML(stars);
    $('#result-detail').innerHTML = `<div>✓ Misión completada</div><div class="${G.detected ? 'off' : ''}">${G.detected ? '✗' : '✓'} Sin ser detectado</div><div class="${all ? '' : 'off'}">${all ? '✓' : '✗'} Todas las monedas</div>`;
    $('#result-coins').textContent = '+' + earned;
    $('#btn-next').classList.toggle('hidden', L >= MAX_LEVEL);
  } else {
    $('#result-title').textContent = 'MISIÓN FALLIDA';
    $('#result-stars').innerHTML = '';
    $('#result-detail').innerHTML = `<div>${G.failReason || ''}</div>`;
    $('#result-coins').textContent = '';
    $('#btn-next').classList.add('hidden');
  }
}

function renderLevels() {
  const wrap = $('#levels-grid'); wrap.innerHTML = '';
  for (let z = 0; z < 5; z++) {
    const h = document.createElement('div'); h.className = 'zone-h'; h.style.color = ZONES[z].accent;
    const zs = Array.from({ length: 20 }, (_, i) => save.stars[z * 20 + i + 1] || 0).reduce((a, b) => a + b, 0);
    h.innerHTML = `<span>ZONA ${z + 1} · ${ZONES[z].name}</span><span>★ ${zs}/60</span>`; wrap.appendChild(h);
    const grid = document.createElement('div'); grid.className = 'lv-grid';
    for (let i = 1; i <= 20; i++) {
      const L = z * 20 + i, b = document.createElement('button');
      const locked = L > save.unlocked;
      b.className = 'lv' + (locked ? ' locked' : '') + (L % 10 === 0 ? ' boss' : '');
      b.style.setProperty('--acc', ZONES[z].accent);
      b.innerHTML = locked ? `<b>🔒</b>` : `<b>${L}</b><i>${'★'.repeat(save.stars[L] || 0)}${'☆'.repeat(3 - (save.stars[L] || 0))}</i>`;
      if (!locked) b.onclick = () => openBrief(L);
      grid.appendChild(b);
    }
    wrap.appendChild(grid);
  }
  const total = Object.values(save.stars).reduce((a, b) => a + b, 0);
  $('#levels-stars').textContent = `★ ${total}/300`;
}

function renderShop() {
  $('#shop-coins').textContent = save.coins;
  const up = $('#shop-upg'); up.innerHTML = '';
  for (const [k, u] of Object.entries(UPGRADES)) {
    const lvl = save.upg[k], max = u.prices.length, price = u.prices[lvl];
    const d = document.createElement('div'); d.className = 'shop-item';
    d.innerHTML = `<div><b>${u.name}</b><small>${u.desc} · ${lvl}/${max}</small></div>`;
    const b = document.createElement('button'); b.className = 'btn small';
    if (lvl >= max) { b.textContent = 'MÁX'; b.disabled = true; }
    else { b.textContent = '◉ ' + price; b.disabled = save.coins < price; b.onclick = () => { save.coins -= price; save.upg[k]++; persist(); SFX.pick(); renderShop(); }; }
    d.appendChild(b); up.appendChild(d);
  }
  const sk = $('#shop-skins'); sk.innerHTML = '';
  for (const s of SKINS) {
    const own = save.skins.includes(s.id), eq = save.skin === s.id;
    const d = document.createElement('div'); d.className = 'shop-item';
    d.innerHTML = `<div class="skin-row"><span class="swatch" style="background:${s.body};box-shadow:inset 0 0 0 4px ${s.scarf}"></span><b>${s.name}</b></div>`;
    const b = document.createElement('button'); b.className = 'btn small' + (eq ? ' ghost' : '');
    if (eq) { b.textContent = 'EQUIPADO'; b.disabled = true; }
    else if (own) { b.textContent = 'USAR'; b.onclick = () => { save.skin = s.id; persist(); renderShop(); }; }
    else { b.textContent = '◉ ' + s.price; b.disabled = save.coins < s.price; b.onclick = () => { save.coins -= s.price; save.skins.push(s.id); save.skin = s.id; persist(); SFX.pick(); renderShop(); }; }
    d.appendChild(b); sk.appendChild(d);
  }
}

function renderSettings() {
  $('#set-sound').textContent = save.sound ? 'SONIDO: SÍ' : 'SONIDO: NO';
  $('#set-vib').textContent = save.vib ? 'VIBRACIÓN: SÍ' : 'VIBRACIÓN: NO';
  $('#set-reset').textContent = 'BORRAR PROGRESO'; resetArm = false;
}
let resetArm = false;

// Fondo animado del menú: un nivel de demostración
function renderBg() {
  if (running) return;
  if (!G) { startLevel(1); G.grace = 1e9; G.demo = true; }
}

/* ---------- Bucle ---------- */
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (G) {
    if (running && !paused) update(dt);
    else if (G.demo) { G.t += dt; for (const g of G.guards) updateGuard(g, dt); for (const c of G.cams) updateCam(c, dt); }
    draw();
  }
  requestAnimationFrame(loop);
}

/* ---------- Botones ---------- */
function bind() {
  $('#btn-continue').onclick = () => { G = null; openBrief(Math.min(save.unlocked, MAX_LEVEL)); };
  $('#btn-levels').onclick = () => { renderLevels(); show('levels'); };
  $('#btn-shop').onclick = () => { renderShop(); show('shop'); };
  $('#btn-settings').onclick = () => { renderSettings(); show('settings'); };
  document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => goMenu());
  $('#btn-play').onclick = play;
  $('#btn-brief-back').onclick = () => { G = null; renderLevels(); show('levels'); };
  $('#btn-pause').onclick = togglePause;
  $('#btn-resume').onclick = togglePause;
  $('#btn-restart').onclick = () => openBrief(G.L);
  $('#btn-quit').onclick = goMenu;
  $('#btn-retry').onclick = () => openBrief(G.L);
  $('#btn-next').onclick = () => openBrief(G.L + 1);
  $('#btn-res-menu').onclick = goMenu;
  $('#set-sound').onclick = () => { save.sound = !save.sound; persist(); renderSettings(); };
  $('#set-vib').onclick = () => { save.vib = !save.vib; persist(); renderSettings(); };
  $('#set-reset').onclick = () => {
    if (!resetArm) { resetArm = true; $('#set-reset').textContent = '¿SEGURO? TOCA OTRA VEZ'; return; }
    save = JSON.parse(JSON.stringify(DEFAULT_SAVE)); persist(); renderSettings(); $('#set-reset').textContent = 'PROGRESO BORRADO';
  };
}

loadSave();
if (/[?&]debug\b/.test(location.search)) { save.unlocked = MAX_LEVEL; }
bind();
goMenu();
requestAnimationFrame(loop);

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

// Hooks de QA (no afectan el juego)
window.__UMBRA = { genLevel, missionFor, get G() { return G; }, startLevel, openBrief, play, update, get save() { return save; }, killGuard, finish };
})();
