/* Go Coach — shared helpers and settings */
window.GC = {};
(() => {
  'use strict';
  const E = GoEngine, LS = GoLessons;
  const $ = s => document.querySelector(s);
  const LETTERS = 'ABCDEFGHJKLMNOPQRST';
  const KEY = { set: 'gocoach.settings', game: 'gocoach.game', done: 'gocoach.done', chat: 'gocoach.chat' };
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };

  const settings = Object.assign({
    size: 9, colour: 'black', level: 'medium', coachLevel: 'medium', handicap: 0,
    coords: true, libs: false, coach: true, mode: 'play', terr: false, terrSecs: 2,
    confirm: window.matchMedia && matchMedia('(pointer:coarse)').matches, sound: true
  }, load(KEY.set, {}));
  const saveSettings = () => store(KEY.set, settings);

  /* ---------- small helpers ---------- */
  let toastTimer;
  function toast(msg, ms) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms || 2200);
  }
  let actx;
  function click() {
    if (!settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(60, t + .06);
      g.gain.setValueAtTime(.25, t); g.gain.exponentialRampToValueAtTime(.001, t + .09);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + .1);
    } catch (e) { /* no audio */ }
  }
  /* The wording is in docs/text/en/app.md. */
  const T = window.GoText.T;
  const colourName = c => T(c === 1 ? 'app.black' : 'app.white');
  const REASONS = { occupied: T('app.reason.occupied'), ko: T('app.reason.ko'), suicide: T('app.reason.suicide') };

  /* The words of a clickable choice in the coach's messages (the welcome's options, the lessons menu), with a leading number
     or tick kept apart so only the words are underlined. */
  function choiceLabel(b, text) {
    const m = /^(\d+[.)]?|✓)\s+([\s\S]+)$/.exec(text);
    if (m) { b.append(Object.assign(document.createElement('span'), { className: 'n', textContent: m[1] })); text = m[2]; }
    b.append(Object.assign(document.createElement('span'), { className: 'lt', textContent: text }));
  }

  Object.assign(window.GC, { E, LS, $, LETTERS, KEY, load, store, settings, saveSettings, toast, click, colourName, REASONS, choiceLabel });
})();
