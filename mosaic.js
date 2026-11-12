/* PERSONAL OS — Mosaïque libre : déplacez et redimensionnez les tuiles où vous voulez.
   Grille 12 colonnes (≥ 720 px de large) ; en dessous, la mosaïque responsive d'origine reste active.
   Disposition enregistrée dans localStorage 'po-mosaic-v1'. Aucun fichier existant n'est modifié. */
const KEY = 'po-mosaic-v1', COLS = 12, ROW = 88, MIN_W = 2, MIN_H = 1, MIN_PX = 720;
const DEFAULTS = {
  clock: [0, 0, 4, 2], meteo: [4, 0, 4, 4], cam: [8, 0, 4, 4], sophie: [0, 2, 4, 2],
  agenda: [0, 4, 6, 3], news: [6, 4, 6, 3], courses: [0, 7, 4, 3], repas: [4, 7, 4, 3],
  budget: [8, 7, 4, 3], orga: [0, 10, 6, 3], spotify: [6, 10, 6, 3]
};
let editing = false, grid = null, saved = readSaved(), observer = null, pending = 0;

function readSaved() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
function persist() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch {} }
const tileId = tile => [...tile.classList].find(c => /^t-/.test(c))?.slice(2) || null;
const collides = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/* Gravité + résolution des chevauchements (comme une grille de tableau de bord). */
function settle(layout, fixedId) {
  const placed = fixedId && layout[fixedId] ? [layout[fixedId]] : [];
  Object.entries(layout).filter(([id]) => id !== fixedId)
    .sort((a, b) => a[1].y - b[1].y || a[1].x - b[1].x)
    .forEach(([, r]) => {
      while (r.y > 0 && !placed.some(p => collides({ ...r, y: r.y - 1 }, p))) r.y--;
      while (placed.some(p => collides(r, p))) r.y++;
      placed.push(r);
    });
}

function currentLayout(tiles) {
  const layout = {}; let bottom = 0;
  tiles.forEach(([id]) => { const d = DEFAULTS[id]; if (d) bottom = Math.max(bottom, d[1] + d[3]); });
  tiles.forEach(([id]) => {
    const s = saved[id], d = DEFAULTS[id];
    if (s) layout[id] = { ...s };
    else if (d) layout[id] = { x: d[0], y: d[1], w: d[2], h: d[3] };
    else { layout[id] = { x: 0, y: bottom, w: 4, h: 3 }; bottom += 3; }
  });
  settle(layout, null);
  return layout;
}

function paint(layout, tiles) {
  tiles.forEach(([id, el]) => {
    const r = layout[id]; if (!r) return;
    el.style.gridColumn = `${r.x + 1} / span ${r.w}`;
    el.style.gridRow = `${r.y + 1} / span ${r.h}`;
  });
}

function clear(g) {
  g.classList.remove('mz', 'mz-edit');
  [...g.children].forEach(el => { el.style.gridColumn = ''; el.style.gridRow = ''; el.querySelector(':scope > .mz-shield')?.remove(); });
}

function tilesOf(g) { return [...g.children].filter(el => el.classList.contains('tile')).map(el => [tileId(el), el]).filter(([id]) => id); }

function apply() {
  if (!grid) return;
  if (grid.clientWidth < MIN_PX) { clear(grid); grid.dataset.mzOff = '1'; return; }
  delete grid.dataset.mzOff;
  grid.classList.add('mz'); grid.style.setProperty('--mz-row', ROW + 'px');
  const tiles = tilesOf(grid), layout = currentLayout(tiles);
  paint(layout, tiles);
  grid.classList.toggle('mz-edit', editing);
  tiles.forEach(([id, el]) => {
    const has = el.querySelector(':scope > .mz-shield');
    if (editing && !has) {
      const s = document.createElement('div'); s.className = 'mz-shield'; s.dataset.id = id;
      s.innerHTML = `<span class="mz-name">${el.querySelector('.tile-head h2')?.textContent || id}</span><i class="mz-resize" title="Redimensionner"></i>`;
      el.appendChild(s);
    } else if (!editing && has) has.remove();
  });
}

function metrics() {
  const gap = parseFloat(getComputedStyle(grid).columnGap) || 14;
  const colW = (grid.clientWidth - gap * (COLS - 1)) / COLS;
  return { sx: colW + gap, sy: ROW + gap };
}

function startDrag(event) {
  const shield = event.target.closest('.mz-shield'); if (!shield || event.button > 0) return;
  event.preventDefault();
  const id = shield.dataset.id, resizing = event.target.classList.contains('mz-resize');
  const tiles = tilesOf(grid), base = currentLayout(tiles), start = { ...base[id] };
  const { sx, sy } = metrics(), x0 = event.clientX, y0 = event.clientY;
  const el = shield.parentElement; el.classList.add('mz-active');
  shield.setPointerCapture?.(event.pointerId);
  const move = e => {
    const dx = Math.round((e.clientX - x0) / sx), dy = Math.round((e.clientY - y0) / sy);
    const layout = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, { ...v }]));
    const r = layout[id];
    if (resizing) { r.w = Math.max(MIN_W, Math.min(COLS - start.x, start.w + dx)); r.h = Math.max(MIN_H, start.h + dy); }
    else { r.x = Math.max(0, Math.min(COLS - start.w, start.x + dx)); r.y = Math.max(0, start.y + dy); }
    settle(layout, id); paint(layout, tiles); grid._mz = layout;
  };
  const up = () => {
    shield.removeEventListener('pointermove', move); shield.removeEventListener('pointerup', up); shield.removeEventListener('pointercancel', up);
    el.classList.remove('mz-active');
    if (grid._mz) { saved = grid._mz; persist(); grid._mz = null; }
  };
  shield.addEventListener('pointermove', move); shield.addEventListener('pointerup', up); shield.addEventListener('pointercancel', up);
}

function ensureControls() {
  const actions = grid?.closest('.hub')?.querySelector('.hub-head-actions'); if (!actions) return;
  actions.querySelector('.hub-switch')?.setAttribute('hidden', '');          // vue « Classique » retirée : mosaïque uniquement
  let wrap = actions.querySelector('.mz-controls');
  if (!wrap) {
    wrap = document.createElement('div'); wrap.className = 'mz-controls';
    wrap.innerHTML = '<button type="button" class="hub-btn" data-mz="toggle"></button><button type="button" class="hub-btn" data-mz="reset" hidden>Réinitialiser</button>';
    actions.prepend(wrap);
    wrap.addEventListener('click', e => {
      const a = e.target.closest('[data-mz]')?.dataset.mz;
      if (a === 'toggle') api.edit(!editing);
      if (a === 'reset') { saved = {}; persist(); apply(); }
    });
  }
  wrap.querySelector('[data-mz="toggle"]').textContent = editing ? '✓ Terminer' : '✥ Organiser';
  wrap.querySelector('[data-mz="toggle"]').classList.toggle('primary', editing);
  wrap.querySelector('[data-mz="reset"]').hidden = !editing;
}

function mount() {
  const next = document.querySelector('.hub-grid');
  const root = document.getElementById('main-content') || document.body;
  if (!next) { grid = null; observer.disconnect(); observer.observe(root, { childList: true, subtree: true }); return; }
  if (next !== grid) {
    grid = next; grid.addEventListener('pointerdown', startDrag);
    new ResizeObserver(() => apply()).observe(grid);
  }
  observer?.disconnect(); apply(); ensureControls();
  observer.observe(root, { childList: true, subtree: true });
}

const api = {
  edit(on) { editing = Boolean(on); apply(); ensureControls(); },
  reset() { saved = {}; persist(); apply(); }
};
window.PO_MOSAIC = api;

observer = new MutationObserver(() => { cancelAnimationFrame(pending); pending = requestAnimationFrame(mount); });
const boot = () => { mount(); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
export const Mosaic = api;
