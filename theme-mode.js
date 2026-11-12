/* PERSONAL OS — Mode clair / sombre (script classique, chargé dans <head> pour éviter tout flash).
   Préférence : localStorage 'po-mode' = 'light' | 'dark' | (absent = suit le système). */
(function () {
  var KEY = 'po-mode';
  function read() { try { return localStorage.getItem(KEY) || 'auto'; } catch (e) { return 'auto'; } }
  function effective(pref) {
    if (pref === 'light' || pref === 'dark') return pref;
    return window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  function apply(pref) {
    var mode = effective(pref), root = document.documentElement;
    root.dataset.mode = mode; root.dataset.modePref = pref;
    var theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.setAttribute('content', mode === 'light' ? '#F3F6FA' : '#080D12');
    var scheme = document.querySelector('meta[name="color-scheme"]');
    if (scheme) scheme.setAttribute('content', mode);
    var btn = document.getElementById('po-mode-btn');
    if (btn) {
      btn.textContent = mode === 'light' ? '☾' : '☀';
      btn.title = mode === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair';
      btn.setAttribute('aria-label', btn.title);
    }
    try { window.dispatchEvent(new CustomEvent('po:mode', { detail: { mode: mode } })); } catch (e) {}
  }
  function set(mode) {
    try { if (mode === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, mode); } catch (e) {}
    apply(mode);
  }
  window.PO_MODE = {
    get: function () { return document.documentElement.dataset.mode; },
    set: set,
    toggle: function () { set(document.documentElement.dataset.mode === 'light' ? 'dark' : 'light'); }
  };
  apply(read());
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: light)');
    var onChange = function () { if (read() === 'auto') apply('auto'); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }
  function fab() {
    var box = document.getElementById('po-fab');
    if (!box) { box = document.createElement('div'); box.id = 'po-fab'; box.className = 'po-fab'; document.body.appendChild(box); }
    return box;
  }
  function mount() {
    if (document.getElementById('po-mode-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'po-mode-btn'; btn.type = 'button'; btn.className = 'po-fab-btn';
    btn.addEventListener('click', function () { window.PO_MODE.toggle(); });
    fab().appendChild(btn);
    apply(read());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
