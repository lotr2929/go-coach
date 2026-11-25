/* Go Coach — usage log, so Claude can see what happens while Boon plays.
   Listens to the page only (changes no game logic). Sends batches of small events to the
   gocoach_events table in Supabase. That table accepts new rows only; Claude reads it
   through the Supabase connector. Switch it off in Settings (“Share usage log with Claude”). */
(() => {
  'use strict';
  const G = window.GC;
  const { E, $, Play, toast } = G;
  const URL_ = 'https://dlbstuzzfmjawffzhdys.supabase.co/rest/v1/gocoach_events';
  const KEY_ = 'sb_publishable_nNgdP3DRemXTabvn1ji6zg_xjf1Qbmo'; /* public insert-only key */
  const FLAG = 'gocoach.telemetry';

  const isOn = () => { try { return localStorage.getItem(FLAG) !== 'off'; } catch (e) { return true; } };
  const setOn = v => { try { localStorage.setItem(FLAG, v ? 'on' : 'off'); } catch (e) { /* storage unavailable */ } };

  /* A readable session id: month-day hour-minute plus four letters, e.g. 11220140-ab3k */
  const sid = (() => {
    const a = 'abcdefghjkmnpqrstuvwxyz23456789';
    let s = new Date().toISOString().slice(5, 16).replace(/[-:T]/g, '') + '-';
    for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  })();

  /* ---------- sending ---------- */
  let q = [], seq = 0, timer = 0, failed = 0;
  function schedule(ms) { if (!timer) timer = setTimeout(flush, ms); }
  function log(kind, data) {
    if (!isOn()) return;
    q.push({ session: sid, seq: ++seq, kind, data: data || {} });
    if (q.length > 300) q.shift();
    schedule(2000);
  }
  function flush() {
    timer = 0;
    if (!q.length) return;
    if (!isOn()) { q = []; return; }
    if (!navigator.onLine) return schedule(10000);
    const batch = q.splice(0, 40);
    fetch(URL_, {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json', apikey: KEY_, Prefer: 'return=minimal' },
      body: JSON.stringify(batch)
    }).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      failed = 0;
      if (q.length) schedule(300);
    }).catch(() => {
      failed++;
      if (failed < 6) { q = batch.concat(q); schedule(Math.min(60000, 4000 * failed)); }
    });
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  addEventListener('pagehide', flush);

  /* ---------- what is on the board ---------- */
  let lastSig = '';
  const lessonNow = () => { try { return G.lessonInfo ? G.lessonInfo() : null; } catch (e) { return null; } };
  function position() {
    const info = lessonNow();
    const s = info ? (G.Lesson && G.Lesson.s) : (Play && Play.s);
    if (!s) return null;
    return { info, s, sgf: E.toSGF(s, '') };
  }
  function snap(why, force) {
    try {
      const p = position();
      if (!p) return null;
      const sig = p.sgf + '|' + (Play && Play.phase) + '|' + !!p.info;
      if (sig === lastSig && !force) return p;
      lastSig = sig;
      log('state', {
        why, phase: Play && Play.phase, lesson: p.info ? (p.info.id || p.info.title || true) : false,
        turn: p.s.turn, human: Play && Play.human, sgf: p.sgf
      });
      return p;
    } catch (e) { log('error', { where: 'snap', msg: String(e) }); return null; }
  }
  setInterval(() => { if (document.visibilityState === 'visible') snap('auto'); }, 1000);

  /* ---------- what you do ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button');
    if (b) log('click', { id: b.id || null, text: (b.textContent || '').trim().slice(0, 40) });
  }, true);
  document.addEventListener('pointerdown', e => {
    const c = e.target;
    if (c && c.tagName === 'CANVAS') {
      const r = c.getBoundingClientRect();
      log('tap', { canvas: c.id, fx: +((e.clientX - r.left) / r.width).toFixed(3), fy: +((e.clientY - r.top) / r.height).toFixed(3) });
    }
  }, true);

  /* ---------- what the chat says ---------- */
  const chatBox = document.querySelector('#chat .chatLog');
  if (chatBox) {
    /* chatlog.js lists what you typed (.msg.user) and the coach's messages (.msg.coach) one after another. The history (.past) is
       only earlier sessions shown again, so it is not logged twice. */
    const parts = n => (n.matches('.msg') ? [n] : [...n.querySelectorAll('.msg')]);
    new MutationObserver(list => {
      for (const m of list) for (const node of m.addedNodes) {
        if (!node.classList || node.closest('.past') || node.classList.contains('past')) continue;
        for (const n of parts(node)) {
          const who = n.classList.contains('user') ? 'user' : 'coach';
          log('chat', { who, menu: n.classList.contains('menu'), text: (n.textContent || '').trim().slice(0, 700) });
        }
      }
    }).observe(chatBox, { childList: true, subtree: true });
  }

  /* ---------- errors ---------- */
  addEventListener('error', e => log('error', { msg: String(e.message), src: String(e.filename || '').split('/').pop(), line: e.lineno }));
  addEventListener('unhandledrejection', e => log('error', { msg: 'promise: ' + String(e.reason) }));

  /* ---------- the Flag button ---------- */
  const head = document.querySelector('header');
  const settingsBtn = $('#btnSettings');
  if (head && settingsBtn) {
    const f = document.createElement('button');
    f.id = 'btnFlag'; f.className = 'icon'; f.type = 'button';
    f.textContent = '⚑'; f.setAttribute('aria-label', window.GoText.T('app.flag'));
    f.style.marginLeft = 'auto'; f.style.marginRight = '.4rem';
    f.onclick = () => {
      const note = prompt(window.GoText.T('app.flag-ask'), '');
      if (note === null) return;
      const p = snap('flag', true);
      const lines = chatBox ? Array.from(chatBox.querySelectorAll('.now .q, .now .msg')).slice(-8).map(n => (n.classList.contains('q') ? 'You: ' : 'Coach: ') + (n.textContent || '').trim().slice(0, 300)) : [];
      log('flag', { note, sgf: p ? p.sgf : null, chat: lines });
      flush();
      toast(window.GoText.T(isOn() ? 'app.flagged' : 'app.flag-off'));
    };
    head.insertBefore(f, settingsBtn);
  }

  /* ---------- the Settings switch ---------- */
  const sgfBtn = $('#btnSGF');
  if (sgfBtn && sgfBtn.parentElement) {
    const row = sgfBtn.parentElement;
    const lab = document.createElement('label');
    lab.className = 'switch';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.id = 'setLog'; cb.checked = isOn();
    lab.append(cb, ' ' + window.GoText.T('app.share-log'));
    row.parentElement.insertBefore(lab, row);
    cb.addEventListener('change', () => { setOn(cb.checked); if (cb.checked) log('log-on'); });
    settingsBtn.addEventListener('click', () => { cb.checked = isOn(); });
  }

  log('start', {
    w: innerWidth, h: innerHeight, dpr: devicePixelRatio,
    standalone: !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches),
    ua: navigator.userAgent.slice(0, 160), page: location.host
  });
})();
