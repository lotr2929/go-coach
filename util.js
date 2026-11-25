/* Go Coach — shared helpers and settings */
window.GC = {};
(() => {
  'use strict';
  const E = GoEngine, LS = GoLessons;
  const $ = s => document.querySelector(s);
  const LETTERS = 'ABCDEFGHJKLMNOPQRST';
  const KEY = { set: 'gocoach.settings', game: 'gocoach.game', done: 'gocoach.done', chat: 'gocoach.chat', past: 'gocoach.chatPast' };
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

  /* The stone counts at the top of the board, "○ 3  ● 4", each with a drawn stone as tall as the letters. `mine` (1 Black,
     2 White) is the colour you are playing, underlined; 0 underlines neither (Play both sides). Boon, 25 Nov 2026. */
  function stoneCounts(el, nb, nw, mine) {
    el.textContent = '';
    for (const [c, n] of [[2, nw], [1, nb]]) {
      const s = document.createElement('span');
      s.className = 'cnt' + (c === mine ? ' mine' : '');
      s.setAttribute('role', 'img'); s.setAttribute('aria-label', T('app.count-' + (c === 1 ? 'black' : 'white'), { count: n }));
      s.append(Object.assign(document.createElement('i'), { className: 'stone ' + (c === 1 ? 'b' : 'w') }), document.createTextNode(String(n)));
      el.append(s);
    }
  }
  /* Text with ● and ○ in it (such as the prisoners line), shown with the same drawn stones as the counts. */
  function stoneText(el, text) {
    el.textContent = '';
    for (const part of String(text).split(/([●○])/)) {
      if (part === '●' || part === '○') el.append(Object.assign(document.createElement('i'), { className: 'stone ' + (part === '●' ? 'b' : 'w') }));
      else if (part) el.append(document.createTextNode(part));
    }
  }
  /* The words of a clickable choice in the coach's messages (the welcome's options, the lessons menu), with a leading number
     or tick kept apart so only the words are underlined. */
  const CHOICE_RE = /^(\d+[.)]?|✓)\s+([\s\S]+)$/;
  const choiceWords = text => { const m = CHOICE_RE.exec(text); return m ? m[2] : text; };
  function choiceLabel(b, text) {
    const m = CHOICE_RE.exec(text);
    if (m) { b.append(Object.assign(document.createElement('span'), { className: 'n', textContent: m[1] })); text = m[2]; }
    b.append(Object.assign(document.createElement('span'), { className: 'lt', textContent: text }));
  }

  Object.assign(window.GC, { E, LS, $, LETTERS, KEY, load, store, settings, saveSettings, toast, click, colourName, REASONS, choiceLabel, choiceWords, stoneCounts, stoneText });
})();
