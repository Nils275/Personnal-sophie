/* ═══════════════════════════════════════════════════════════════════════
   ★  VOTRE VOIX ELEVENLABS — CONFIGURATION CÔTÉ SERVEUR  ★
   ═══════════════════════════════════════════════════════════════════════
   ► C'est ICI, et uniquement ici, que va votre CLÉ API ElevenLabs.
     Créez un fichier nommé  .env  à côté de ce fichier, contenant :

         ELEVENLABS_API_KEY=sk_........................
         ELEVENLABS_VOICE_ID=Kuy2kDCiyKmA79V9BbDr

   ► Puis lancez :  node server.js   et ouvrez http://localhost:8080
   ► Dans l'application : Sophie → Réglages rapides →
         Endpoint du proxy : http://localhost:8080/api/tts
   ► La clé ne doit jamais figurer dans un fichier JavaScript du navigateur.
   ═══════════════════════════════════════════════════════════════════════

   PERSONAL OS — Serveur local + proxy vocal ElevenLabs.
   Aucune dépendance npm : `node server.js` suffit. */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

/* ---------- Chargement minimal de .env (sans dépendance) ---------- */
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  });
}

const API_KEY = process.env.ELEVENLABS_API_KEY || '';
const DEFAULT_VOICE = process.env.ELEVENLABS_VOICE_ID || 'Kuy2kDCiyKmA79V9BbDr';
const PORT = Number(process.env.PORT || 8080);
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json', '.md': 'text/plain; charset=utf-8', '.woff2': 'font/woff2'
};

/* ---------- Proxy TTS : seul composant qui connaît la clé ---------- */
function handleTts(req, res) {
  if (!API_KEY) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'ELEVENLABS_API_KEY absente. Ajoutez-la dans .env puis relancez node server.js.' }));
  }
  let raw = '';
  req.on('data', chunk => { raw += chunk; if (raw.length > 20000) req.destroy(); });
  req.on('end', () => {
    let payload;
    try { payload = JSON.parse(raw || '{}'); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Corps JSON invalide.' }));
    }
    const text = String(payload.text || '').slice(0, 4000);
    const voiceId = /^[A-Za-z0-9]+$/.test(payload.voiceId || '') ? payload.voiceId : DEFAULT_VOICE;
    if (!text.trim()) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Texte vide.' })); }

    const body = JSON.stringify({
      text,
      model_id: payload.model || 'eleven_multilingual_v2',
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25 }
    });
    const upstream = https.request({
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
        'Content-Length': Buffer.byteLength(body)
      }
    }, upstreamRes => {
      if (upstreamRes.statusCode !== 200) {
        // Le frontend distingue quota (402/429) et clé invalide (401/403).
        res.writeHead(upstreamRes.statusCode, { 'Content-Type': 'application/json' });
        upstreamRes.pipe(res); return;
      }
      res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' });
      upstreamRes.pipe(res);
    });
    upstream.on('error', error => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Appel ElevenLabs impossible : ${error.message}` }));
    });
    upstream.end(body);
  });
}


/* ---------- Proxy STT ElevenLabs Scribe : clé conservée côté serveur ---------- */
function handleStt(req, res) {
  if (!API_KEY) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'ELEVENLABS_API_KEY absente du fichier .env.' }));
  }
  const contentType = req.headers['content-type'] || '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Envoyez un formulaire multipart/form-data contenant le fichier audio.' }));
  }
  const upstream = https.request({
    hostname: 'api.elevenlabs.io', path: '/v1/speech-to-text', method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': contentType, 'Accept': 'application/json' }
  }, upstreamRes => {
    res.writeHead(upstreamRes.statusCode || 502, {
      'Content-Type': upstreamRes.headers['content-type'] || 'application/json',
      'Cache-Control': 'no-store'
    });
    upstreamRes.pipe(res);
  });
  upstream.on('error', error => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Appel ElevenLabs Scribe impossible : ${error.message}` }));
  });
  req.pipe(upstream);
}


/* ---------- Sécurité : TTS/STT réservés à cette machine ----------
   Dès que des amis se connectent à votre serveur, ils ne doivent pas pouvoir consommer
   votre quota ElevenLabs. Les requêtes venant d'un tunnel (en-têtes x-forwarded-for…) sont refusées. */
function isLocal(req) {
  const a = req.socket.remoteAddress || '';
  const loop = a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
  return loop && !req.headers['x-forwarded-for'] && !req.headers['cf-connecting-ip'] && !req.headers['x-real-ip'];
}

/* ---------- Salons de jeux multijoueurs (Server-Sent Events, sans dépendance) ---------- */
const ROOMS = new Map();
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const httpErr = (status, message) => Object.assign(new Error(message), { status });
function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function readJson(req, limit = 80000) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > limit) { reject(httpErr(413, 'Requête trop volumineuse.')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(httpErr(400, 'Corps JSON invalide.')); } });
    req.on('error', reject);
  });
}
const lanUrls = () => Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => `http://${i.address}:${PORT}`);

function sanitizeGame(g) {
  const type = ['quiz', 'dice', 'vote'].includes(g && g.type) ? g.type : null;
  if (!type) throw httpErr(400, 'Type de jeu inconnu.');
  const name = clean(g.name, 60) || 'Jeu sans titre';
  const cfg = g.config || {};
  if (type === 'quiz') {
    const questions = (Array.isArray(cfg.questions) ? cfg.questions : []).slice(0, 30).map(q => {
      const answers = (Array.isArray(q.answers) ? q.answers : []).map(a => clean(a, 100)).filter(Boolean).slice(0, 4);
      return { q: clean(q.q, 200), answers, correct: clamp(Number(q.correct) || 0, 0, Math.max(0, answers.length - 1)) };
    }).filter(q => q.q && q.answers.length >= 2);
    if (!questions.length) throw httpErr(400, 'Ajoutez au moins une question avec deux réponses.');
    return { name, type, config: { questions, seconds: clamp(Number(cfg.seconds) || 20, 5, 90) } };
  }
  if (type === 'dice') return { name, type, config: { target: clamp(Number(cfg.target) || 60, 10, 500) } };
  const prompts = (Array.isArray(cfg.prompts) ? cfg.prompts : []).map(p => clean(p, 160)).filter(Boolean).slice(0, 30);
  if (!prompts.length) throw httpErr(400, 'Ajoutez au moins une question « Qui est le plus… ? ».');
  return { name, type, config: { prompts } };
}
function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c;
  do { c = Array.from({ length: 5 }, () => A[crypto.randomInt(A.length)]).join(''); } while (ROOMS.has(c));
  return c;
}
function addPlayer(room, name) {
  if (room.players.length >= 12) throw httpErr(409, 'Salon complet (12 joueurs maximum).');
  const base = clean(name, 24) || 'Joueur'; let n = base, i = 2;
  while (room.players.some(p => p.name.toLowerCase() === n.toLowerCase())) n = `${base} ${i++}`;
  const p = { id: crypto.randomBytes(9).toString('hex'), name: n, score: 0 };
  room.players.push(p); return p;
}
const isConnected = (room, id) => (room.clients.get(id)?.size || 0) > 0;

function pub(room) {
  const s = room.state, g = room.game;
  const out = {
    code: room.code, now: Date.now(), name: g.name, type: g.type, hostId: room.hostId, phase: room.phase,
    players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score, connected: isConnected(room, p.id) })),
    count: g.type === 'quiz' ? g.config.questions.length : g.type === 'vote' ? g.config.prompts.length : 0,
    seconds: g.config.seconds || 0, target: g.config.target || 0, view: null
  };
  if (g.type === 'quiz' && (room.phase === 'question' || room.phase === 'reveal')) {
    const q = g.config.questions[s.index];
    out.view = { index: s.index, total: g.config.questions.length, text: q.q, answers: q.answers, deadline: s.deadline, answered: Object.keys(s.answers) };
    if (room.phase === 'reveal') Object.assign(out.view, { correct: q.correct, choices: Object.fromEntries(Object.entries(s.answers).map(([k, v]) => [k, v.choice])), gains: s.gains });
  } else if (g.type === 'dice' && room.phase !== 'lobby') {
    out.view = { order: s.order, turn: s.order[s.turn], last: s.last, log: s.log.slice(-6), target: g.config.target };
  } else if (g.type === 'vote' && (room.phase === 'vote' || room.phase === 'reveal')) {
    out.view = { index: s.index, total: g.config.prompts.length, prompt: g.config.prompts[s.index], voted: Object.keys(s.votes) };
    if (room.phase === 'reveal') Object.assign(out.view, { tally: s.tally, winners: s.winners });
  }
  return out;
}
function broadcast(room) {
  const data = `data: ${JSON.stringify(pub(room))}\n\n`;
  room.clients.forEach(set => set.forEach(res => { try { res.write(data); } catch {} }));
}

/* — Quiz — */
function advanceQuiz(room) {
  const s = room.state; clearTimeout(room.timer);
  s.index++;
  if (s.index >= room.game.config.questions.length) { room.phase = 'results'; return; }
  room.phase = 'question'; s.answers = {}; s.gains = {};
  s.start = Date.now(); s.deadline = s.start + room.game.config.seconds * 1000;
  room.timer = setTimeout(() => { if (revealQuiz(room)) broadcast(room); }, room.game.config.seconds * 1000 + 400);
}
function revealQuiz(room) {
  if (room.phase !== 'question') return false;
  clearTimeout(room.timer);
  const s = room.state, q = room.game.config.questions[s.index], span = room.game.config.seconds * 1000;
  for (const p of room.players) {
    const a = s.answers[p.id];
    if (a && a.choice === q.correct) {
      const pts = Math.round(1000 - 500 * clamp((a.t - s.start) / span, 0, 1));
      p.score += pts; s.gains[p.id] = pts;
    }
  }
  room.phase = 'reveal'; return true;
}
/* — Vote « Qui est le plus… ? » — */
function advanceVote(room) {
  const s = room.state; s.index++;
  if (s.index >= room.game.config.prompts.length) { room.phase = 'results'; return; }
  room.phase = 'vote'; s.votes = {}; s.tally = {}; s.winners = [];
}
function revealVote(room) {
  if (room.phase !== 'vote') return false;
  const s = room.state; s.tally = {};
  Object.values(s.votes).forEach(t => { s.tally[t] = (s.tally[t] || 0) + 1; });
  const max = Math.max(0, ...Object.values(s.tally));
  s.winners = max ? Object.keys(s.tally).filter(id => s.tally[id] === max) : [];
  room.players.forEach(p => { if (s.winners.includes(p.id)) p.score += 1; });
  room.phase = 'reveal'; return true;
}
/* — Course aux dés — */
function nextTurn(room) {
  const s = room.state;
  for (let i = 0; i < s.order.length; i++) { s.turn = (s.turn + 1) % s.order.length; if (isConnected(room, s.order[s.turn])) break; }
}

function startGame(room) {
  clearTimeout(room.timer);
  room.players.forEach(p => { p.score = 0; });
  const t = room.game.type;
  if (t === 'quiz') { room.state = { index: -1, answers: {}, gains: {} }; advanceQuiz(room); }
  else if (t === 'dice') {
    if (room.players.length < 2) throw httpErr(409, 'Il faut au moins 2 joueurs pour la course aux dés.');
    room.state = { order: room.players.map(p => p.id), turn: 0, last: null, log: [], seq: 0 }; room.phase = 'play';
  } else {
    if (room.players.length < 2) throw httpErr(409, 'Il faut au moins 2 joueurs pour voter.');
    room.state = { index: -1, votes: {}, tally: {}, winners: [] }; advanceVote(room);
  }
}

function act(room, pid, b) {
  const p = room.players.find(x => x.id === pid); if (!p) throw httpErr(403, 'Joueur inconnu.');
  const host = pid === room.hostId, s = room.state, type = room.game.type;
  const needHost = () => { if (!host) throw httpErr(403, "Seul l'hôte peut faire cela."); };
  switch (b.type) {
    case 'start': needHost(); if (room.phase !== 'lobby') throw httpErr(409, 'Partie déjà lancée.'); startGame(room); break;
    case 'again': needHost(); clearTimeout(room.timer); room.players.forEach(x => { x.score = 0; }); room.phase = 'lobby'; room.state = {}; break;
    case 'next':
      needHost();
      if (type === 'quiz' && room.phase === 'reveal') advanceQuiz(room);
      else if (type === 'vote' && room.phase === 'reveal') advanceVote(room);
      break;
    case 'reveal': needHost(); if (type === 'quiz') revealQuiz(room); else if (type === 'vote') revealVote(room); break;
    case 'answer': {
      if (type !== 'quiz' || room.phase !== 'question') throw httpErr(409, 'Pas de question en cours.');
      if (s.answers[pid]) break;
      const q = room.game.config.questions[s.index], choice = Number(b.choice);
      if (!Number.isInteger(choice) || choice < 0 || choice >= q.answers.length) throw httpErr(400, 'Réponse invalide.');
      s.answers[pid] = { choice, t: Date.now() };
      const live = room.players.filter(x => isConnected(room, x.id));
      if (live.every(x => s.answers[x.id])) revealQuiz(room);
      break;
    }
    case 'vote': {
      if (type !== 'vote' || room.phase !== 'vote') throw httpErr(409, 'Pas de vote en cours.');
      if (!room.players.some(x => x.id === b.target)) throw httpErr(400, 'Joueur ciblé inconnu.');
      s.votes[pid] = b.target;
      const live = room.players.filter(x => isConnected(room, x.id));
      if (live.every(x => s.votes[x.id])) revealVote(room);
      break;
    }
    case 'roll': {
      if (type !== 'dice' || room.phase !== 'play' || s.order[s.turn] !== pid) throw httpErr(409, "Ce n'est pas ton tour.");
      const d1 = crypto.randomInt(1, 7), d2 = crypto.randomInt(1, 7); let msg, bonus = false;
      if (d1 === 1 && d2 === 1) { p.score = 0; msg = `${p.name} fait double un… retour à zéro !`; }
      else { p.score += d1 + d2; bonus = d1 === d2; msg = `${p.name} lance ${d1} et ${d2} : +${d1 + d2}${bonus ? ' (double, il rejoue !)' : ''}`; }
      s.seq++; s.last = { pid, d1, d2, msg, seq: s.seq }; s.log.push(msg);
      if (p.score >= room.game.config.target) room.phase = 'results'; else if (!bonus) nextTurn(room);
      break;
    }
    default: throw httpErr(400, 'Action inconnue.');
  }
}

async function handleRooms(req, res, url) {
  try {
    const m = url.pathname.match(/^\/api\/rooms(?:\/([A-Za-z0-9]{5}))?(?:\/(join|events|action))?$/);
    if (!m) return json(res, 404, { error: 'Route inconnue.' });
    const codeRaw = m[1], sub = m[2];
    if (!codeRaw) {
      if (req.method === 'GET') return json(res, 200, { lan: lanUrls() });
      if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée.' });
      if (ROOMS.size >= 50) throw httpErr(429, 'Trop de salons actifs.');
      const b = await readJson(req), game = sanitizeGame(b.game);
      const room = { code: newCode(), game, players: [], clients: new Map(), hostId: null, phase: 'lobby', state: {}, timer: null, touched: Date.now() };
      const host = addPlayer(room, b.name); room.hostId = host.id; ROOMS.set(room.code, room);
      return json(res, 200, { code: room.code, pid: host.id, lan: lanUrls() });
    }
    const room = ROOMS.get(codeRaw.toUpperCase());
    if (!room) throw httpErr(404, 'Salon introuvable (code erroné ou expiré).');
    room.touched = Date.now();
    if (!sub && req.method === 'GET') return json(res, 200, { ok: true, name: room.game.name, type: room.game.type, players: room.players.length });
    if (sub === 'join' && req.method === 'POST') {
      const b = await readJson(req, 2000), p = addPlayer(room, b.name);
      if (room.game.type === 'dice' && room.phase === 'play') room.state.order.push(p.id);
      broadcast(room); return json(res, 200, { pid: p.id, name: p.name });
    }
    if (sub === 'events' && req.method === 'GET') {
      const pid = url.searchParams.get('pid');
      if (!room.players.some(p => p.id === pid)) throw httpErr(403, 'Joueur inconnu.');
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write('retry: 2000\n\n');
      if (!room.clients.has(pid)) room.clients.set(pid, new Set());
      room.clients.get(pid).add(res);
      broadcast(room);
      req.on('close', () => {
        const set = room.clients.get(pid); set && set.delete(res);
        if (set && !set.size) room.clients.delete(pid);
        broadcast(room);
      });
      return;
    }
    if (sub === 'action' && req.method === 'POST') {
      const b = await readJson(req, 4000); act(room, String(b.pid || ''), b); room.touched = Date.now();
      broadcast(room); return json(res, 200, { ok: true });
    }
    return json(res, 405, { error: 'Méthode non autorisée.' });
  } catch (e) {
    if (!res.headersSent) json(res, e.status || 400, { error: e.message }); else res.end();
  }
}
setInterval(() => {
  const now = Date.now();
  ROOMS.forEach((room, code) => {
    if (now - room.touched > 6 * 3600 * 1000) { clearTimeout(room.timer); room.clients.forEach(set => set.forEach(r => { try { r.end(); } catch {} })); ROOMS.delete(code); }
    else room.clients.forEach(set => set.forEach(r => { try { r.write(': ping\n\n'); } catch {} }));
  });
}, 20000).unref();

/* ---------- Serveur statique + route API ---------- */
http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname.startsWith('/api/rooms')) return handleRooms(req, res, url);
  if ((url.pathname === '/api/tts' || url.pathname === '/api/stt') && req.method === 'POST') {
    if (!isLocal(req)) return json(res, 403, { error: 'Réservé à la machine qui héberge PERSONAL OS.' });
    return url.pathname === '/api/tts' ? handleTts(req, res) : handleStt(req, res);
  }
  if (url.pathname === '/api/stt/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ configured: Boolean(API_KEY), provider: 'ElevenLabs Scribe', model: 'scribe_v2' }));
  }
  if (url.pathname === '/api/tts/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ configured: Boolean(API_KEY), voiceId: DEFAULT_VOICE }));
  }

  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(ROOT, requested));
  const rel = path.relative(ROOT, filePath);
  // Jamais de fichiers cachés (.env et sa clé API !), ni de code serveur, ni de sortie du dossier.
  if (rel.startsWith('..') || path.isAbsolute(rel) || rel.split(path.sep).some(seg => seg.startsWith('.')) || rel === 'server.js') {
    res.writeHead(403); return res.end('Accès refusé');
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      // Navigation SPA : toute route inconnue renvoie l'application.
      return fs.readFile(path.join(ROOT, 'index.html'), (fallbackError, fallback) => {
        if (fallbackError) { res.writeHead(404); return res.end('Introuvable'); }
        res.writeHead(200, { 'Content-Type': MIME['.html'] }); res.end(fallback);
      });
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`PERSONAL OS : http://localhost:${PORT}`);
  const lan = lanUrls(); if (lan.length) console.log(`Amis sur le même Wi-Fi : ${lan.join('  ou  ')}  (jeux entre amis)`);
  console.log(API_KEY
    ? `Proxy ElevenLabs actif : POST /api/tts (voix ${DEFAULT_VOICE}) et POST /api/stt (Scribe).`
    : 'ATTENTION : ELEVENLABS_API_KEY absente. La voix native sera utilisée en secours.');
});
