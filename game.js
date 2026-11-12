/* UMBRA // SILENT OPS — juego de sigilo top-down. Sin dependencias. v0.2 */
'use strict';
(() => {
const T = 32;
const MAX_LEVEL = 100;
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

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

/* ---------- Jefes (uno cada 5 niveles) ---------- */
const BOSSES = [
  { name: 'TORO',           title: 'El matón del muelle',         color: '#8a5a3c', hp: 2, charge: true },
  { name: 'LA VIUDA',       title: 'Francotiradora',              color: '#3b3f4a', hp: 2, sniper: true },
  { name: 'DR. VEX',        title: 'Pide refuerzos al ser herido', color: '#3f6b5a', hp: 3, spread: 3, summon: true },
  { name: 'CAPATAZ',        title: 'Jefe del muelle',             color: '#a0522d', hp: 3, burst: 3 },
  { name: 'SEÑOR K',        title: 'Contador de la mafia',        color: '#4a4f7a', hp: 3, spread: 3, summon: true },
  { name: 'ECO',            title: 'Ráfagas rápidas',             color: '#2f6f8f', hp: 4, burst: 3 },
  { name: 'LA SERPIENTE',   title: 'Tiradora con escolta',        color: '#3d6b2f', hp: 4, sniper: true, summon: true },
  { name: 'EL EJECUTIVO',   title: 'Dueño de las oficinas',       color: '#6b5a8f', hp: 4, spread: 5 },
  { name: 'TITÁN',          title: 'Blindado y furioso',          color: '#6b6f78', hp: 5, charge: true },
  { name: 'DOCTORA NOX',    title: 'Directora del laboratorio',   color: '#2f8f6b', hp: 5, spread: 3, summon: true },
  { name: 'FANTASMA ROJO',  title: 'Ráfaga y humo',               color: '#8f2f3f', hp: 5, burst: 3 },
  { name: 'MANDÍBULA',      title: 'Embiste y llama a su gente',  color: '#5a6b2f', hp: 6, charge: true, summon: true },
  { name: 'EL CROUPIER',    title: 'Reparte balas en abanico',    color: '#8f2f6b', hp: 6, spread: 5 },
  { name: 'DAMA DE ORO',    title: 'Francotiradora del casino',   color: '#b08a2a', hp: 6, sniper: true, summon: true },
  { name: 'CUERVO',         title: 'Ráfagas con escolta',         color: '#2a2a35', hp: 6, burst: 3, summon: true },
  { name: 'EL PADRINO',     title: 'Rey del casino',              color: '#5a1a2a', hp: 7, spread: 5, summon: true },
  { name: 'GÓLEM',          title: 'Muro que camina',             color: '#5f5a50', hp: 7, charge: true },
  { name: 'HALCÓN',         title: 'Francotirador de élite',      color: '#4a5f7a', hp: 7, sniper: true, burst: 2 },
  { name: 'GENERAL ACERO',  title: 'Comandante de la fortaleza',  color: '#4f5560', hp: 8, spread: 5, summon: true },
  { name: 'EL SHOGUN',      title: 'El jefe final',               color: '#b8323f', hp: 9, spread: 3, burst: 3, summon: true },
];

/* ---------- Personajes y armas ---------- */
const CHARS = [
  { id: 'kaze',    name: 'KAZE',     role: 'Ninja',        perk: 'PASO SOMBRA: tras cada eliminación eres invisible 1.5 s',            price: 0,    body: '#1d2029', band: '#2ee6ff', head: 'hood', ab: 'shadow' },
  { id: 'akane',   name: 'AKANE',    role: 'Kunoichi',     perk: 'DOBLE HUMO: 2 bombas de humo por misión · +12% velocidad',           price: 400,  body: '#3a1420', band: '#ff3b4e', head: 'pony', spd: 0.12, ab: 'smoke2' },
  { id: 'tetsu',   name: 'TETSU',    role: 'Samurái',      perk: 'ARMADURA: bloquea el primer golpe de cada misión · +1 corazón',      price: 900,  body: '#5a1f1f', band: '#ffcf3a', head: 'kabuto', hp: 1, ab: 'armor' },
  { id: 'nueve',   name: 'AGENTE 9', role: 'Espía',        perk: 'IMÁN: atrae las monedas cercanas · +30% monedas',                    price: 1300, body: '#1c2230', band: '#ff3b4e', head: 'suit', coin: 0.3, ab: 'magnet' },
  { id: 'yoru',    name: 'YORU',     role: 'Sombra',       perk: 'CAMUFLAJE TOTAL: se esconde al instante y dura más del doble',       price: 1800, body: '#221a33', band: '#a46bff', head: 'cloak', det: 0.75, ab: 'deepcamo' },
  { id: 'kitsune', name: 'KITSUNE',  role: 'Máscara zorro', perk: 'ILUSIÓN: la primera vez que te descubren, desapareces · +10% vel.', price: 2400, body: '#2a1c1c', band: '#ff6b3a', head: 'fox', spd: 0.1, det: 0.85, ab: 'trick' },
  { id: 'raiden',  name: 'RAIDEN',   role: 'Ciber-ninja',  perk: 'PULSO EMP: las cámaras no te detectan · +1 corazón · +8% vel.',      price: 3200, body: '#1f3238', band: '#37f59a', head: 'visor', hp: 1, spd: 0.08, ab: 'emp' },
  { id: 'oni',     name: 'ONI',      role: 'Leyenda',      perk: 'FURIA: elimina de frente a cualquier enemigo normal · +1 corazón',   price: 4500, body: '#1c0d0d', band: '#ff8a2e', head: 'oni', hp: 1, spd: 0.1, det: 0.8, ab: 'fury' },
];
const WEAPONS = [
  { id: 'katana',     name: 'Katana',      desc: 'Equilibrada',                                   price: 0,    color: '#d7e0ea' },
  { id: 'tanto',      name: 'Tantō doble', desc: 'Ligeras: +8% velocidad',                        price: 300,  color: '#e6eef7', spd: 0.08 },
  { id: 'kusarigama', name: 'Kusarigama',  desc: 'Cadena: el mayor alcance de todas',               price: 700,  color: '#b9c2cc', reach: 18 },
  { id: 'shuriken',   name: 'Shurikens',   desc: 'Lanza estrellas a enemigos desprevenidos',       price: 1200, color: '#9aa6b5', ranged: true },
  { id: 'nodachi',    name: 'Nodachi',     desc: 'Corte amplio · atraviesa armaduras · 2 de daño a jefes', price: 2200, color: '#ff6b6b', reach: 11, pierce: true, bossDmg: 2 },
];
const UPGRADES = {
  hp:    { name: 'Vida extra', desc: '+1 corazón', prices: [250, 700] },
  spd:   { name: 'Velocidad', desc: '+8% de movimiento', prices: [200, 500, 1000] },
  reach: { name: 'Alcance', desc: 'Golpeas desde más lejos', prices: [200, 500, 1000] },
};

/* ---------- Dificultad ---------- */
function params(L) {
  const k = (L - 1) / (MAX_LEVEL - 1);
  return {
    detTime: lerp(0.95, 0.38, k), range: lerp(4.0, 6.2, k) * T, fov: 72 * Math.PI / 180,
    fireInt: lerp(1.05, 0.6, k), react: lerp(0.5, 0.25, k),
    patrolSpd: lerp(36, 50, k), chaseSpd: lerp(70, 108, k), bulletSpd: lerp(270, 360, k),
  };
}
function missionFor(L) {
  if (L % 5 === 0) return 'boss';
  if (L <= 3) return 'eliminate';
  if (L >= 12 && L % 7 === 5) return 'ghost';
  return ['eliminate', 'target', 'intel'][L % 3];
}
const bossFor = L => BOSSES[L / 5 - 1];

/* ---------- Grid ---------- */
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function flood(grid, cols, rows, sx, sy) {
  const dist = new Int16Array(cols * rows).fill(-1);
  const q = [sx + sy * cols]; dist[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % cols, y = (i / cols) | 0;
    for (const [dx, dy] of DIRS) {
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
  if (g < 0 || g >= grid.length || grid[g] !== 0) return null;
  const q = [s]; prev[s] = -1;
  for (let h = 0; h < q.length; h++) {
    const i = q[h]; if (i === g) break;
    const x = i % cols, y = (i / cols) | 0;
    for (const [dx, dy] of DIRS) {
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

/* ---------- Generador ---------- */
function genLevel(L) {
  for (let attempt = 0; attempt < 40; attempt++) { const lv = tryGen(L, attempt); if (lv) return lv; }
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

  const want = Math.min(4 + Math.floor(L / 8), 12);
  const rooms = [];
  for (let t = 0; t < 400 && rooms.length < want; t++) {
    const w = ri(4, 7), h = ri(4, 7), x = ri(1, cols - w - 1), y = ri(1, rows - h - 1);
    if (rooms.some(r => x - 1 < r.x + r.w && x + w + 1 > r.x && y - 1 < r.y + r.h && y + h + 1 > r.y)) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
  }
  if (rooms.length < 3) return null;
  for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) set(x, y, 0);
  rooms.sort((a, b) => b.cy - a.cy || a.cx - b.cx);

  const corridor = (a, b) => {
    const wide = R() < 0.35;
    const carve = (x, y) => { set(x, y, 0); if (wide) { set(x + 1, y, 0); set(x, y + 1, 0); } };
    let x = a.cx, y = a.cy;
    const stepX = () => { while (x !== b.cx) { carve(x, y); x += Math.sign(b.cx - x); } };
    const stepY = () => { while (y !== b.cy) { carve(x, y); y += Math.sign(b.cy - y); } };
    if (R() < 0.5) { stepX(); stepY(); } else { stepY(); stepX(); }
    carve(x, y);
  };
  for (let i = 1; i < rooms.length; i++) {
    let best = 0, bd = 1e9;
    for (let j = 0; j < i; j++) { const d = Math.abs(rooms[i].cx - rooms[j].cx) + Math.abs(rooms[i].cy - rooms[j].cy); if (d < bd) { bd = d; best = j; } }
    corridor(rooms[i], rooms[best]);
  }
  for (let i = 0; i < Math.floor(rooms.length / 3); i++) { const a = ri(0, rooms.length - 1), b = ri(0, rooms.length - 1); if (a !== b) corridor(rooms[a], rooms[b]); }

  const start = { x: rooms[0].cx, y: rooms[0].cy };
  const countFloor = () => { let c = 0; for (let i = 0; i < grid.length; i++) if (grid[i] === 0) c++; return c; };
  const reachAll = () => { const d = flood(grid, cols, rows, start.x, start.y); let c = 0; for (let i = 0; i < d.length; i++) if (d[i] >= 0) c++; return c === countFloor(); };
  if (!reachAll()) return null;

  for (let k2 = 1; k2 < rooms.length; k2++) {
    const r = rooms[k2];
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

  let exitRoom = rooms[1];
  for (const r of rooms) if (dStart[r.cx + r.cy * cols] > dStart[exitRoom.cx + exitRoom.cy * cols]) exitRoom = r;
  const exit = { x: exitRoom.cx, y: exitRoom.cy };

  const used = [start, exit];
  const far = (t, m) => used.every(u => Math.abs(u.x - t.x) + Math.abs(u.y - t.y) >= m);
  const pickTile = (minD, sep, filter) => {
    const c = floorTiles.filter(t => t.d >= minD && !(t.x === exit.x && t.y === exit.y) && far(t, sep) && (!filter || filter(t)));
    if (!c.length) return null;
    const t = c[Math.floor(R() * c.length)]; used.push(t); return t;
  };

  const mission = missionFor(L);
  const guards = [];
  const nG = Math.min(2 + Math.floor(L * 0.11) + (L > 50 ? 1 : 0), 15);
  const mkPatrol = (t) => {
    const d = flood(grid, cols, rows, t.x, t.y);
    const cand = floorTiles.filter(f => { const v = d[f.x + f.y * cols]; return v >= 4 && v <= 12 && f.d >= 4; });
    if (cand.length < 2) return null;
    const pts = [t];
    for (let i = 0, n = ri(1, 2); i < n; i++) pts.push(cand[Math.floor(R() * cand.length)]);
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
    const type = i < 2 && L < 8 ? 'guard' : pickType();
    let patrol = null;
    if (type !== 'sniper' && R() < (type === 'dog' ? 0.85 : 0.62)) patrol = mkPatrol(t);
    guards.push({ type, x: t.x, y: t.y, ang: R() * Math.PI * 2, patrol, target: false });
  }
  if (guards.length < 2) return null;

  const cams = [];
  if (L >= 18) {
    const nC = Math.min(Math.floor((L - 10) / 22) + (R() < 0.5 ? 1 : 0), 4);
    for (let i = 0; i < nC; i++) {
      const t = pickTile(8, 4, f => DIRS.some(([dx, dy]) => at(f.x + dx, f.y + dy) === 1));
      if (!t) break;
      let base = 0;
      for (const [dx, dy] of DIRS) if (at(t.x + dx, t.y + dy) === 1) base = Math.atan2(-dy, -dx);
      cams.push({ x: t.x, y: t.y, base });
    }
  }

  const intel = [];
  if (mission === 'target') {
    const c = guards.filter(g => g.type === 'guard' || g.type === 'sniper');
    if (!c.length) return null;
    for (let i = 0, n = Math.min(c.length, 1 + Math.floor(L / 35)); i < n; i++) c[i].target = true;
  }
  if (mission === 'boss') {
    const t = pickTile(Math.floor(maxD * 0.55), 3);
    if (!t) return null;
    guards.push({ type: 'boss', x: t.x, y: t.y, ang: R() * Math.PI * 2, patrol: null, target: true, bossIdx: L / 5 - 1 });
  }
  if (mission === 'intel') {
    for (let i = 0, n = 1 + Math.floor(L / 30); i < n; i++) { const t = pickTile(8, 5); if (!t) return null; intel.push({ x: t.x, y: t.y }); }
  }
  const coins = [];
  for (let i = 0, n = 6 + Math.floor(L / 15); i < n; i++) { const t = pickTile(2, 2); if (t) coins.push({ x: t.x, y: t.y }); }

  return { L, cols, rows, grid, start, exit, guards, cams, intel, coins, mission, P: params(L), zone: zoneOf(L), floor: floorTiles };
}

/* ---------- Guardado ---------- */
const SAVE_KEY = 'umbra-save-v1';
const DEFAULT_SAVE = { unlocked: 1, stars: {}, coins: 0, upg: { hp: 0, spd: 0, reach: 0 }, chars: ['kaze'], char: 'kaze', weapons: ['katana'], weapon: 'katana', sound: true, vib: true, gift: false };
let giftPending = false;
let save;
function loadSave() {
  try { save = Object.assign(JSON.parse(JSON.stringify(DEFAULT_SAVE)), JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); }
  catch (e) { save = JSON.parse(JSON.stringify(DEFAULT_SAVE)); }
  save.upg = Object.assign({ hp: 0, spd: 0, reach: 0 }, save.upg);
  if (!Array.isArray(save.chars)) save.chars = ['kaze'];
  if (!save.clv || typeof save.clv !== 'object') save.clv = {};
  if (!Array.isArray(save.weapons)) save.weapons = ['katana'];
  if (!CHARS.some(c => c.id === save.char)) save.char = 'kaze';
  if (!WEAPONS.some(w => w.id === save.weapon)) save.weapon = 'katana';
  delete save.skins; delete save.skin;
  if (!save.gift) { save.gift = true; save.coins += 350; giftPending = true; persist(); }
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
const MAX_CLV = 5;
const clvOf = id => Math.min(MAX_CLV, (save.clv && save.clv[id]) || 1);
const clvCost = c => Math.round((150 + c.price * 0.25) * clvOf(c.id) / 10) * 10;
const clvNext = l => (l + 1 === 3 || l + 1 === 5) ? '+1 corazón' : '+velocidad y sigilo';
const charOf = () => CHARS.find(c => c.id === save.char) || CHARS[0];
const weaponOf = () => WEAPONS.find(w => w.id === save.weapon) || WEAPONS[0];

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
  throw() { tone(1400, 0.08, 'triangle', 0.04, -700); },
  bossHit() { noise(0.2, 0.14, 600); tone(110, 0.3, 'sawtooth', 0.08, -50); },
  smoke() { noise(0.35, 0.06, 300); },
};
const vibe = p => { if (save.vib && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} };

/* ---------- Estado ---------- */
const cv = $('#game'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() { DPR = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight; cv.width = W * DPR; cv.height = H * DPR; cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
window.addEventListener('resize', resize); resize();

let G = null, running = false, paused = false;

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

function playerStats() {
  const c = charOf(), w = weaponOf(), lv = clvOf(c.id);
  return {
    hpMax: 3 + save.upg.hp + (c.hp || 0) + (lv >= 3 ? 1 : 0) + (lv >= 5 ? 1 : 0),
    spd: 118 * (1 + 0.08 * save.upg.spd + (c.spd || 0) + (w.spd || 0) + 0.04 * (lv - 1)),
    reach: 14 + save.upg.reach * 4 + (w.reach || 0) + (lv - 1),
    det: (c.det || 1) * (1 - 0.04 * (lv - 1)), ab: c.ab || '', coin: c.coin || 0, pierce: !!w.pierce, bossDmg: w.bossDmg || 1, ranged: !!w.ranged,
  };
}

function startLevel(L) {
  const lv = genLevel(L), P = lv.P, st = playerStats();
  G = {
    L, lv, P, cols: lv.cols, rows: lv.rows, grid: lv.grid.slice(), zone: lv.zone, mission: lv.mission,
    t: 0, grace: 1.2,
    player: { ...ctr(lv.start), r: 10, ang: -Math.PI / 2, hp: st.hpMax, inv: 0, walk: 0, swing: 0, swingAng: 0, starCd: 1.5, still: 0, camo: 1, hidden: false, smokeT: 0, ...st },
    guards: lv.guards.map(s => mkGuard(s, P)),
    cams: lv.cams.map(c => ({ ...ctr(c), base: c.base, ang: c.base, meter: 0, cool: 0, phase: Math.random() * 6 })),
    coins: lv.coins.map(c => ({ ...ctr(c), got: false })),
    intel: lv.intel.map(c => ({ ...ctr(c), got: false })),
    exit: ctr(lv.exit),
    bullets: [], parts: [], floaters: [], stars: [], slashes: [],
    smokes: 1, looked: false, coinsGot: 0, bonus: 0, combo: 0, lastKill: -9, hitstop: 0, detected: false, over: false, endT: 0, shake: 0, cam: { x: 0, y: 0 }, banner: null,
  };
  G.smokes = G.player.ab === 'smoke2' ? 2 : 1; G.player.shield = G.player.ab === 'armor' ? 1 : 0;
  G.bg = buildBg(G);
  G.boss = G.guards.find(g => g.boss) || null;
  if (G.boss) G.banner = { txt: G.boss.boss.name, sub: G.boss.boss.title, life: 2.6 };
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
    invT: 0, burstLeft: 0, burstT: 0, spread: 1, burstN: 1,
  };
  if (g.type === 'dog') { g.r = 9; g.range = P.range * 0.7; g.fov = 110 * Math.PI / 180; g.spd *= 1.3; g.chase *= 1.55; }
  if (g.type === 'sniper') { g.range = P.range * 1.6; g.fov = 26 * Math.PI / 180; g.fireInt *= 1.7; g.bulletSpd *= 1.6; g.dmg = 2; }
  if (g.type === 'heavy') { g.r = 13; g.spd *= 0.8; g.chase *= 0.75; g.fireInt *= 0.7; }
  if (g.type === 'boss') {
    const B = BOSSES[s.bossIdx];
    g.boss = B; g.r = 15; g.hp = g.maxHp = B.hp; g.range = P.range * 1.15; g.fov = 84 * Math.PI / 180;
    g.spread = B.spread || 1; g.burstN = B.burst || 1;
    if (B.sniper) { g.range = P.range * 1.7; g.fov = 32 * Math.PI / 180; g.dmg = 2; g.bulletSpd *= 1.6; g.fireInt *= 1.3; }
    if (B.charge) { g.chase *= 1.15; }
  }
  return g;
}

function objectivesDone() {
  const m = G.mission;
  if (m === 'eliminate') return G.guards.every(g => g.dead);
  if (m === 'target' || m === 'boss') return G.guards.filter(g => g.target).every(g => g.dead);
  if (m === 'intel') return G.intel.every(i => i.got);
  return true;
}
const needsExit = () => true;

/* ---------- Input ---------- */
const input = { active: false, ox: 0, oy: 0, x: 0, y: 0, keys: {} };
cv.addEventListener('pointerdown', e => { if (!running || paused) return; audio(); input.active = true; input.ox = input.x = e.clientX; input.oy = input.y = e.clientY; input.id = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
cv.addEventListener('pointermove', e => { if (input.active && e.pointerId === input.id) { input.x = e.clientX; input.y = e.clientY; } });
const endPtr = e => { if (e.pointerId === input.id) input.active = false; };
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
window.addEventListener('keydown', e => { input.keys[e.key.toLowerCase()] = true; if (e.key === 'Escape' && running) togglePause(); });
window.addEventListener('keyup', e => { input.keys[e.key.toLowerCase()] = false; });
function moveVec() {
  let x = 0, y = 0; const k = input.keys;
  if (k['a'] || k['arrowleft']) x -= 1; if (k['d'] || k['arrowright']) x += 1;
  if (k['w'] || k['arrowup']) y -= 1; if (k['s'] || k['arrowdown']) y += 1;
  if (x || y) { const m = Math.hypot(x, y); return { x: x / m, y: y / m, m: 1 }; }
  if (input.active) {
    let dx = input.x - input.ox, dy = input.y - input.oy; const d = Math.hypot(dx, dy), R = 46;
    if (d > R) { input.ox = input.x - dx / d * R; input.oy = input.y - dy / d * R; dx = input.x - input.ox; dy = input.y - input.oy; }
    const dd = Math.hypot(dx, dy); if (dd < 6) return { x: 0, y: 0, m: 0 };
    return { x: dx / dd, y: dy / dd, m: clamp(dd / R, 0.35, 1) };
  }
  return { x: 0, y: 0, m: 0 };
}

/* ---------- Combate ---------- */
// ¿Se puede golpear al enemigo g desde (fx,fy)? d = distancia (Infinity para proyectiles)
function strikeOK(g, fx, fy, d) {
  const p = G.player;
  if (p.ab === 'fury' && !g.boss) return true;
  const diff = Math.abs(angDiff(g.ang, Math.atan2(fy - g.y, fx - g.x)));
  const behind = diff > 1.9;
  if (g.boss) return g.invT <= 0 && (behind || (!g.seesPlayer && g.state !== 'alert'));
  if (g.type === 'heavy') return p.pierce || behind || (!g.seesPlayer && g.state !== 'alert' && diff > 1.2);
  if (g.type === 'dog') return g.state !== 'alert' || g.bite > 0.2;
  return g.state !== 'alert' || behind || d < p.r + g.r + 4;
}
function strike(g, fromX, fromY, ranged) {
  const p = G.player;
  if (!ranged) { p.swing = 0.22; p.swingAng = Math.atan2(g.y - p.y, g.x - p.x); }
  const wid = ranged ? 'star' : save.weapon;
  const SL = { nodachi: ['255,60,85', 30, 2.2], kusarigama: ['190,200,215', 22, 1.2], tanto: ['160,240,255', 13, 1] }[wid] || ['255,255,255', 17, 1];
  G.slashes.push({ x: g.x, y: g.y, a: Math.atan2(g.y - fromY, g.x - fromX), life: 0.25, c: SL[0], r: SL[1], w: SL[2] });
  if (wid === 'tanto') G.slashes.push({ x: g.x, y: g.y, a: Math.atan2(g.y - fromY, g.x - fromX) + 1.6, life: 0.25, c: SL[0], r: SL[1], w: 1 });
  if (wid === 'nodachi') { G.shake = Math.max(G.shake, 8); burst(g.x, g.y, 16, ['#ff3b4e', '#ff8a9a', '#ffd23a'], 300); G.hitstop = 0.1; }
  if (g.boss) hitBoss(g, ranged ? 1 : p.bossDmg);
  else killGuard(g);
}

function update(dt) {
  G.t += dt; G.grace -= dt; G.shake = Math.max(0, G.shake - dt * 18);
  if (G.banner) { G.banner.life -= dt; if (G.banner.life <= 0) G.banner = null; }
  const p = G.player;
  if (!G.over) {
    const v = moveVec();
    if (v.m) { moveCircle(p, v.x * p.spd * v.m * dt, v.y * p.spd * v.m * dt); p.ang = Math.atan2(v.y, v.x); p.walk += dt * 12 * v.m; }
    p.inv = Math.max(0, p.inv - dt); p.swing = Math.max(0, p.swing - dt);
    p.still = v.m ? 0 : p.still + dt; p.smokeT = Math.max(0, p.smokeT - dt);
    p.hidden = p.still >= (p.ab === 'deepcamo' ? 0.05 : 0.3) && p.camo > 0 && p.swing <= 0;

    for (const g of G.guards) {
      if (g.dead) continue;
      const d = Math.hypot(g.x - p.x, g.y - p.y);
      if (d > p.r + g.r + p.reach) continue;
      if (strikeOK(g, p.x, p.y, d)) strike(g, p.x, p.y, false);
      else if ((g.type === 'heavy' || g.boss) && g.state !== 'alert' && g.invT <= 0) alertGuard(g);
    }

    if (p.ranged) {
      p.starCd -= dt;
      if (p.starCd <= 0) {
        let best = null, bd = 4.2 * T;
        for (const g of G.guards) {
          if (g.dead) continue;
          const d = Math.hypot(g.x - p.x, g.y - p.y);
          if (d < bd && d > p.r + g.r + p.reach && los(p, g) && strikeOK(g, p.x, p.y, Infinity)) { bd = d; best = g; }
        }
        if (best) {
          const a = Math.atan2(best.y - p.y, best.x - p.x);
          G.stars.push({ x: p.x, y: p.y, ox: p.x, oy: p.y, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430, life: 0.7, rot: 0 });
          p.starCd = 4.5; SFX.throw();
        }
      }
    }

    if (p.ab === 'magnet') for (const c of G.coins) { const d = Math.hypot(c.x - p.x, c.y - p.y); if (!c.got && d < 95 && d > 1 && los(p, c)) { c.x += (p.x - c.x) / d * 240 * dt; c.y += (p.y - c.y) / d * 240 * dt; } }
    for (const c of G.coins) if (!c.got && Math.hypot(c.x - p.x, c.y - p.y) < 18) { c.got = true; G.coinsGot++; SFX.coin(); floater(c.x, c.y, '+5', '#ffd23a'); updateHUD(); }
    for (const c of G.intel) if (!c.got && Math.hypot(c.x - p.x, c.y - p.y) < 20) { c.got = true; SFX.pick(); vibe(30); floater(c.x, c.y, 'INTEL', '#2ee6ff'); updateHUD(); }
    if (!G.objAnnounced && G.mission !== 'ghost' && objectivesDone()) { G.objAnnounced = true; if (!G.boss) { G.banner = { txt: 'SALIDA ABIERTA', sub: 'Escapa para completar la misión', life: 1.8 }; SFX.pick(); } updateHUD(); }
    if (needsExit() && objectivesDone() && Math.hypot(G.exit.x - p.x, G.exit.y - p.y) < 20) finish(true);
    if (!needsExit() && objectivesDone()) finish(true);
  }

  G.looked = false;
  for (const g of G.guards) updateGuard(g, dt);
  for (const c of G.cams) updateCam(c, dt);
  if (p.hidden && G.looked) p.camo = Math.max(0, p.camo - dt / (p.ab === 'deepcamo' ? 6 : 2.5)); else if (!G.looked) p.camo = Math.min(1, p.camo + dt / 4);

  for (const b of G.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (solidAt(Math.floor(b.x / T), Math.floor(b.y / T))) { b.life = 0; spark(b.x, b.y, '#ffd28a', 4); continue; }
    if (!G.over && Math.hypot(b.x - p.x, b.y - p.y) < p.r + 3) { b.life = 0; hurt(b.dmg); }
  }
  G.bullets = G.bullets.filter(b => b.life > 0);
  for (const s of G.stars) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; s.rot += dt * 25;
    if (solidAt(Math.floor(s.x / T), Math.floor(s.y / T))) { s.life = 0; spark(s.x, s.y, '#cfd8e3', 3); continue; }
    for (const g of G.guards) {
      if (g.dead || Math.hypot(g.x - s.x, g.y - s.y) > g.r + 4) continue;
      s.life = 0;
      if (strikeOK(g, s.ox, s.oy, Infinity)) strike(g, s.ox, s.oy, true);
      else { spark(s.x, s.y, '#cfd8e3', 4); if (g.state !== 'alert') investigate(g, s.ox, s.oy); }
      break;
    }
  }
  G.stars = G.stars.filter(s => s.life > 0);
  for (const q of G.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.9; q.vy *= 0.9; q.life -= dt; if (q.grow) q.s += q.grow * dt; }
  G.parts = G.parts.filter(q => q.life > 0);
  for (const f of G.floaters) { f.y -= 24 * dt; f.life -= dt; }
  G.floaters = G.floaters.filter(f => f.life > 0);
  for (const s of G.slashes) s.life -= dt;
  G.slashes = G.slashes.filter(s => s.life > 0);

  const ct = camTarget();
  G.cam.x = lerp(G.cam.x, ct.x, 1 - Math.pow(0.0005, dt));
  G.cam.y = lerp(G.cam.y, ct.y, 1 - Math.pow(0.0005, dt));
  if (G.over) { G.endT -= dt; if (G.endT <= 0 && !G.shown) { G.shown = true; showResult(); } }
}

function camTarget() {
  const p = G.player, sc = viewScale();
  const vw = W / sc, vh = H / sc, mw = G.cols * T, mh = G.rows * T;
  return { x: mw <= vw ? mw / 2 : clamp(p.x, vw / 2, mw - vw / 2), y: mh + 130 / sc <= vh ? mh / 2 - 65 / sc : clamp(p.y, vh / 2 - 130 / sc, mh - vh / 2) };
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
  const n = g.path[g.pi], dx = n.x - g.x, dy = n.y - g.y, d = Math.hypot(dx, dy);
  if (d < 2) { g.pi++; return g.pi >= g.path.length; }
  const s = Math.min(d, spd * dt);
  g.x += dx / d * s; g.y += dy / d * s; turnTo(g, Math.atan2(dy, dx), 7, dt);
  return false;
}
function pathTo(g, x, y) {
  const p = bfsPath(G.grid, G.cols, G.rows, Math.floor(g.x / T), Math.floor(g.y / T), Math.floor(x / T), Math.floor(y / T));
  g.path = p ? p.map(ctr) : null; g.pi = g.path && g.path.length > 1 ? 1 : 0;
}

function alertGuard(g, silent) {
  if (g.dead || g.state === 'alert') return;
  if (G.player.ab === 'trick' && !G.trickUsed && !G.over) { G.trickUsed = true; g.meter = 0.3; doSmoke('ILUSIÓN'); return; }
  g.state = 'alert'; g.meter = 1; g.reactT = g.react; g.fireCd = 0; g.lostT = 0;
  g.lastSeen = { x: G.player.x, y: G.player.y };
  if (!G.detected) { G.detected = true; updateHUD(); }
  if (!silent) { SFX.alert(); vibe(40); floater(g.x, g.y - 18, '!', '#ff3b4e'); }
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
  g.lookT += dt; g.fireCd -= dt; g.bite -= dt; g.invT -= dt;
  const raw = !G.over && G.grace <= 0 && p.smokeT <= 0 && canSee(g, p);
  if (raw) G.looked = true;
  const seen = raw && !(p.hidden && g.state !== 'alert');
  g.seesPlayer = seen;
  const d = Math.hypot(p.x - g.x, p.y - g.y);
  if (seen) {
    const prox = 1.7 - d / g.range;
    const mult = (g.state === 'search' ? 1.7 : 1) * p.det;
    g.meter = Math.min(1, g.meter + dt / G.P.detTime * prox * mult);
    if (g.meter >= 1) alertGuard(g);
  } else if (g.state !== 'alert') g.meter = Math.max(0, g.meter - dt * 0.35);

  if (g.state !== 'alert' && G.t > 1) {
    for (const o of G.guards) if (o.dead && !g.bodiesSeen.has(o) && canSee(g, o)) { g.bodiesSeen.add(o); investigate(g, o.x, o.y); break; }
  }

  switch (g.state) {
    case 'patrol': {
      if (g.meter > 0.25 && seen) { turnTo(g, Math.atan2(p.y - g.y, p.x - g.x), 2.4, dt); break; }
      const n = g.patrol[g.ppi], dx = n.x - g.x, dy = n.y - g.y, dd = Math.hypot(dx, dy);
      if (dd < 2) { g.ppi = (g.ppi + 1) % g.patrol.length; break; }
      const want = Math.atan2(dy, dx);
      if (Math.abs(angDiff(g.ang, want)) > 0.5) { turnTo(g, want, 5, dt); break; }
      const s = Math.min(dd, g.spd * dt); g.x += dx / dd * s; g.y += dy / dd * s; turnTo(g, want, 5, dt);
      break;
    }
    case 'idle': {
      if (g.meter > 0.25 && seen) { turnTo(g, Math.atan2(p.y - g.y, p.x - g.x), 2.4, dt); break; }
      const sn = g.type === 'sniper' || (g.boss && g.boss.sniper);
      turnTo(g, g.home.ang + Math.sin(g.lookT * (sn ? 0.45 : 0.6)) * (sn ? 0.7 : 1.1), 1.6, dt);
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
      const visible = seen || (p.smokeT <= 0 && d < g.range && !G.over && los(g, p));
      if (g.chargeT > 0) { // embestida de jefe
        g.chargeT -= dt;
        moveCircle(g, Math.cos(g.chargeDir) * 280 * dt, Math.sin(g.chargeDir) * 280 * dt);
        if (!g.chargeHit && d < g.r + p.r + 2) { g.chargeHit = true; hurt(1); }
        if (Math.random() < 0.6) G.parts.push({ x: g.x, y: g.y, vx: 0, vy: 0, life: 0.3, c: 'rgba(255,255,255,0.35)', s: 6 });
        break;
      }
      if (g.windT > 0) { g.windT -= dt; turnTo(g, Math.atan2(p.y - g.y, p.x - g.x), 6, dt); if (g.windT <= 0) { g.chargeT = 0.55; g.chargeDir = g.ang; g.chargeHit = false; } break; }
      if (g.burstLeft > 0) { g.burstT -= dt; if (g.burstT <= 0) { fireBullets(g, g.ang); g.burstLeft--; g.burstT = 0.12; } }
      if (visible) {
        g.lastSeen = { x: p.x, y: p.y }; g.lostT = 0;
        const a = Math.atan2(p.y - g.y, p.x - g.x);
        turnTo(g, a, 9, dt);
        if (g.type === 'dog') {
          moveCircle(g, Math.cos(a) * g.chase * dt, Math.sin(a) * g.chase * dt);
          if (d < g.r + p.r + 3 && g.bite <= 0) { g.bite = 0.9; hurt(1); }
        } else if (g.boss && g.boss.charge) {
          g.reactT -= dt;
          if (g.reactT <= 0 && g.fireCd <= 0 && !G.over) { g.windT = 0.5; g.fireCd = g.fireInt * 1.8; floater(g.x, g.y - 22, '!!', '#ff3b4e'); }
          else if (d > 2 * T) moveCircle(g, Math.cos(a) * g.chase * 0.6 * dt, Math.sin(a) * g.chase * 0.6 * dt);
        } else {
          g.reactT -= dt;
          if (g.reactT <= 0 && g.fireCd <= 0 && g.burstLeft <= 0 && Math.abs(angDiff(g.ang, a)) < 0.35 && !G.over) shoot(g, a);
          if (d > g.range * 0.75) moveCircle(g, Math.cos(a) * g.chase * 0.5 * dt, Math.sin(a) * g.chase * 0.5 * dt);
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

function fireBullets(g, a) {
  const n = g.spread || 1;
  for (let i = 0; i < n; i++) {
    const aa = a + (i - (n - 1) / 2) * 0.18 + (Math.random() - 0.5) * 0.08;
    G.bullets.push({ x: g.x + Math.cos(aa) * 14, y: g.y + Math.sin(aa) * 14, vx: Math.cos(aa) * g.bulletSpd, vy: Math.sin(aa) * g.bulletSpd, life: 2.5, dmg: g.dmg, sniper: g.dmg > 1 });
  }
  SFX.shot(); spark(g.x + Math.cos(a) * 16, g.y + Math.sin(a) * 16, '#fff2a8', 3);
}
function shoot(g, a) {
  fireBullets(g, a);
  if (g.burstN > 1) { g.burstLeft = g.burstN - 1; g.burstT = 0.12; }
  g.fireCd = g.fireInt;
  for (const o of G.guards) if (o !== g && !o.dead && o.state !== 'alert' && o.state !== 'search' && Math.hypot(o.x - g.x, o.y - g.y) < 8 * T) investigate(o, G.player.x, G.player.y);
}

function updateCam(c, dt) {
  c.phase += dt * 0.7; c.cool -= dt;
  c.ang = c.base + Math.sin(c.phase) * 0.85;
  c.range = G.P.range * 1.1; c.fov = 50 * Math.PI / 180;
  const p = G.player;
  const rawC = c.cool <= 0 && !G.over && G.grace <= 0 && p.smokeT <= 0 && p.ab !== 'emp' && canSee(c, p);
  if (rawC) G.looked = true;
  const seen = rawC && !p.hidden;
  if (seen) c.meter = Math.min(1, c.meter + dt / (G.P.detTime * 0.9) * p.det);
  else c.meter = Math.max(0, c.meter - dt * 0.5);
  if (c.meter >= 1) {
    c.meter = 0; c.cool = 5; SFX.alarm(); vibe([40, 40, 40]); floater(c.x, c.y - 16, 'ALARMA', '#ff3b4e');
    if (!G.detected) { G.detected = true; updateHUD(); }
    for (const g of G.guards) if (!g.dead && Math.hypot(g.x - c.x, g.y - c.y) < 10 * T) investigate(g, p.x, p.y);
    if (G.mission === 'ghost') fail('Una cámara te vio');
  }
}

function burst(x, y, n, colors, spd = 220) {
  for (let i = 0; i < n; i++) G.parts.push({ x, y, vx: (Math.random() - 0.5) * spd, vy: (Math.random() - 0.5) * spd, life: 0.4 + Math.random() * 0.3, c: colors[i % colors.length], s: 2 + Math.random() * 2 });
}
function killGuard(g) {
  g.dead = true; g.state = 'dead';
  SFX.kill(); vibe(25); G.shake = 4;
  burst(g.x, g.y, 14, ['#ff3b4e', '#ff3b4e', '#ffffff']);
  if (g.boss) { G.shake = 10; vibe([60, 40, 120]); burst(g.x, g.y, 40, ['#ffd23a', '#ff3b4e', '#ffffff'], 340); G.banner = { txt: 'JEFE DERROTADO', sub: needsExit() ? '¡Ve a la salida!' : '', life: 2 }; }
  if (G.player.ab === 'shadow') G.player.smokeT = Math.max(G.player.smokeT, 1.5);
  if (G.player.ab === 'emp') G.player.camo = 1;
  G.combo = G.t - G.lastKill < 4 ? G.combo + 1 : 1; G.lastKill = G.t; G.hitstop = 0.06;
  const bonus = g.boss ? 30 : Math.min(2 + (G.combo - 1) * 2, 10);
  G.bonus += bonus;
  burst(g.x, g.y, 6, ['#ffd23a', '#fff1a8'], 160);
  floater(g.x, g.y - 22, '+' + bonus, '#ffd23a');
  if (G.combo > 1 && !g.boss) floater(g.x, g.y - 36, 'COMBO x' + G.combo, '#2ee6ff');
  updateHUD();
}
function hitBoss(g, dmg) {
  if (g.invT > 0) return;
  g.hp -= dmg; g.invT = 1.2;
  SFX.bossHit(); vibe([40, 30, 60]); G.shake = 7;
  floater(g.x, g.y - 24, '-' + dmg, '#ffd23a');
  burst(g.x, g.y, 18, ['#ff3b4e', '#ffd23a', '#ffffff']);
  if (g.hp <= 0) { killGuard(g); return; }
  bossEscape(g);
  updateHUD();
}
function bossEscape(g) {
  // bomba de humo: huye a otro punto lejos del jugador
  const p = G.player, ptx = Math.floor(p.x / T), pty = Math.floor(p.y / T), gtx = Math.floor(g.x / T), gty = Math.floor(g.y / T);
  for (let i = 0; i < 24; i++) G.parts.push({ x: g.x + (Math.random() - 0.5) * 20, y: g.y + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.9 + Math.random() * 0.5, c: 'rgba(180,190,205,0.35)', s: 10, grow: 30 });
  SFX.smoke();
  const cand = G.lv.floor.filter(t => Math.abs(t.x - ptx) + Math.abs(t.y - pty) >= 8 && Math.abs(t.x - gtx) + Math.abs(t.y - gty) >= 4);
  const pool = cand.length ? cand : G.lv.floor;
  const t = pool[Math.floor(Math.random() * pool.length)];
  for (const o of G.guards) if (o !== g && !o.dead && Math.hypot(o.x - g.x, o.y - g.y) < 6 * T) investigate(o, p.x, p.y);
  const c = ctr(t);
  g.x = c.x; g.y = c.y; g.home = { x: c.x, y: c.y, ang: Math.random() * Math.PI * 2 }; g.ang = g.home.ang;
  g.state = 'idle'; g.meter = 0; g.path = null; g.patrol = null; g.lastSeen = null; g.burstLeft = 0; g.windT = 0; g.chargeT = 0;
  for (let i = 0; i < 14; i++) G.parts.push({ x: g.x + (Math.random() - 0.5) * 16, y: g.y + (Math.random() - 0.5) * 16, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, life: 0.7, c: 'rgba(180,190,205,0.3)', s: 8, grow: 24 });
  floater(p.x, p.y - 20, '¡HUYÓ!', '#ffd23a');
  if (g.boss.summon && (g.summoned || 0) < 6) {
    g.summoned = (g.summoned || 0) + 2;
    const dd = flood(G.grid, G.cols, G.rows, t.x, t.y);
    const near = G.lv.floor.filter(f => { const v = dd[f.x + f.y * G.cols]; return v >= 2 && v <= 4; });
    for (let i = 0; i < 2 && near.length; i++) {
      const s = near.splice(Math.floor(Math.random() * near.length), 1)[0];
      const ng = mkGuard({ type: 'guard', x: s.x, y: s.y, ang: Math.random() * 6.28, patrol: null, target: false }, G.P);
      G.guards.push(ng); investigate(ng, p.x, p.y);
      for (let k = 0; k < 8; k++) G.parts.push({ x: ng.x, y: ng.y, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.6, c: 'rgba(180,190,205,0.3)', s: 6, grow: 18 });
    }
    G.banner = { txt: 'REFUERZOS', sub: '', life: 1.2 };
  }
}
function useSmoke() {
  if (!G || !running || paused || G.over || G.smokes <= 0) return;
  G.smokes--; doSmoke('HUMO');
}
function doSmoke(label) {
  const p = G.player; p.smokeT = 3; SFX.smoke(); vibe(30);
  for (let i = 0; i < 40; i++) G.parts.push({ x: p.x + (Math.random() - 0.5) * 30, y: p.y + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90, life: 1.2 + Math.random() * 0.8, c: 'rgba(190,200,215,0.3)', s: 12, grow: 34 });
  for (const g of G.guards) if (!g.dead && g.state === 'alert') { g.state = 'search'; g.searchT = 3; g.meter = 0.3; g.path = null; g.burstLeft = 0; g.windT = 0; g.chargeT = 0; floater(g.x, g.y - 30, '?', '#ffd23a'); }
  floater(p.x, p.y - 30, label, '#cfd8e3'); updateHUD();
}
function hurt(n) {
  const p = G.player; if (p.inv > 0 || G.over) return;
  if (p.shield > 0) { p.shield--; p.inv = 0.8; SFX.bossHit(); vibe(40); G.shake = 5; burst(p.x, p.y, 14, ['#ffd23a', '#ffffff'], 240); floater(p.x, p.y - 30, 'BLOQUEADO', '#ffd23a'); return; }
  p.hp -= n; p.inv = 0.6; G.shake = 6; SFX.hurt(); vibe(80);
  burst(p.x, p.y, 8, ['#ff3b4e'], 160);
  updateHUD();
  if (p.hp <= 0) fail('Te eliminaron');
}
function spark(x, y, c, n) { for (let i = 0; i < n; i++) G.parts.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, life: 0.2, c, s: 1.5 }); }
function floater(x, y, txt, c) { if (txt) G.floaters.push({ x, y, txt, c, life: 0.9 }); }
function finish(win) {
  if (G.over) return;
  G.over = true; G.win = win; G.endT = win ? 0.9 : 1.0; input.active = false;
  if (win) { SFX.win(); vibe([30, 40, 60]); } else SFX.lose();
}
function fail(reason) { if (G.over) return; G.failReason = reason; finish(false); }

/* ---------- Dibujo de personajes (compartido con la tienda) ---------- */
function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
function starShape(x, cx, cy, r, rot) {
  x.beginPath();
  for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rad = i % 2 ? r * 0.38 : r; x.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
  x.closePath();
}
// Arma dibujada horizontalmente, centrada en (0,0), largo ~2s
function weaponShape(x, w, s) {
  x.lineCap = 'round';
  const blade = (len, wid, hilt, hiltCol) => {
    x.fillStyle = w.color; x.beginPath(); x.moveTo(-len * 0.35, -wid / 2); x.lineTo(len * 0.6, -wid / 2); x.lineTo(len * 0.68, 0); x.lineTo(len * 0.6, wid / 2); x.lineTo(-len * 0.35, wid / 2); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillRect(-len * 0.35, -wid / 2, len * 0.95, wid * 0.25);
    x.fillStyle = '#c9a23a'; rr(x, -len * 0.39, -wid * 1.4, wid * 0.7, wid * 2.8, wid * 0.3); x.fill();
    x.fillStyle = hiltCol; rr(x, -len * 0.39 - hilt, -wid * 0.75, hilt, wid * 1.5, wid * 0.5); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = wid * 0.25;
    for (let i = 1; i < 5; i++) { const hx = -len * 0.39 - hilt * i / 5; x.beginPath(); x.moveTo(hx - wid * 0.3, -wid * 0.7); x.lineTo(hx + wid * 0.3, wid * 0.7); x.stroke(); }
  };
  if (w.id === 'katana') blade(s * 1.5, s * 0.12, s * 0.42, '#20242c');
  else if (w.id === 'nodachi') {
    // espada gigante: hoja ancha carmesí con filo brillante
    const L = s * 2.3, Wd = s * 0.34, x0 = -L * 0.3;
    x.shadowColor = '#ff2a44'; x.shadowBlur = s * 0.5;
    x.fillStyle = '#8f1326'; x.beginPath(); x.moveTo(x0, -Wd / 2); x.lineTo(L * 0.52, -Wd / 2); x.lineTo(L * 0.7, Wd * 0.35); x.lineTo(L * 0.5, Wd / 2); x.lineTo(x0, Wd / 2); x.closePath(); x.fill();
    x.shadowBlur = 0;
    x.fillStyle = '#ff5468'; x.beginPath(); x.moveTo(x0, Wd * 0.12); x.lineTo(L * 0.66, Wd * 0.3); x.lineTo(L * 0.5, Wd / 2); x.lineTo(x0, Wd / 2); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.75)'; x.fillRect(x0, Wd / 2 - s * 0.05, L * 0.8, s * 0.04);
    x.fillStyle = '#3a0812'; for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(x0 + L * (0.14 + i * 0.14), -Wd * 0.12, s * 0.045, 0, 7); x.fill(); }
    x.fillStyle = '#ffd23a'; rr(x, x0 - s * 0.09, -Wd * 0.95, s * 0.14, Wd * 1.9, s * 0.05); x.fill();
    x.fillStyle = '#20242c'; rr(x, x0 - s * 0.7, -s * 0.09, s * 0.62, s * 0.18, s * 0.07); x.fill();
    x.fillStyle = '#ff3b4e'; for (let i = 0; i < 4; i++) x.fillRect(x0 - s * 0.62 + i * s * 0.15, -s * 0.09, s * 0.05, s * 0.18);
    x.fillStyle = '#ffd23a'; x.beginPath(); x.arc(x0 - s * 0.74, 0, s * 0.1, 0, 7); x.fill();
  }
  else if (w.id === 'tanto') {
    x.save(); x.rotate(-0.35); x.translate(0, -s * 0.12); blade(s * 0.9, s * 0.12, s * 0.3, '#20242c'); x.restore();
    x.save(); x.rotate(0.35); x.translate(0, s * 0.12); blade(s * 0.9, s * 0.12, s * 0.3, '#20242c'); x.restore();
  } else if (w.id === 'kusarigama') {
    x.strokeStyle = '#8a929c'; x.lineWidth = s * 0.05; x.setLineDash([s * 0.06, s * 0.05]);
    x.beginPath(); x.moveTo(-s * 0.2, 0); x.quadraticCurveTo(s * 0.35, s * 0.45, s * 0.85, s * 0.05); x.stroke(); x.setLineDash([]);
    x.fillStyle = '#5a636e'; x.beginPath(); x.arc(s * 0.88, s * 0.05, s * 0.1, 0, 7); x.fill();
    x.fillStyle = '#6b4a2a'; rr(x, -s * 0.95, -s * 0.06, s * 0.8, s * 0.12, s * 0.05); x.fill();
    x.fillStyle = w.color; x.beginPath(); x.moveTo(-s * 0.95, -s * 0.05); x.quadraticCurveTo(-s * 1.05, -s * 0.55, -s * 0.5, -s * 0.62); x.quadraticCurveTo(-s * 0.85, -s * 0.4, -s * 0.8, -s * 0.05); x.closePath(); x.fill();
  } else if (w.id === 'shuriken') {
    x.fillStyle = w.color; starShape(x, -s * 0.35, 0, s * 0.42, 0.3); x.fill(); x.fillStyle = '#20242c'; x.beginPath(); x.arc(-s * 0.35, 0, s * 0.08, 0, 7); x.fill();
    x.fillStyle = w.color; starShape(x, s * 0.45, s * 0.1, s * 0.3, 0.8); x.fill(); x.fillStyle = '#20242c'; x.beginPath(); x.arc(s * 0.45, s * 0.1, s * 0.06, 0, 7); x.fill();
  }
}
// Retrato frontal del ninja: centro (cx,cy), tamaño s
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}
function eyes(x, s, col, y, angry) {
  x.fillStyle = col;
  x.beginPath(); x.ellipse(-s * 0.16, y, s * 0.075, s * 0.055, 0, 0, 7); x.fill();
  x.beginPath(); x.ellipse(s * 0.16, y, s * 0.075, s * 0.055, 0, 0, 7); x.fill();
  if (angry) {
    x.strokeStyle = col; x.lineWidth = s * 0.045; x.lineCap = 'round';
    x.beginPath(); x.moveTo(-s * 0.3, y - s * 0.13); x.lineTo(-s * 0.06, y - s * 0.07); x.stroke();
    x.beginPath(); x.moveTo(s * 0.3, y - s * 0.13); x.lineTo(s * 0.06, y - s * 0.07); x.stroke();
  }
}
// Figura chibi de frente. o = { body, accent, head }. Origen: pecho; cabeza arriba.
function drawFigureRaw(x, o, s) {
  const HY = -s * 0.15, HR = s * 0.54, SK = '#e8c39e', DK = '#121418', A = o.accent, B = o.body;
  const seg = (r, a0, a1) => { x.beginPath(); x.arc(0, HY, r, a0, a1); x.closePath(); x.fill(); };
  const wide = o.head === 'helmet' || o.head === 'boss';
  // --- detrás de la cabeza
  if (o.head === 'pony') {
    x.strokeStyle = '#1a0f14'; x.lineWidth = s * 0.2; x.lineCap = 'round';
    x.beginPath(); x.moveTo(-s * 0.3, -s * 0.6); x.quadraticCurveTo(-s * 1.05, -s * 0.5, -s * 0.85, s * 0.35); x.stroke();
    x.fillStyle = A; x.beginPath(); x.arc(-s * 0.42, -s * 0.6, s * 0.1, 0, 7); x.fill();
  }
  if (o.head === 'fox') {
    for (const k of [-1, 1]) {
      x.fillStyle = '#f4efe6'; x.beginPath(); x.moveTo(k * s * 0.5, -s * 0.42); x.lineTo(k * s * 0.42, -s * 0.98); x.lineTo(k * s * 0.1, -s * 0.6); x.closePath(); x.fill();
      x.fillStyle = A; x.beginPath(); x.moveTo(k * s * 0.42, -s * 0.5); x.lineTo(k * s * 0.39, -s * 0.82); x.lineTo(k * s * 0.22, -s * 0.6); x.closePath(); x.fill();
    }
  }
  // --- brazos
  const bw = wide ? 0.78 : 0.64;
  x.fillStyle = shade(B.startsWith('#') ? B : '#333333', 0.85);
  x.beginPath(); x.ellipse(-s * bw, s * 0.68, s * 0.16, s * 0.3, 0.15, 0, 7); x.fill();
  x.beginPath(); x.ellipse(s * bw, s * 0.68, s * 0.16, s * 0.3, -0.15, 0, 7); x.fill();
  x.fillStyle = o.head === 'visor' || o.head === 'helmet' ? '#30363f' : o.head === 'cloak' ? B : SK;
  x.beginPath(); x.arc(-s * (bw + 0.03), s * 0.95, s * 0.11, 0, 7); x.fill();
  x.beginPath(); x.arc(s * (bw + 0.03), s * 0.95, s * 0.11, 0, 7); x.fill();
  // --- cuerpo
  x.fillStyle = B;
  if (o.head === 'cloak') { x.beginPath(); x.moveTo(-s * 0.45, s * 0.2); x.lineTo(s * 0.45, s * 0.2); x.lineTo(s * 0.85, s * 1.25); x.lineTo(-s * 0.85, s * 1.25); x.closePath(); x.fill(); x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(-s * 0.04, s * 0.3, s * 0.08, s * 0.95); x.fillStyle = A; x.beginPath(); x.arc(0, s * 0.42, s * 0.09, 0, 7); x.fill(); }
  else {
    const w2 = wide ? 0.75 : 0.62;
    rr(x, -s * w2, s * 0.3, s * w2 * 2, s * 0.95, s * 0.3); x.fill();
    if (o.head === 'suit' || o.head === 'boss') {
      x.fillStyle = '#eef2f6'; x.beginPath(); x.moveTo(-s * 0.26, s * 0.3); x.lineTo(0, s * 0.85); x.lineTo(s * 0.26, s * 0.3); x.closePath(); x.fill();
      x.fillStyle = A; x.beginPath(); x.moveTo(-s * 0.07, s * 0.36); x.lineTo(s * 0.07, s * 0.36); x.lineTo(s * 0.1, s * 0.82); x.lineTo(0, s * 0.95); x.lineTo(-s * 0.1, s * 0.82); x.closePath(); x.fill();
      x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.moveTo(-s * 0.26, s * 0.3); x.lineTo(-s * 0.45, s * 0.3); x.lineTo(-s * 0.12, s * 0.8); x.closePath(); x.fill(); x.beginPath(); x.moveTo(s * 0.26, s * 0.3); x.lineTo(s * 0.45, s * 0.3); x.lineTo(s * 0.12, s * 0.8); x.closePath(); x.fill();
    } else if (o.head === 'cap' || o.head === 'boonie') {
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(-s * w2, s * 0.88, s * w2 * 2, s * 0.12);
      x.fillStyle = A; rr(x, s * 0.18, s * 0.48, s * 0.22, s * 0.2, s * 0.04); x.fill();
      x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(-s * 0.03, s * 0.34, s * 0.06, s * 0.54);
    } else if (o.head === 'helmet') {
      x.fillStyle = A; rr(x, -s * 0.9, s * 0.26, s * 0.5, s * 0.28, s * 0.12); x.fill(); rr(x, s * 0.4, s * 0.26, s * 0.5, s * 0.28, s * 0.12); x.fill();
      x.fillStyle = 'rgba(0,0,0,0.3)'; rr(x, -s * 0.4, s * 0.5, s * 0.8, s * 0.5, s * 0.1); x.fill();
    } else if (o.head === 'kabuto') {
      x.fillStyle = A; for (let i = 0; i < 3; i++) x.fillRect(-s * 0.55, s * (0.48 + i * 0.22), s * 1.1, s * 0.06);
      x.fillStyle = shade(B, 0.7); rr(x, -s * 0.92, s * 0.26, s * 0.46, s * 0.3, s * 0.1); x.fill(); rr(x, s * 0.46, s * 0.26, s * 0.46, s * 0.3, s * 0.1); x.fill();
    } else if (o.head === 'visor') {
      x.fillStyle = A; x.shadowColor = A; x.shadowBlur = s * 0.3; x.beginPath(); x.arc(0, s * 0.62, s * 0.13, 0, 7); x.fill(); x.shadowBlur = 0;
      x.strokeStyle = A; x.lineWidth = s * 0.035; x.beginPath(); x.moveTo(-s * 0.5, s * 0.45); x.lineTo(-s * 0.2, s * 0.62); x.moveTo(s * 0.5, s * 0.45); x.lineTo(s * 0.2, s * 0.62); x.stroke();
    } else {
      x.fillStyle = 'rgba(255,255,255,0.07)'; x.beginPath(); x.moveTo(-s * 0.25, s * 0.32); x.lineTo(0, s * 0.68); x.lineTo(s * 0.25, s * 0.32); x.closePath(); x.fill();
      x.fillStyle = A; x.fillRect(-s * 0.6, s * 0.86, s * 1.2, s * 0.13); x.fillRect(s * 0.15, s * 0.86, s * 0.1, s * 0.28);
    }
  }
  // --- cabeza
  const Y = -s * 0.13;
  switch (o.head) {
    case 'pony': {
      x.fillStyle = SK; x.beginPath(); x.arc(0, HY, HR, 0, 7); x.fill();
      x.fillStyle = '#1a0f14'; seg(HR * 1.04, Math.PI + 0.3, -0.3);
      x.beginPath(); x.moveTo(-s * 0.5, -s * 0.3); x.quadraticCurveTo(-s * 0.2, -s * 0.5, s * 0.05, -s * 0.28); x.lineTo(s * 0.1, -s * 0.5); x.lineTo(-s * 0.5, -s * 0.5); x.closePath(); x.fill();
      x.fillStyle = B; seg(HR, 0.05, Math.PI - 0.05);
      x.fillStyle = A; rr(x, -s * 0.5, -s * 0.46, s * 1.0, s * 0.09, s * 0.04); x.fill();
      eyes(x, s, DK, Y, false);
      x.strokeStyle = DK; x.lineWidth = s * 0.03; x.beginPath(); x.moveTo(-s * 0.27, Y - s * 0.04); x.lineTo(-s * 0.2, Y - s * 0.07); x.moveTo(s * 0.27, Y - s * 0.04); x.lineTo(s * 0.2, Y - s * 0.07); x.stroke();
      break;
    }
    case 'kabuto': {
      x.fillStyle = SK; x.beginPath(); x.arc(0, HY, HR, 0, 7); x.fill();
      x.fillStyle = '#2a1212'; seg(HR, 0.1, Math.PI - 0.1);
      x.fillStyle = '#f2ead8'; for (const k of [-0.12, 0, 0.12]) x.fillRect(s * k - s * 0.035, s * 0.06, s * 0.07, s * 0.09);
      x.fillStyle = B; rr(x, -s * 0.72, -s * 0.36, s * 0.22, s * 0.42, s * 0.06); x.fill(); rr(x, s * 0.5, -s * 0.36, s * 0.22, s * 0.42, s * 0.06); x.fill();
      seg(HR * 1.1, Math.PI + 0.22, -0.22);
      x.fillStyle = A; x.fillRect(-s * 0.6, -s * 0.33, s * 1.2, s * 0.07);
      x.strokeStyle = A; x.lineWidth = s * 0.09; x.lineCap = 'round'; x.beginPath(); x.arc(0, -s * 1.0, s * 0.32, 0.12 * Math.PI, 0.88 * Math.PI); x.stroke();
      x.fillStyle = A; x.beginPath(); x.arc(0, -s * 0.62, s * 0.08, 0, 7); x.fill();
      eyes(x, s, DK, Y, true);
      break;
    }
    case 'cloak': {
      x.fillStyle = B; x.beginPath(); x.moveTo(-s * 0.5, -s * 0.4); x.lineTo(s * 0.12, -s * 1.05); x.lineTo(s * 0.52, -s * 0.35); x.closePath(); x.fill();
      x.beginPath(); x.arc(0, HY, HR * 1.06, 0, 7); x.fill();
      x.fillStyle = '#07070c'; x.beginPath(); x.ellipse(0, -s * 0.08, s * 0.38, s * 0.34, 0, 0, 7); x.fill();
      x.shadowColor = A; x.shadowBlur = s * 0.35; x.fillStyle = A;
      x.beginPath(); x.ellipse(-s * 0.15, Y, s * 0.085, s * 0.05, 0.25, 0, 7); x.fill();
      x.beginPath(); x.ellipse(s * 0.15, Y, s * 0.085, s * 0.05, -0.25, 0, 7); x.fill(); x.shadowBlur = 0;
      break;
    }
    case 'visor': {
      x.fillStyle = '#31454d'; x.beginPath(); x.arc(0, HY, HR, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.12)'; x.beginPath(); x.arc(-s * 0.15, -s * 0.4, s * 0.2, 0, 7); x.fill();
      x.strokeStyle = '#8fa3ad'; x.lineWidth = s * 0.05; x.beginPath(); x.moveTo(s * 0.42, -s * 0.48); x.lineTo(s * 0.62, -s * 0.9); x.stroke();
      x.fillStyle = A; x.beginPath(); x.arc(s * 0.62, -s * 0.92, s * 0.07, 0, 7); x.fill();
      x.fillStyle = '#0b1114'; rr(x, -s * 0.45, -s * 0.3, s * 0.9, s * 0.3, s * 0.12); x.fill();
      x.shadowColor = A; x.shadowBlur = s * 0.4; x.fillStyle = A; rr(x, -s * 0.36, -s * 0.2, s * 0.72, s * 0.1, s * 0.05); x.fill(); x.shadowBlur = 0;
      x.strokeStyle = '#1b262b'; x.lineWidth = s * 0.03; for (const k of [-0.1, 0, 0.1]) { x.beginPath(); x.moveTo(s * k, s * 0.12); x.lineTo(s * k, s * 0.26); x.stroke(); }
      break;
    }
    case 'oni': {
      x.fillStyle = B; x.beginPath(); x.arc(0, HY, HR, 0, 7); x.fill();
      x.fillStyle = '#f2ead8';
      for (const k of [-1, 1]) { x.beginPath(); x.moveTo(k * s * 0.34, -s * 0.5); x.quadraticCurveTo(k * s * 0.5, -s * 0.85, k * s * 0.28, -s * 1.02); x.quadraticCurveTo(k * s * 0.3, -s * 0.75, k * s * 0.12, -s * 0.56); x.closePath(); x.fill(); }
      x.fillStyle = '#b8323f'; rr(x, -s * 0.42, -s * 0.46, s * 0.84, s * 0.78, s * 0.26); x.fill();
      x.fillStyle = 'rgba(0,0,0,0.25)'; rr(x, -s * 0.42, -s * 0.02, s * 0.84, s * 0.34, s * 0.2); x.fill();
      eyes(x, s, '#ffd23a', Y - s * 0.03, false);
      x.strokeStyle = DK; x.lineWidth = s * 0.06; x.lineCap = 'round';
      x.beginPath(); x.moveTo(-s * 0.32, -s * 0.32); x.lineTo(-s * 0.06, -s * 0.22); x.moveTo(s * 0.32, -s * 0.32); x.lineTo(s * 0.06, -s * 0.22); x.stroke();
      x.fillStyle = DK; rr(x, -s * 0.24, s * 0.06, s * 0.48, s * 0.14, s * 0.05); x.fill();
      x.fillStyle = '#f2ead8'; for (const k of [-0.17, 0.17]) { x.beginPath(); x.moveTo(s * k - s * 0.05, s * 0.2); x.lineTo(s * k + s * 0.05, s * 0.2); x.lineTo(s * k, s * 0.04); x.closePath(); x.fill(); }
      x.fillStyle = A; rr(x, -s * 0.53, -s * 0.5, s * 1.06, s * 0.08, s * 0.03); x.fill();
      break;
    }
    case 'suit': {
      x.fillStyle = SK; x.beginPath(); x.arc(0, HY, HR, 0, 7); x.fill();
      x.fillStyle = '#2a2018'; seg(HR * 1.04, Math.PI + 0.4, -0.4);
      x.beginPath(); x.moveTo(-s * 0.5, -s * 0.36); x.quadraticCurveTo(-s * 0.1, -s * 0.62, s * 0.5, -s * 0.36); x.lineTo(s * 0.4, -s * 0.6); x.lineTo(-s * 0.4, -s * 0.6); x.closePath(); x.fill();
      x.fillStyle = DK; rr(x, -s * 0.42, -s * 0.24, s * 0.38, s * 0.2, s * 0.07); x.fill(); rr(x, s * 0.04, -s * 0.24, s * 0.38, s * 0.2, s * 0.07); x.fill(); x.fillRect(-s * 0.5, -s * 0.2, s * 1.0, s * 0.045);
      x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(-s * 0.36, -s * 0.2, s * 0.1, s * 0.04); x.fillRect(s * 0.1, -s * 0.2, s * 0.1, s * 0.04);
      x.strokeStyle = '#8a5a4a'; x.lineWidth = s * 0.04; x.lineCap = 'round'; x.beginPath(); x.moveTo(-s * 0.1, s * 0.14); x.quadraticCurveTo(s * 0.05, s * 0.2, s * 0.16, s * 0.1); x.stroke();
      x.strokeStyle = '#cfd8e3'; x.lineWidth = s * 0.03; x.beginPath(); x.arc(s * 0.52, -s * 0.05, s * 0.08, -1, 2); x.stroke();
      break;
    }
    case 'fox': {
      x.fillStyle = B; x.beginPath(); x.arc(0, HY, HR, 0, 7); x.fill();
      x.fillStyle = '#f4efe6'; x.beginPath(); x.moveTo(-s * 0.42, -s * 0.38); x.quadraticCurveTo(0, -s * 0.6, s * 0.42, -s * 0.38); x.quadraticCurveTo(s * 0.4, s * 0.1, 0, s * 0.33); x.quadraticCurveTo(-s * 0.4, s * 0.1, -s * 0.42, -s * 0.38); x.fill();
      x.fillStyle = A; x.beginPath(); x.ellipse(0, -s * 0.36, s * 0.05, s * 0.09, 0, 0, 7); x.fill();
      x.strokeStyle = A; x.lineWidth = s * 0.04; x.lineCap = 'round';
      for (const k of [-1, 1]) { x.beginPath(); x.moveTo(k * s * 0.34, -s * 0.02); x.lineTo(k * s * 0.2, s * 0.03); x.moveTo(k * s * 0.3, s * 0.09); x.lineTo(k * s * 0.18, s * 0.11); x.stroke(); }
      x.strokeStyle = DK; x.lineWidth = s * 0.055;
      x.beginPath(); x.moveTo(-s * 0.28, -s * 0.2); x.quadraticCurveTo(-s * 0.17, -s * 0.1, -s * 0.07, -s * 0.13); x.moveTo(s * 0.28, -s * 0.2); x.quadraticCurveTo(s * 0.17, -s * 0.1, s * 0.07, -s * 0.13); x.stroke();
      x.fillStyle = DK; x.beginPath(); x.arc(0, s * 0.2, s * 0.045, 0, 7); x.fill();
      break;
    }
    case 'cap': {
      x.fillStyle = SK; x.beginPath(); x.arc(0, HY, HR, 0, 7); x.fill();
      x.fillStyle = shade(B, 0.75); seg(HR * 1.06, Math.PI + 0.28, -0.28);
      rr(x, -s * 0.05, -s * 0.36, s * 0.78, s * 0.11, s * 0.05); x.fill();
      x.fillStyle = A; x.beginPath(); x.arc(s * 0.1, -s * 0.52, s * 0.08, 0, 7); x.fill();
      eyes(x, s, DK, Y + s * 0.02, false);
      x.strokeStyle = '#8a5a4a'; x.lineWidth = s * 0.04; x.beginPath(); x.moveTo(-s * 0.1, s * 0.16); x.lineTo(s * 0.12, s * 0.16); x.stroke();
      break;
    }
    case 'boonie': {
      x.fillStyle = SK; x.beginPath(); x.arc(0, HY, HR, 0, 7); x.fill();
      x.fillStyle = '#2c3d22'; x.fillRect(-s * 0.4, -s * 0.06, s * 0.3, s * 0.07); x.fillRect(s * 0.1, -s * 0.06, s * 0.3, s * 0.07);
      eyes(x, s, DK, Y, false);
      x.fillStyle = shade(B, 0.8); x.beginPath(); x.ellipse(0, -s * 0.4, s * 0.8, s * 0.15, 0, 0, 7); x.fill();
      x.fillStyle = B; rr(x, -s * 0.4, -s * 0.8, s * 0.8, s * 0.42, s * 0.16); x.fill();
      x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(-s * 0.4, -s * 0.5, s * 0.8, s * 0.07);
      break;
    }
    case 'helmet': {
      x.fillStyle = '#7a828e'; x.beginPath(); x.arc(0, HY, HR * 1.05, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.15)'; x.beginPath(); x.arc(-s * 0.18, -s * 0.42, s * 0.2, 0, 7); x.fill();
      x.fillStyle = '#0d1014'; rr(x, -s * 0.44, -s * 0.24, s * 0.88, s * 0.18, s * 0.06); x.fill();
      x.fillStyle = '#ff3b4e'; x.fillRect(-s * 0.3, -s * 0.18, s * 0.6, s * 0.05);
      x.fillStyle = '#5a616c'; rr(x, -s * 0.3, s * 0.05, s * 0.6, s * 0.28, s * 0.08); x.fill();
      break;
    }
    case 'boss': {
      x.fillStyle = '#d9b48f'; x.beginPath(); x.arc(0, HY, HR, 0, 7); x.fill();
      x.fillStyle = '#17120f'; seg(HR * 1.04, Math.PI + 0.45, -0.45);
      x.fillStyle = DK; rr(x, -s * 0.44, -s * 0.26, s * 0.88, s * 0.19, s * 0.06); x.fill();
      x.fillStyle = '#ff3b4e'; x.fillRect(-s * 0.34, -s * 0.2, s * 0.22, s * 0.07); x.fillRect(s * 0.12, -s * 0.2, s * 0.22, s * 0.07);
      x.strokeStyle = '#5a3a2a'; x.lineWidth = s * 0.05; x.lineCap = 'round'; x.beginPath(); x.moveTo(-s * 0.16, s * 0.16); x.lineTo(s * 0.16, s * 0.12); x.stroke();
      x.strokeStyle = '#a9705a'; x.lineWidth = s * 0.03; x.beginPath(); x.moveTo(s * 0.3, -s * 0.02); x.lineTo(s * 0.38, s * 0.16); x.stroke();
      x.fillStyle = '#ffd23a'; x.beginPath(); x.moveTo(-s * 0.36, -s * 0.52); x.lineTo(-s * 0.4, -s * 0.9); x.lineTo(-s * 0.18, -s * 0.68); x.lineTo(0, -s * 0.96); x.lineTo(s * 0.18, -s * 0.68); x.lineTo(s * 0.4, -s * 0.9); x.lineTo(s * 0.36, -s * 0.52); x.closePath(); x.fill();
      x.fillStyle = '#ff3b4e'; x.beginPath(); x.arc(0, -s * 0.64, s * 0.05, 0, 7); x.fill();
      break;
    }
    default: { // hood (ninja)
      x.fillStyle = B; x.beginPath(); x.arc(0, HY, HR, 0, 7); x.fill();
      x.fillStyle = SK; rr(x, -s * 0.39, -s * 0.24, s * 0.78, s * 0.21, s * 0.1); x.fill();
      eyes(x, s, DK, Y, true);
      x.fillStyle = '#fff'; x.beginPath(); x.arc(-s * 0.14, -s * 0.15, s * 0.018, 0, 7); x.fill(); x.beginPath(); x.arc(s * 0.18, -s * 0.15, s * 0.018, 0, 7); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.08)'; x.lineWidth = s * 0.03; x.beginPath(); x.moveTo(-s * 0.3, s * 0.08); x.quadraticCurveTo(0, s * 0.14, s * 0.3, s * 0.08); x.stroke();
      x.fillStyle = A; rr(x, -s * 0.53, -s * 0.44, s * 1.06, s * 0.14, s * 0.05); x.fill();
      x.fillStyle = '#c9d3de'; rr(x, -s * 0.15, -s * 0.455, s * 0.3, s * 0.165, s * 0.04); x.fill();
      x.strokeStyle = A; x.lineWidth = s * 0.1; x.lineCap = 'round';
      x.beginPath(); x.moveTo(s * 0.5, -s * 0.38); x.quadraticCurveTo(s * 0.8, -s * 0.55, s * 1.05, -s * 0.42); x.stroke();
      x.beginPath(); x.moveTo(s * 0.5, -s * 0.36); x.quadraticCurveTo(s * 0.78, -s * 0.25, s * 0.98, -s * 0.12); x.stroke();
    }
  }
}
const SPR = new Map();
function figSprite(o, s) {
  const R = s < 22 ? 5 : 2, key = o.head + o.body + o.accent + '|' + s + '|' + R;
  let c = SPR.get(key); if (c) return c;
  const w = Math.ceil(2.7 * s * R), h = Math.ceil(2.8 * s * R), ox = 1.35 * s, oy = 1.3 * s;
  const mk = () => { const e = document.createElement('canvas'); e.width = w; e.height = h; return e; };
  const t = mk(), tx = t.getContext('2d'); tx.scale(R, R); tx.translate(ox, oy); drawFigureRaw(tx, o, s);
  tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = 'source-atop';
  const lg = tx.createLinearGradient(w * 0.2, 0, w * 0.8, h);
  lg.addColorStop(0, 'rgba(255,255,255,0.16)'); lg.addColorStop(0.45, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.3)');
  tx.fillStyle = lg; tx.fillRect(0, 0, w, h);
  const sil = mk(), sx = sil.getContext('2d'); sx.drawImage(t, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = '#05070a'; sx.fillRect(0, 0, w, h);
  const out = mk(), ou = out.getContext('2d'), d = Math.max(1, s * R * 0.05);
  for (let i = 0; i < 12; i++) ou.drawImage(sil, Math.cos(i * Math.PI / 6) * d, Math.sin(i * Math.PI / 6) * d);
  ou.drawImage(t, 0, 0);
  c = { img: out, ox, oy, w: w / R, h: h / R }; SPR.set(key, c); return c;
}
function drawFigure(x, o, s) { const p = figSprite(o, s); x.drawImage(p.img, -p.ox, -p.oy, p.w, p.h); }
function drawPortrait(x, ch, w, cx, cy, s, inGame) {
  x.save(); x.translate(cx, cy);
  const gr = x.createRadialGradient(0, -s * 0.1, s * 0.1, 0, 0, s * 1.35);
  gr.addColorStop(0, ch.band + (inGame ? '70' : '55')); gr.addColorStop(1, ch.band + '00');
  x.fillStyle = gr; x.beginPath(); x.arc(0, 0, s * 1.35, 0, 7); x.fill();
  if (w.id !== 'shuriken') { x.save(); x.translate(s * 0.05, s * 0.1); x.rotate(-0.85); x.scale(-1, 1); weaponShape(x, w, s * 0.85); x.restore(); }
  if (!inGame) {
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(0, s * 1.68, s * 0.7, s * 0.1, 0, 0, 7); x.fill();
    x.strokeStyle = '#05070a'; x.lineWidth = s * 0.06;
    x.fillStyle = shade(ch.body, 0.8); for (const k of [-0.44, 0.1]) { rr(x, s * k, s * 1.1, s * 0.34, s * 0.5, s * 0.1); x.fill(); x.stroke(); }
    x.fillStyle = '#0d1014'; for (const k of [-0.5, 0.06]) { rr(x, s * k, s * 1.5, s * 0.44, s * 0.17, s * 0.08); x.fill(); x.stroke(); }
    x.fillStyle = ch.band; for (const k of [-0.44, 0.1]) x.fillRect(s * k, s * 1.4, s * 0.34, s * 0.06);
  }
  drawFigure(x, { body: ch.body, accent: ch.band, head: ch.head }, s);
  if (w.id === 'shuriken') { x.fillStyle = w.color; starShape(x, s * 0.72, s * 0.9, s * 0.2, 0.4); x.fill(); x.fillStyle = '#20242c'; x.beginPath(); x.arc(s * 0.72, s * 0.9, s * 0.04, 0, 7); x.fill(); }
  x.restore();
}
function drawBossPortrait(x, B, cx, cy, s) {
  x.save(); x.translate(cx, cy);
  const gr = x.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 1.3); gr.addColorStop(0, 'rgba(255,59,78,0.35)'); gr.addColorStop(1, 'rgba(255,59,78,0)');
  x.fillStyle = gr; x.beginPath(); x.arc(0, 0, s * 1.3, 0, 7); x.fill();
  drawFigure(x, { body: B.color, accent: '#ffd23a', head: 'boss' }, s);
  x.restore();
}

/* ---------- Escenario (se dibuja una vez por nivel) ---------- */
function buildBg(G) {
  const S = 3, c = document.createElement('canvas'); c.width = G.cols * T * S; c.height = G.rows * T * S;
  const x = c.getContext('2d'); x.scale(S, S);
  const z = G.zone, zi = ZONES.indexOf(z), R = rng(G.L * 31 + 7);
  const at = (tx, ty) => (tx < 0 || ty < 0 || tx >= G.cols || ty >= G.rows) ? 1 : G.grid[tx + ty * G.cols];
  x.fillStyle = '#06080c'; x.fillRect(0, 0, G.cols * T, G.rows * T);
  // suelo
  for (let ty = 0; ty < G.rows; ty++) for (let tx = 0; tx < G.cols; tx++) {
    if (at(tx, ty) === 1) continue;
    const px = tx * T, py = ty * T;
    x.fillStyle = (tx + ty) & 1 ? z.floor : z.floor2; x.fillRect(px, py, T, T);
    if (zi === 0) { // tablones
      for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(px, py + i * 8, T, 1); x.fillStyle = 'rgba(255,255,255,0.035)'; x.fillRect(px, py + i * 8 + 1, T, 1); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(px + ((tx * 7 + ty * 13 + i * 5) % 4) * 8, py + i * 8, 1, 8); }
    } else if (zi === 1) { // alfombra de oficina
      x.fillStyle = 'rgba(255,255,255,0.03)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) x.fillRect(px + 3 + i * 8, py + 3 + j * 8, 2, 2);
      x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect(px, py, T, 1); x.fillRect(px, py, 1, T);
    } else if (zi === 2) { // loseta de laboratorio
      x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(px, py, T, 1); x.fillRect(px, py, 1, T);
      x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(px + T - 1, py, 1, T); x.fillRect(px, py + T - 1, T, 1);
      x.fillStyle = z.accent + '30'; x.fillRect(px + 2, py + 2, 3, 3);
    } else if (zi === 3) { // rombos de casino
      x.fillStyle = 'rgba(255,255,255,0.04)'; x.beginPath(); x.moveTo(px + 16, py + 3); x.lineTo(px + 29, py + 16); x.lineTo(px + 16, py + 29); x.lineTo(px + 3, py + 16); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,210,58,0.28)'; x.fillRect(px + 15, py + 15, 2, 2); x.fillRect(px - 1, py - 1, 2, 2);
    } else { // piedra
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(px, py, T, 1.5); x.fillRect(px, py, 1.5, T);
      x.fillStyle = 'rgba(255,255,255,0.04)'; x.fillRect(px + 1.5, py + 1.5, T - 1.5, 1);
      if (R() < 0.35) { x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 1; x.beginPath(); const ax = px + 4 + R() * 24, ay = py + 4 + R() * 24; x.moveTo(ax, ay); x.lineTo(ax + (R() - 0.5) * 14, ay + (R() - 0.5) * 14); x.lineTo(ax + (R() - 0.5) * 20, ay + (R() - 0.5) * 20); x.stroke(); }
    }
    if (R() < 0.05) { x.fillStyle = 'rgba(0,0,0,0.16)'; x.beginPath(); x.ellipse(px + 16, py + 16, 8 + R() * 8, 5 + R() * 6, R() * 3, 0, 7); x.fill(); }
  }
  // charcos de luz
  for (let ty = 0; ty < G.rows; ty++) for (let tx = 0; tx < G.cols; tx++) {
    if (at(tx, ty) !== 0 || R() > 0.045) continue;
    const cx = tx * T + 16, cy = ty * T + 16, gr = x.createRadialGradient(cx, cy, 4, cx, cy, T * 2.6);
    gr.addColorStop(0, z.accent + '26'); gr.addColorStop(1, z.accent + '00'); x.fillStyle = gr; x.fillRect(cx - T * 2.6, cy - T * 2.6, T * 5.2, T * 5.2);
  }
  // sombras de los muros sobre el suelo
  for (let ty = 0; ty < G.rows; ty++) for (let tx = 0; tx < G.cols; tx++) {
    if (at(tx, ty) === 1) continue;
    const px = tx * T, py = ty * T;
    if (at(tx, ty - 1) === 1) { const g = x.createLinearGradient(0, py, 0, py + 14); g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px, py, T, 14); }
    if (at(tx - 1, ty) === 1) { const g = x.createLinearGradient(px, 0, px + 8, 0); g.addColorStop(0, 'rgba(0,0,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px, py, 8, T); }
    if (at(tx + 1, ty) === 1) { const g = x.createLinearGradient(px + T, 0, px + T - 6, 0); g.addColorStop(0, 'rgba(0,0,0,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px + T - 6, py, 6, T); }
  }
  // muros
  for (let ty = 0; ty < G.rows; ty++) for (let tx = 0; tx < G.cols; tx++) {
    if (at(tx, ty) !== 1) continue;
    const px = tx * T, py = ty * T;
    let near = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(tx + dx, ty + dy) !== 1) near = true;
    if (!near) { x.fillStyle = '#0a0d13'; x.fillRect(px, py, T, T); continue; }
    const below = at(tx, ty + 1) !== 1, FH = 12;
    const WT = shade(z.wallTop, 0.78);
    x.fillStyle = WT; x.fillRect(px, py, T, T);
    x.fillStyle = 'rgba(255,255,255,0.07)'; x.fillRect(px + 2, py + 2, T - 4, T - 4 - (below ? FH : 0));
    x.fillStyle = WT; x.fillRect(px + 4, py + 4, T - 8, T - 8 - (below ? FH : 0));
    if (below) {
      x.fillStyle = shade(z.wall, 0.8); x.fillRect(px, py + T - FH, T, FH);
      x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(px, py + T - FH + 5, T, 1); x.fillRect(px + (tx % 2 ? 10 : 22), py + T - FH, 1, 5); x.fillRect(px + (tx % 2 ? 22 : 10), py + T - FH + 6, 1, 6);
      x.fillStyle = 'rgba(255,255,255,0.2)'; x.fillRect(px, py + T - FH - 1, T, 1.5);
      x.fillStyle = z.accent + '66'; x.fillRect(px, py + T - 2.5, T, 1);
    }
    x.fillStyle = 'rgba(0,0,0,0.45)';
    if (at(tx - 1, ty) !== 1) x.fillRect(px, py, 1.2, T);
    if (at(tx + 1, ty) !== 1) x.fillRect(px + T - 1.2, py, 1.2, T);
    if (at(tx, ty - 1) !== 1) x.fillRect(px, py, T, 1.2);
    if (at(tx, ty - 1) === 1 && at(tx, ty + 1) === 1 && !below) { x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(px, py + T - 1, T, 1); }
  }
  // cajas
  for (let ty = 0; ty < G.rows; ty++) for (let tx = 0; tx < G.cols; tx++) {
    if (at(tx, ty) !== 2) continue;
    const px = tx * T, py = ty * T, metal = (tx + ty * 3 + G.L) % 3 === 0;
    const col = metal ? '#4a5563' : z.crate;
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.beginPath(); x.ellipse(px + 17, py + 28, 15, 5, 0, 0, 7); x.fill();
    x.fillStyle = '#05070a'; rr(x, px + 2, py - 1, T - 4, T - 1, 3); x.fill();
    x.fillStyle = shade(col, 0.62); rr(x, px + 3, py + 8, T - 6, T - 9, 2); x.fill();
    x.fillStyle = col; rr(x, px + 3, py, T - 6, T - 12, 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.16)'; x.fillRect(px + 4, py + 1, T - 8, 2);
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 1.5; x.strokeRect(px + 6.5, py + 3.5, T - 13, T - 19);
    if (metal) { x.fillStyle = z.accent + 'aa'; x.fillRect(px + 8, py + 24, 6, 2); x.fillStyle = 'rgba(0,0,0,0.3)'; for (const k of [7, 24]) for (const j of [5, 15]) { x.beginPath(); x.arc(px + k + 0.5, py + j, 1, 0, 7); x.fill(); } }
    else { x.beginPath(); x.moveTo(px + 7, py + 4); x.lineTo(px + T - 7, py + T - 16); x.moveTo(px + T - 7, py + 4); x.lineTo(px + 7, py + T - 16); x.stroke(); x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(px + 3, py + 21, T - 6, 1); x.fillRect(px + 3, py + 26, T - 6, 1); }
  }
  return c;
}

/* ---------- Render ---------- */
function viewScale() { return Math.min(W / (8.5 * T), H / (10 * T)); }

function draw() {
  const z = G.zone, sc = viewScale();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#07090d'; ctx.fillRect(0, 0, W, H);
  const sx = (Math.random() - 0.5) * G.shake, sy = (Math.random() - 0.5) * G.shake;
  ctx.setTransform(DPR * sc, 0, 0, DPR * sc, DPR * (W / 2 - G.cam.x * sc + sx), DPR * (H / 2 - G.cam.y * sc + sy));
  const vw = W / sc, vh = H / sc;
  const x0 = Math.max(0, Math.floor((G.cam.x - vw / 2) / T) - 1), x1 = Math.min(G.cols - 1, Math.ceil((G.cam.x + vw / 2) / T) + 1);
  const y0 = Math.max(0, Math.floor((G.cam.y - vh / 2) / T) - 1), y1 = Math.min(G.rows - 1, Math.ceil((G.cam.y + vh / 2) / T) + 1);

  ctx.drawImage(G.bg, 0, 0, G.cols * T, G.rows * T);
  {
    const on = objectivesDone(), pulse = 0.5 + 0.5 * Math.sin(G.t * 4);
    ctx.save(); ctx.translate(G.exit.x, G.exit.y);
    if (on) { const gr = ctx.createRadialGradient(0, 0, 4, 0, 0, 34); gr.addColorStop(0, `rgba(55,245,154,${0.3 + pulse * 0.2})`); gr.addColorStop(1, 'rgba(55,245,154,0)'); ctx.fillStyle = gr; ctx.fillRect(-34, -34, 68, 68); }
    ctx.fillStyle = '#05070a'; rr(ctx, -15, -15, 30, 30, 5); ctx.fill();
    ctx.fillStyle = on ? '#12402c' : '#1c212b'; rr(ctx, -13, -13, 26, 26, 4); ctx.fill();
    ctx.strokeStyle = on ? '#37f59a' : '#5a6475'; ctx.lineWidth = 2; rr(ctx, -13, -13, 26, 26, 4); ctx.stroke();
    if (on) { ctx.strokeStyle = '#37f59a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; for (const k of [-4, 3]) { const o = k + (pulse - 0.5) * 2; ctx.beginPath(); ctx.moveTo(-6, o + 3); ctx.lineTo(0, o - 3); ctx.lineTo(6, o + 3); ctx.stroke(); } ctx.fillStyle = '#37f59a'; ctx.font = '900 7px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SALIDA', 0, -21); }
    else { ctx.fillStyle = '#8a96a8'; rr(ctx, -5, -1, 10, 8, 2); ctx.fill(); ctx.strokeStyle = '#8a96a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -2, 3.5, Math.PI, 0); ctx.stroke(); }
    ctx.restore();
  }
  for (const g of G.guards) if (!g.dead) drawCone(g, coneColor(g));
  for (const c of G.cams) drawCone(c, c.cool > 0 ? 'rgba(255,59,78,0.10)' : c.meter > 0.05 ? `rgba(255,${Math.floor(210 - c.meter * 150)},60,0.30)` : 'rgba(255,90,90,0.14)');

  for (const c of G.coins) if (!c.got) {
    const w = Math.abs(Math.cos(G.t * 3 + c.x)) * 6 + 1;
    const cy = c.y + Math.sin(G.t * 3 + c.x) * 1.5 - 2; ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(c.x, c.y + 8, 5, 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,210,58,0.15)'; ctx.beginPath(); ctx.arc(c.x, cy, 11, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.ellipse(c.x, cy, w, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff1a8'; ctx.beginPath(); ctx.ellipse(c.x, cy, w * 0.4, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (const c of G.intel) if (!c.got) {
    const b = Math.sin(G.t * 3) * 2;
    ctx.fillStyle = 'rgba(46,230,255,0.2)'; ctx.beginPath(); ctx.arc(c.x, c.y, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8d2dc'; ctx.fillRect(c.x - 9, c.y - 6 + b, 18, 13);
    ctx.fillStyle = '#2ee6ff'; ctx.fillRect(c.x - 9, c.y - 1 + b, 18, 2);
    ctx.strokeStyle = '#c8d2dc'; ctx.lineWidth = 2; ctx.strokeRect(c.x - 4, c.y - 9 + b, 8, 4);
  }
  for (const c of G.cams) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.ang);
    ctx.fillStyle = '#2a2f38'; ctx.fillRect(-7, -6, 14, 12);
    ctx.fillStyle = c.cool > 0 ? '#ff3b4e' : '#9aa6b5'; ctx.fillRect(4, -4, 7, 8);
    ctx.fillStyle = (Math.floor(G.t * 3) % 2) ? '#ff3b4e' : '#5a1520'; ctx.beginPath(); ctx.arc(-3, 0, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  for (const g of G.guards) if (g.dead) drawGuard(g);
  for (const g of G.guards) if (!g.dead) drawGuard(g);
  drawPlayer();

  for (const b of G.bullets) {
    ctx.strokeStyle = b.sniper ? '#ff6b6b' : '#ffe48a'; ctx.lineWidth = b.sniper ? 3 : 2.5;
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.025, b.y - b.vy * 0.025); ctx.stroke();
  }
  for (const s of G.stars) { ctx.fillStyle = '#d7e0ea'; starShape(ctx, s.x, s.y, 6, s.rot); ctx.fill(); }
  for (const s of G.slashes) {
    const k = s.life / 0.25;
    const c = s.c || '255,255,255', r = s.r || 16, w = s.w || 1;
    if (w > 1.5) { ctx.strokeStyle = `rgba(${c},${k * 0.35})`; ctx.lineWidth = (3 * k + 1) * w * 2.2; ctx.beginPath(); ctx.arc(s.x - Math.cos(s.a) * 6, s.y - Math.sin(s.a) * 6, r, s.a - 1.9 + (1 - k), s.a + 0.7 + (1 - k)); ctx.stroke(); }
    ctx.strokeStyle = `rgba(${c},${k})`; ctx.lineWidth = (3 * k + 1) * w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(s.x - Math.cos(s.a) * 6, s.y - Math.sin(s.a) * 6, r, s.a - 1.6 + (1 - k), s.a + 0.4 + (1 - k)); ctx.stroke();
    if (w > 1.5) { ctx.strokeStyle = `rgba(255,255,255,${k})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x - Math.cos(s.a) * 6, s.y - Math.sin(s.a) * 6, r, s.a - 1.4 + (1 - k), s.a + 0.2 + (1 - k)); ctx.stroke(); }
  }
  for (const q of G.parts) { ctx.globalAlpha = clamp(q.life * 3, 0, 1); ctx.fillStyle = q.c; if (q.grow) { ctx.beginPath(); ctx.arc(q.x, q.y, q.s, 0, 7); ctx.fill(); } else ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of G.floaters) { ctx.globalAlpha = clamp(f.life * 2, 0, 1); ctx.font = '900 12px system-ui'; ctx.fillStyle = '#000'; ctx.fillText(f.txt, f.x + 1, f.y + 1); ctx.fillStyle = f.c; ctx.fillText(f.txt, f.x, f.y); }
  ctx.globalAlpha = 1;

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  { const px = (G.player.x - G.cam.x) * sc + W / 2, py = (G.player.y - G.cam.y) * sc + H / 2;
    const vg = ctx.createRadialGradient(px, py, 110, px, py, Math.max(W, H) * 0.8);
    vg.addColorStop(0, 'rgba(4,6,10,0)'); vg.addColorStop(1, 'rgba(4,6,10,0.62)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H); }
  drawIndicators(sc);
  const p = G.player;
  if (p.inv > 0.3) { ctx.fillStyle = `rgba(255,40,60,${(p.inv - 0.3) * 0.6})`; ctx.fillRect(0, 0, W, H); }
  if (input.active && running && !paused) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(input.ox, input.oy, 46, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(46,230,255,0.45)'; ctx.beginPath(); ctx.arc(input.x, input.y, 18, 0, Math.PI * 2); ctx.fill();
  }
  if (G.banner && running) {
    const k = Math.min(1, G.banner.life * 2, (2.6 - G.banner.life) * 4 + 0.2);
    ctx.globalAlpha = clamp(k, 0, 1);
    ctx.fillStyle = 'rgba(7,9,13,0.75)'; ctx.fillRect(0, H * 0.36, W, 74);
    ctx.fillStyle = '#ff3b4e'; ctx.fillRect(0, H * 0.36, W, 3); ctx.fillRect(0, H * 0.36 + 71, W, 3);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.font = '900 26px system-ui'; ctx.fillText(G.banner.txt, W / 2, H * 0.36 + (G.banner.sub ? 28 : 37));
    if (G.banner.sub) { ctx.fillStyle = '#ffd23a'; ctx.font = '700 13px system-ui'; ctx.fillText(G.banner.sub.toUpperCase(), W / 2, H * 0.36 + 54); }
    ctx.globalAlpha = 1;
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
  for (let i = 0; i <= n; i++) { const a = g.ang - half + (g.fov * i) / n, d = ray(g.x, g.y, a, g.range); ctx.lineTo(g.x + Math.cos(a) * d, g.y + Math.sin(a) * d); }
  ctx.closePath(); ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
  if (g.meter > 0.02 && g.state !== 'alert') {
    ctx.fillStyle = 'rgba(255,200,60,0.18)'; ctx.beginPath(); ctx.moveTo(g.x, g.y);
    const rr2 = g.range * g.meter;
    for (let i = 0; i <= n; i++) { const a = g.ang - half + (g.fov * i) / n, d = Math.min(rr2, ray(g.x, g.y, a, g.range)); ctx.lineTo(g.x + Math.cos(a) * d, g.y + Math.sin(a) * d); }
    ctx.closePath(); ctx.fill();
  }
}

const ESPEC = {
  guard:  { body: '#3f5f8f', accent: '#ffd23a', head: 'cap' },
  sniper: { body: '#4d6b3a', accent: '#2c3d22', head: 'boonie' },
  heavy:  { body: '#5a606b', accent: '#a9b0bb', head: 'helmet' },
};
function drawGuard(g) {
  const spec = g.boss ? { body: g.boss.color, accent: '#ffd23a', head: 'boss' } : ESPEC[g.type];
  const s = g.boss ? 13 : g.type === 'heavy' ? 11.5 : 10;
  const moved = Math.hypot(g.x - (g._px === undefined ? g.x : g._px), g.y - (g._py === undefined ? g.y : g._py)); g._px = g.x; g._py = g.y;
  if (moved > 0.05) g.walk = (g.walk || 0) + moved * 0.28;
  const step = moved > 0.05 ? Math.sin(g.walk) : 0;
  const c = Math.cos(g.ang); if (c < -0.2) g.face = -1; else if (c > 0.2) g.face = 1; else if (!g.face) g.face = 1;
  ctx.save(); ctx.translate(g.x, g.y);
  if (g.dead) {
    ctx.fillStyle = 'rgba(120,10,20,0.5)'; ctx.beginPath(); ctx.ellipse(0, 2, g.r + 8, g.r + 1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.8;
    if (g.type === 'dog') { ctx.fillStyle = '#6b5236'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 6, 0.4, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.scale(1.2, 1.2); ctx.rotate(g.face * Math.PI / 2); ctx.translate(0, -3); drawFigure(ctx, spec, s * 0.95); }
    ctx.restore(); ctx.globalAlpha = 1; return;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0, 10, g.r, 4, 0, 0, Math.PI * 2); ctx.fill();
  if (g.target && !g.boss) { ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(0, -3, g.r + 9 + Math.sin(G.t * 5), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  if (g.boss) { ctx.strokeStyle = `rgba(255,59,78,${0.5 + 0.3 * Math.sin(G.t * 6)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -4, g.r + 10, 0, Math.PI * 2); ctx.stroke(); }
  if (g.boss && g.invT > 0 && Math.floor(G.t * 16) % 2) ctx.globalAlpha = 0.4;
  if (g.windT > 0) ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
  ctx.scale(1.25, 1.25);
  if (g.type === 'dog') {
    ctx.scale(g.face, 1);
    ctx.fillStyle = '#5a4430'; for (const lx of [-7, -3, 4, 8]) ctx.fillRect(lx, 3 + (lx % 2 ? step : -step) * 1.5, 2.5, 6);
    ctx.strokeStyle = '#8a6a45'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-10, -1); ctx.quadraticCurveTo(-15, -6, -13, -9); ctx.stroke();
    ctx.fillStyle = '#8a6a45'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -5, 5, 0, Math.PI * 2); ctx.fill(); rr(ctx, 12, -5, 6, 4, 1.5); ctx.fill();
    ctx.fillStyle = '#5a4430'; ctx.beginPath(); ctx.moveTo(7, -8); ctx.lineTo(8, -13); ctx.lineTo(11, -9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#121418'; ctx.beginPath(); ctx.arc(11.5, -6, 1, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(18, -4, 1.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff3b4e'; ctx.fillRect(5, -3, 2, 5);
  } else {
    const leg = shade(spec.body, 0.7);
    ctx.fillStyle = leg; rr(ctx, -5, 4 + step * 1.8, 4, 6.5, 1.5); ctx.fill(); rr(ctx, 1, 4 - step * 1.8, 4, 6.5, 1.5); ctx.fill();
    ctx.fillStyle = '#121418'; ctx.fillRect(-5, 9.3 + step * 1.8, 4, 1.4); ctx.fillRect(1, 9.3 - step * 1.8, 4, 1.4);
    ctx.save(); ctx.translate(0, -7 - Math.abs(step) * 1.2); ctx.scale(g.face, 1); drawFigure(ctx, spec, s); ctx.restore();
    // arma apuntando hacia donde mira
    const long = g.type === 'sniper' || (g.boss && g.boss.sniper);
    ctx.save(); ctx.translate(0, -1); ctx.rotate(g.ang);
    if (g.type === 'heavy') { ctx.strokeStyle = '#c3cad4'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, 0, g.r + 4, -0.95, 0.95); ctx.stroke(); }
    if (!(g.boss && g.boss.charge)) {
      ctx.fillStyle = '#0d1014'; rr(ctx, 5, -1.8, long ? 20 : 12, 3.6, 1); ctx.fill();
      ctx.fillStyle = '#3a414c'; ctx.fillRect(5, -1.8, 4, 3.6);
      if (g.fireCd > g.fireInt - 0.07) { ctx.fillStyle = '#fff2a8'; ctx.beginPath(); ctx.arc((long ? 27 : 19), 0, 4, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }
  ctx.restore(); ctx.globalAlpha = 1;
  const laser = g.type === 'sniper' || (g.boss && g.boss.sniper);
  if (laser && g.state !== 'alert') {
    const d = ray(g.x, g.y, g.ang, g.range);
    ctx.strokeStyle = 'rgba(255,40,40,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x + Math.cos(g.ang) * d, g.y + Math.sin(g.ang) * d); ctx.stroke();
  }
  const top = g.type === 'dog' ? g.y - 22 : g.y - (7 + s * 1.05) * 1.25;
  if (g.boss) {
    const w = 36, y = top - 8;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(g.x - w / 2 - 1, y - 1, w + 2, 6);
    ctx.fillStyle = '#ff3b4e'; ctx.fillRect(g.x - w / 2, y, w * g.hp / g.maxHp, 4);
    ctx.font = '900 8px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffd23a'; ctx.fillText(g.boss.name, g.x, y - 7);
  }
  if (g.state === 'alert' || g.meter > 0.05) {
    ctx.font = '900 15px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000'; ctx.fillText(g.state === 'alert' ? '!' : '?', g.x + (g.boss ? 27 : 0) + 1, top - (g.boss ? 4 : 6) + 1);
    ctx.fillStyle = g.state === 'alert' ? '#ff3b4e' : '#ffd23a';
    ctx.fillText(g.state === 'alert' ? '!' : '?', g.x + (g.boss ? 27 : 0), top - (g.boss ? 4 : 6));
  }
}

// Ninja (sprite chibi, mira hacia donde camina)
function drawPlayer() {
  const p = G.player, ch = charOf(), wp = weaponOf();
  if (p.inv > 0 && Math.floor(G.t * 20) % 2) return;
  const c = Math.cos(p.ang);
  if (c < -0.15) p.face = -1; else if (c > 0.15) p.face = 1; else if (!p.face) p.face = 1;
  const moving = input.active || Object.values(input.keys).some(Boolean);
  const step = moving ? Math.sin(p.walk) : 0;
  const bob = Math.abs(step) * 1.4;
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(0, 10, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = ch.band + '30'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, p.r + p.reach + 6, 0, Math.PI * 2); ctx.stroke();
  if (p.ranged) { const k = clamp(1 - p.starCd / 4.5, 0, 1); ctx.strokeStyle = k >= 1 ? '#d7e0ea' : 'rgba(215,224,234,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, p.r + 9, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke(); }
  // flecha de dirección
  ctx.save(); ctx.rotate(p.ang); ctx.fillStyle = ch.band; ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.moveTo(p.r + 7, 0); ctx.lineTo(p.r + 2, -3.5); ctx.lineTo(p.r + 2, 3.5); ctx.closePath(); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
  if (p.hidden || p.smokeT > 0) {
    ctx.strokeStyle = 'rgba(46,230,255,0.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(0, -4, 22, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
  if (p.shield > 0) { ctx.strokeStyle = `rgba(255,210,58,${0.6 + 0.3 * Math.sin(G.t * 5)})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -4, 19, 0, Math.PI * 2); ctx.stroke(); }
  if (p.camo < 1) { ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -4, 26, -2.2, -0.94); ctx.stroke(); ctx.strokeStyle = p.camo > 0.3 ? '#2ee6ff' : '#ff3b4e'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -4, 26, -2.2, -2.2 + 1.26 * p.camo); ctx.stroke(); }
  if (p.hidden || p.smokeT > 0) ctx.globalAlpha = 0.4;
  ctx.scale(1.25, 1.25);
  // piernas
  ctx.fillStyle = shade(ch.body, 0.75); ctx.strokeStyle = '#05070a'; ctx.lineWidth = 1;
  rr(ctx, -5, 4 + step * 1.8, 4, 6.5, 1.5); ctx.fill();
  rr(ctx, 1, 4 - step * 1.8, 4, 6.5, 1.5); ctx.fill();
  ctx.fillStyle = ch.band; ctx.fillRect(-5, 9.5 + step * 1.8, 4, 1.2); ctx.fillRect(1, 9.5 - step * 1.8, 4, 1.2);
  // cuerpo y cabeza
  ctx.save(); ctx.translate(0, -7 - bob); ctx.scale(p.face, 1);
  drawPortrait(ctx, ch, wp, 0, 0, 10.5, true);
  ctx.restore();
  // arma en la mano
  if (p.swing <= 0 && wp.id !== 'shuriken') {
    const big = wp.id === 'nodachi', hs = big ? 0.56 : 0.4;
    ctx.save(); ctx.translate(p.face * 8.5, 1 - bob); ctx.scale(p.face, 1); ctx.rotate(-1.15 + Math.sin(G.t * 2.5) * 0.05); ctx.scale(hs, hs); ctx.translate(big ? 14 : 10, 0); weaponShape(ctx, wp, 26); ctx.restore();
  }
  // golpe
  if (p.swing > 0) {
    const k = 1 - p.swing / 0.22;
    ctx.save(); ctx.rotate(p.swingAng - 1.3 + k * 2.6); ctx.translate(wp.id === 'nodachi' ? 20 : 16, 0); const ws = wp.id === 'nodachi' ? 0.6 : 0.42; ctx.scale(ws, ws); weaponShape(ctx, wp, 26); ctx.restore();
  }
  ctx.restore();
}

function drawIndicators(sc) {
  const pts = [];
  if (G.mission === 'target' || G.mission === 'boss') G.guards.forEach(g => { if (g.target && !g.dead) pts.push({ x: g.x, y: g.y, c: g.boss ? '#ff3b4e' : '#ffd23a' }); });
  if (G.mission === 'intel') G.intel.forEach(i => { if (!i.got) pts.push({ x: i.x, y: i.y, c: '#2ee6ff' }); });
  if (needsExit() && objectivesDone()) pts.push({ x: G.exit.x, y: G.exit.y, c: '#37f59a' });
  for (const q of pts) {
    const sx = (q.x - G.cam.x) * sc + W / 2, sy = (q.y - G.cam.y) * sc + H / 2;
    const m = 34, top = G.mission === 'boss' ? 118 : 84;
    if (sx > m && sx < W - m && sy > top && sy < H - m) continue;
    const cx = clamp(sx, m, W - m), cy = clamp(sy, top, H - m), a = Math.atan2(sy - H / 2, sx - W / 2);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    ctx.fillStyle = q.c; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-6, -8); ctx.lineTo(-2, 0); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

/* ---------- Textos ---------- */
const MISSION_TEXT = {
  eliminate: 'Elimina a todos los guardias y escapa',
  target: 'Elimina a los objetivos marcados y escapa',
  intel: 'Roba la información y escapa',
  boss: 'Derrota al jefe y escapa',
  ghost: 'Llega a la salida SIN ser detectado',
};
const TIPS = {
  1: 'Arrastra el dedo en cualquier parte para moverte. Acércate a un guardia por la espalda para eliminarlo. Cuando no quede ninguno, ve a la SALIDA.',
  2: 'CAMUFLAJE: si te quedas quieto te vuelves casi invisible y los guardias no te ven. Ojo: si te miran, la barra azul se gasta; cuando se acaba, te descubren.',
  3: 'BOMBA DE HUMO: tienes una por misión (botón abajo a la derecha). Si te descubren, úsala: te pierden de vista 3 segundos.',
  4: 'Las cajas bloquean la visión. Úsalas para esconderte.',
};
const MISSION_TIPS = {
  target: 'Los objetivos tienen un círculo dorado. Elimínalos y llega a la SALIDA.',
  intel: 'Roba los maletines de información y escapa por la SALIDA.',
  boss: 'JEFE: tiene varias vidas. Golpéalo cuando no te vea o por la espalda. Después de cada golpe huye con una bomba de humo: ¡búscalo otra vez!',
  ghost: 'MISIÓN FANTASMA: si alguien te detecta, fallas. Paciencia.',
};
const TYPE_TIPS = {
  dog: 'NUEVO: perros. Son rápidos y muerden. Elimínalos antes de que te vean, o justo después de que te muerdan.',
  cam: 'NUEVO: cámaras. No se pueden destruir y llaman a los guardias cercanos.',
  sniper: 'NUEVO: francotiradores. Ven muy lejos en línea recta y hacen 2 de daño.',
  heavy: 'NUEVO: pesados. Blindados de frente: atácalos por la espalda (o usa la Nodachi).',
};
let _first = null;
function firstAppear() {
  if (_first) return _first;
  _first = {};
  for (let L = 1; L <= MAX_LEVEL; L++) {
    const m = missionFor(L); if (!_first['m_' + m]) _first['m_' + m] = L;
    if (_first.dog && _first.cam && _first.sniper && _first.heavy) continue;
    const lv = genLevel(L);
    for (const g of lv.guards) if (!_first[g.type]) _first[g.type] = L;
    if (lv.cams.length && !_first.cam) _first.cam = L;
  }
  return _first;
}
function tipFor(L) {
  const f = firstAppear();
  for (const [k, txt] of Object.entries(TYPE_TIPS)) if (f[k] === L) return txt;
  for (const [k, txt] of Object.entries(MISSION_TIPS)) if (f['m_' + k] === L) return txt;
  return TIPS[L] || '';
}

/* ---------- HUD y pantallas ---------- */
function updateHUD() {
  if (!G) return;
  $('#hud-level').textContent = 'NIVEL ' + G.L;
  $('#hud-zone').textContent = G.zone.name;
  let obj = MISSION_TEXT[G.mission];
  if (G.mission === 'eliminate') obj = objectivesDone() ? '¡Ve a la SALIDA!' : `Elimina a todos · ${G.guards.filter(g => g.dead).length}/${G.guards.length}`;
  if (G.mission === 'target') { const t = G.guards.filter(g => g.target); obj = objectivesDone() ? '¡Ve a la SALIDA!' : `Objetivos · ${t.filter(g => g.dead).length}/${t.length}`; }
  if (G.mission === 'boss') obj = objectivesDone() ? '¡Ve a la SALIDA!' : 'Derrota al JEFE sin que te vea';
  if (G.mission === 'intel') obj = objectivesDone() ? '¡Ve a la SALIDA!' : `Información · ${G.intel.filter(i => i.got).length}/${G.intel.length}`;
  if (G.mission === 'ghost') obj = 'Fantasma: llega a la SALIDA sin ser visto';
  $('#hud-obj').textContent = obj;
  const p = G.player;
  $('#hud-hp').innerHTML = Array.from({ length: p.hpMax }, (_, i) => `<span class="${i < p.hp ? 'on' : ''}">♥</span>`).join('');
  $('#hud-coins').textContent = G.coinsGot * 5 + G.bonus;
  $('#hud-stealth').className = G.detected ? 'tag bad' : 'tag good';
  $('#hud-stealth').textContent = G.detected ? 'DETECTADO' : 'OCULTO';
  $('#smoke-n').textContent = G.smokes; $('#btn-smoke').classList.toggle('off', G.smokes <= 0);
  const bb = $('#hud-boss');
  if (G.boss) {
    bb.classList.remove('hidden');
    $('#hud-boss-name').textContent = G.boss.boss.name;
    $('#hud-boss-fill').style.width = (100 * Math.max(0, G.boss.hp) / G.boss.maxHp) + '%';
    $('#hud-boss-hp').textContent = `${Math.max(0, G.boss.hp)}/${G.boss.maxHp}`;
  } else bb.classList.add('hidden');
}

const screens = ['menu', 'levels', 'shop', 'settings', 'brief', 'result', 'pause', 'install'];
function show(id) { for (const s of screens) $('#' + s).classList.toggle('hidden', s !== id); $('#hud').classList.toggle('hidden', !(id === null || id === 'pause')); }

function prepCanvas(c, w, h) { const d = Math.min(window.devicePixelRatio || 1, 2); c.width = w * d; c.height = h * d; c.style.width = w + 'px'; c.style.height = h + 'px'; const x = c.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); return x; }

function goMenu() {
  running = false; paused = false; G = null; show('menu');
  $('#menu-coins').textContent = save.coins;
  $('#menu-stars').textContent = '★ ' + Object.values(save.stars).reduce((a, b) => a + b, 0);
  const L = Math.min(save.unlocked, MAX_LEVEL);
  $('#btn-continue').innerHTML = save.unlocked > 1 ? `JUGAR <small>NIVEL ${L}${L % 5 === 0 ? ' · JEFE' : ''}</small>` : 'JUGAR';
  const ch = charOf(), w = weaponOf();
  const x = prepCanvas($('#hero'), 200, 190);
  drawPortrait(x, ch, w, 100, 76, 56);
  $('#hero-name').innerHTML = `<b style="color:${ch.band}">${ch.name}</b> · ${ch.role} · ${w.name}<br><span class="clv">NV ${clvOf(ch.id)} <i>${'★'.repeat(clvOf(ch.id))}${'☆'.repeat(MAX_CLV - clvOf(ch.id))}</i></span>`;
  const can = [...CHARS.filter(c => !save.chars.includes(c.id)), ...WEAPONS.filter(w => !save.weapons.includes(w.id))].some(i => i.price <= save.coins) || CHARS.some(c => save.chars.includes(c.id) && clvOf(c.id) < MAX_CLV && clvCost(c) <= save.coins);
  $('#btn-shop').classList.toggle('has', can);
  $('#toast').classList.toggle('hidden', !giftPending);
  updateInstallBtn();
  renderBg();
}

function openBrief(L) {
  startLevel(L); running = false; paused = false;
  show('brief');
  $('#brief-level').textContent = 'NIVEL ' + L;
  $('#brief-zone').textContent = G.zone.name;
  $('#brief-obj').textContent = MISSION_TEXT[G.mission];
  const counts = {};
  G.guards.forEach(g => { if (!g.boss) counts[g.type] = (counts[g.type] || 0) + 1; });
  const names = { guard: 'Guardias', dog: 'Perros', sniper: 'Francotiradores', heavy: 'Pesados' };
  let intel = Object.entries(counts).map(([k, v]) => `${v} ${names[k]}`).join(' · ');
  if (G.cams.length) intel += ` · ${G.cams.length} Cámaras`;
  $('#brief-enemies').textContent = intel;
  const bossBox = $('#brief-boss');
  if (G.boss) {
    const B = G.boss.boss;
    bossBox.classList.remove('hidden');
    const x = prepCanvas($('#brief-boss-c'), 76, 76); drawBossPortrait(x, B, 38, 40, 28);
    $('#brief-boss-name').textContent = B.name;
    $('#brief-boss-title').textContent = B.title;
    $('#brief-boss-hp').innerHTML = '♥'.repeat(B.hp);
  } else bossBox.classList.add('hidden');
  const wr = $('#brief-weapons'); wr.innerHTML = '';
  for (const w of WEAPONS) {
    const own = save.weapons.includes(w.id), eq = save.weapon === w.id, ok = own || save.coins >= w.price;
    const b = document.createElement('button'); b.className = 'chip' + (eq ? ' on' : '') + (ok ? '' : ' no');
    const cvs = document.createElement('canvas'); b.appendChild(cvs);
    const x = prepCanvas(cvs, 54, 30); x.translate(27, 15); x.rotate(-0.35); weaponShape(x, w, 18);
    b.insertAdjacentHTML('beforeend', own ? `<i>${eq ? '✓ EN USO' : w.name.split(' ')[0]}</i>` : `<i class="coins">${w.price}</i>`);
    b.onclick = () => {
      if (eq) return;
      if (!own) { if (save.coins < w.price) return; save.coins -= w.price; save.weapons.push(w.id); SFX.pick(); vibe(20); }
      save.weapon = w.id; persist(); openBrief(L);
    };
    wr.appendChild(b);
  }
  $('#brief-wdesc').textContent = weaponOf().name + ': ' + weaponOf().desc;
  $('#brief-coins').textContent = save.coins;
  const tip = tipFor(L);
  $('#brief-tip').textContent = tip;
  $('#brief-tip').classList.toggle('hidden', !tip);
  $('#brief-stars').innerHTML = starsHTML(save.stars[L] || 0);
  draw();
}
function goFullscreen() {
  if (isStandalone() || !matchMedia('(pointer: coarse)').matches) return;
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
}
function play() { audio(); goFullscreen(); show(null); running = true; paused = false; last = performance.now(); if (G.banner) G.banner.life = 2.6; }
function togglePause() { if (!G || G.over) return; paused = !paused; show(paused ? 'pause' : null); if (!paused) last = performance.now(); }
const starsHTML = n => [0, 1, 2].map(i => `<span class="star ${i < n ? 'on' : ''}">★</span>`).join('');

function showResult() {
  running = false;
  const win = G.win, L = G.L;
  show('result');
  $('#result').classList.toggle('lose', !win);
  if (win) {
    const all = G.coins.every(c => c.got);
    const stars = 1 + (G.detected ? 0 : 1) + (all ? 1 : 0);
    const prev = save.stars[L] || 0;
    let earned = G.coinsGot * 5 + G.bonus + 20 + L * 2 + (G.boss ? 50 + L * 2 : 0);
    earned = Math.round(earned * (1 + G.player.coin));
    if (stars > prev) earned += (stars - prev) * 25;
    save.stars[L] = Math.max(prev, stars);
    save.coins += earned;
    if (L >= save.unlocked && L < MAX_LEVEL) save.unlocked = L + 1;
    persist();
    $('#result-title').textContent = L === MAX_LEVEL ? '¡OPERACIÓN COMPLETA!' : G.boss ? 'JEFE DERROTADO' : 'MISIÓN CUMPLIDA';
    $('#result-stars').innerHTML = starsHTML(stars);
    $('#result-detail').innerHTML = `<div>✓ Misión completada</div><div class="${G.detected ? 'off' : ''}">${G.detected ? '✗' : '✓'} Sin ser detectado</div><div class="${all ? '' : 'off'}">${all ? '✓' : '✗'} Todas las monedas</div>`;
    $('#result-coins').textContent = '+' + earned;
    $('#btn-next').classList.toggle('hidden', L >= MAX_LEVEL);
    const nextUnlock = [...CHARS, ...WEAPONS].filter(i => i.price > 0 && !save.chars.includes(i.id) && !save.weapons.includes(i.id)).sort((a, b) => a.price - b.price)[0];
    $('#result-hint').textContent = nextUnlock && save.coins >= nextUnlock.price ? `¡Ya te alcanza para ${nextUnlock.name} en el Arsenal!` : '';
  } else {
    $('#result-title').textContent = 'MISIÓN FALLIDA';
    $('#result-stars').innerHTML = '';
    $('#result-detail').innerHTML = `<div>${G.failReason || ''}</div>`;
    $('#result-coins').textContent = '';
    $('#result-hint').textContent = 'Consejo: mejora tu personaje o arma en el Arsenal.';
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
      const locked = L > save.unlocked, boss = L % 5 === 0, st = save.stars[L] || 0;
      b.className = 'lv' + (locked ? ' locked' : '') + (boss ? ' boss' : '');
      b.style.setProperty('--acc', boss ? '#ff3b4e' : ZONES[z].accent);
      b.innerHTML = locked ? `<b>🔒</b>${boss ? '<em>JEFE</em>' : ''}` : `<b>${L}</b><i>${'★'.repeat(st)}${'☆'.repeat(3 - st)}</i>${boss ? '<em>JEFE</em>' : ''}`;
      if (!locked) b.onclick = () => openBrief(L);
      grid.appendChild(b);
    }
    wrap.appendChild(grid);
  }
  $('#levels-stars').textContent = `★ ${Object.values(save.stars).reduce((a, b) => a + b, 0)}/300`;
}

let shopTab = 'chars';
function buy(price, fn) { if (save.coins < price) return; save.coins -= price; fn(); persist(); SFX.pick(); vibe(20); renderShop(); }
function renderShop() {
  $('#shop-coins').textContent = save.coins;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === shopTab));
  const box = $('#shop-body'); box.innerHTML = '';
  if (shopTab === 'chars') {
    const grid = document.createElement('div'); grid.className = 'char-grid';
    for (const c of CHARS) {
      const own = save.chars.includes(c.id), eq = save.char === c.id;
      const d = document.createElement('div'); d.className = 'char-card' + (eq ? ' eq' : ''); d.style.setProperty('--acc', c.band);
      const cvs = document.createElement('canvas'); d.appendChild(cvs);
      const x = prepCanvas(cvs, 130, 118); drawPortrait(x, c, weaponOf(), 65, 46, 33);
      d.insertAdjacentHTML('beforeend', `<b>${c.name}</b><small>${c.role}</small><span class="perk">${c.perk}</span>`);
      if (own) { const l = clvOf(c.id); d.insertAdjacentHTML('beforeend', `<span class="clv">NV ${l} <i>${'★'.repeat(l)}${'☆'.repeat(MAX_CLV - l)}</i></span>`); }
      const b = document.createElement('button'); b.className = 'btn small' + (eq ? ' ghost' : '');
      if (eq) { b.textContent = 'EN USO'; b.disabled = true; }
      else if (own) { b.textContent = 'USAR'; b.onclick = () => { save.char = c.id; persist(); renderShop(); }; }
      else { b.innerHTML = `<span class="coins dark">${c.price}</span>`; b.disabled = save.coins < c.price; b.onclick = () => buy(c.price, () => { save.chars.push(c.id); save.char = c.id; }); }
      d.appendChild(b);
      if (own) {
        const l = clvOf(c.id), u = document.createElement('button'); u.className = 'btn small up';
        if (l >= MAX_CLV) { u.textContent = 'NIVEL MÁXIMO'; u.disabled = true; }
        else { const cost = clvCost(c); u.innerHTML = `▲ NV ${l + 1} · <span class="coins dark">${cost}</span><small>${clvNext(l)}</small>`; u.disabled = save.coins < cost; u.onclick = () => buy(cost, () => { save.clv[c.id] = l + 1; }); }
        d.appendChild(u);
      }
      grid.appendChild(d);
    }
    box.appendChild(grid);
  } else if (shopTab === 'weapons') {
    for (const w of WEAPONS) {
      const own = save.weapons.includes(w.id), eq = save.weapon === w.id;
      const d = document.createElement('div'); d.className = 'shop-item' + (eq ? ' eq' : '');
      const cvs = document.createElement('canvas'); cvs.className = 'wicon';
      const x = prepCanvas(cvs, 86, 52); x.translate(43, 26); x.rotate(-0.35); weaponShape(x, w, 30);
      const info = document.createElement('div'); info.className = 'grow'; info.innerHTML = `<b>${w.name}</b><small>${w.desc}</small>`;
      const b = document.createElement('button'); b.className = 'btn small' + (eq ? ' ghost' : '');
      if (eq) { b.textContent = 'EN USO'; b.disabled = true; }
      else if (own) { b.textContent = 'USAR'; b.onclick = () => { save.weapon = w.id; persist(); renderShop(); }; }
      else { b.innerHTML = `<span class="coins dark">${w.price}</span>`; b.disabled = save.coins < w.price; b.onclick = () => buy(w.price, () => { save.weapons.push(w.id); save.weapon = w.id; }); }
      d.appendChild(cvs); d.appendChild(info); d.appendChild(b); box.appendChild(d);
    }
  } else {
    for (const [k, u] of Object.entries(UPGRADES)) {
      const lvl = save.upg[k], max = u.prices.length, price = u.prices[lvl];
      const d = document.createElement('div'); d.className = 'shop-item';
      d.innerHTML = `<div class="grow"><b>${u.name}</b><small>${u.desc}</small><span class="pips">${'■'.repeat(lvl)}${'□'.repeat(max - lvl)}</span></div>`;
      const b = document.createElement('button'); b.className = 'btn small';
      if (lvl >= max) { b.textContent = 'MÁX'; b.disabled = true; }
      else { b.innerHTML = `<span class="coins dark">${price}</span>`; b.disabled = save.coins < price; b.onclick = () => buy(price, () => { save.upg[k]++; }); }
      d.appendChild(b); box.appendChild(d);
    }
  }
}

function renderSettings() {
  $('#set-sound').textContent = save.sound ? 'SONIDO: SÍ' : 'SONIDO: NO';
  $('#set-vib').textContent = save.vib ? 'VIBRACIÓN: SÍ' : 'VIBRACIÓN: NO';
  $('#set-reset').textContent = 'BORRAR PROGRESO'; resetArm = false;
}
let resetArm = false;
function renderBg() { if (!running && !G) { startLevel(1); G.grace = 1e9; G.demo = true; G.banner = null; } }

/* ---------- Instalar como app ---------- */
let deferredPrompt = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; updateInstallBtn(); });
window.addEventListener('appinstalled', () => { deferredPrompt = null; updateInstallBtn(); });
function updateInstallBtn() { $('#btn-install').classList.toggle('hidden', isStandalone()); }
function doInstall() {
  if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.finally(() => { deferredPrompt = null; updateInstallBtn(); }); return; }
  $('#inst-ios').classList.toggle('hidden', !isIOS());
  $('#inst-android').classList.toggle('hidden', isIOS());
  show('install');
}

/* ---------- Bucle ---------- */
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (G) {
    if (running && !paused) { if (G.hitstop > 0) G.hitstop -= dt; else update(dt); }
    else if (G.demo) { G.t += dt; for (const g of G.guards) updateGuard(g, dt); for (const c of G.cams) updateCam(c, dt); }
    draw();
  }
  requestAnimationFrame(loop);
}

function bind() {
  $('#btn-continue').onclick = () => { G = null; openBrief(Math.min(save.unlocked, MAX_LEVEL)); };
  $('#btn-levels').onclick = () => { renderLevels(); show('levels'); };
  $('#btn-shop').onclick = () => { giftPending = false; if (!save.weapons.some(w => w !== 'katana')) shopTab = 'weapons'; renderShop(); show('shop'); };
  $('#toast').onclick = () => $('#btn-shop').onclick();
  $('#hero').onclick = () => { shopTab = 'chars'; renderShop(); show('shop'); };
  $('#btn-settings').onclick = () => { renderSettings(); show('settings'); };
  $('#btn-install').onclick = doInstall;
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => { shopTab = t.dataset.tab; renderShop(); });
  document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => goMenu());
  $('#btn-play').onclick = play;
  $('#btn-brief-back').onclick = () => { G = null; renderLevels(); show('levels'); };
  $('#btn-pause').onclick = togglePause;
  $('#btn-smoke').onclick = useSmoke;
  window.addEventListener('keydown', e => { if (e.key === ' ') useSmoke(); });
  $('#hud-objbox').classList.toggle('min', !!save.objMin);
  $('#hud-objbox').onclick = () => { save.objMin = !save.objMin; persist(); $('#hud-objbox').classList.toggle('min', save.objMin); };
  $('#btn-resume').onclick = togglePause;
  $('#btn-restart').onclick = () => openBrief(G.L);
  $('#btn-quit').onclick = goMenu;
  $('#btn-retry').onclick = () => openBrief(G.L);
  $('#btn-next').onclick = () => openBrief(G.L + 1);
  $('#btn-res-menu').onclick = goMenu;
  $('#btn-res-shop').onclick = () => { G = null; shopTab = 'chars'; renderShop(); show('shop'); };
  $('#set-sound').onclick = () => { save.sound = !save.sound; persist(); renderSettings(); };
  $('#set-vib').onclick = () => { save.vib = !save.vib; persist(); renderSettings(); };
  $('#set-reset').onclick = () => {
    if (!resetArm) { resetArm = true; $('#set-reset').textContent = '¿SEGURO? TOCA OTRA VEZ'; return; }
    save = JSON.parse(JSON.stringify(DEFAULT_SAVE)); save.clv = {}; persist(); renderSettings(); $('#set-reset').textContent = 'PROGRESO BORRADO';
  };
}

loadSave();
if (/[?&]debug\b/.test(location.search)) { save.unlocked = MAX_LEVEL; if (/coins/.test(location.search)) save.coins = 99999; }
bind();
goMenu();
requestAnimationFrame(loop);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

window.__UMBRA = { genLevel, alertGuard, missionFor, get G() { return G; }, startLevel, openBrief, play, update, get save() { return save; }, killGuard, hitBoss, finish, persist, goMenu, renderShop, show, set shopTab(v) { shopTab = v; } };
})();
