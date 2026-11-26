/* Go Coach - saving games to the cloud (Boon's request, 25 Nov 2026).
   The Save button keeps the game you are playing in Supabase. The "Saved games" tab of the New game box lists those games
   (named by date and time until you rename them), opens them, renames them and deletes them.
   There is no sign-in yet. Each device holds a private random key (gocoach.owner) that goes with every request, and the table
   (gocoach_saves) can only be reached through five functions that check that key, so saves are private to this device until
   accounts exist; then the key is swapped for the account (the table already has a user_id column for that).
   This is the only file besides telemetry.js that uses the network (CLAUDE.md rule 2). */
(() => {
  'use strict';
  const G = window.GC;
  const { E, $, KEY, store, toast, Play } = G;
  const T = (k, v) => window.GoText.T('save.' + k, v); /* wording: docs/text/en/save.md */
  const URL_ = 'https://dlbstuzzfmjawffzhdys.supabase.co/rest/v1/rpc/';
  const KEY_ = 'sb_publishable_nNgdP3DRemXTabvn1ji6zg_xjf1Qbmo'; /* public key: it can only call the five functions */
  const OWNER = 'gocoach.owner';

  /* ---------- the device's private key ---------- */
  let ownerKey = null;
  function owner() {
    if (ownerKey) return ownerKey;
    try { ownerKey = localStorage.getItem(OWNER); } catch (e) { /* storage unavailable */ }
    if (!ownerKey) {
      const b = crypto.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; /* a version 4 UUID */
      const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
      ownerKey = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
      try { localStorage.setItem(OWNER, ownerKey); } catch (e) { /* kept for this visit only */ }
    }
    return ownerKey;
  }
  async function rpc(fn, args) {
    const r = await fetch(URL_ + fn, { method: 'POST', headers: { apikey: KEY_, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  }
  const stampNow = () => new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

  /* ---------- the Save button ---------- */
  const btnSave = $('#btnSave');
  async function saveNow() {
    if (!Play.s) return toast(T('no-game'));
    btnSave.disabled = true;
    try {
      const info = { size: Play.s.n, moves: Play.s.moves.length };
      /* Saving again overwrites the same saved game (and keeps its name); a game that is not saved yet gets a new one named by date and time. */
      Play.cloudId = await rpc('gocoach_save', { p_owner: owner(), p_id: Play.cloudId || null, p_name: stampNow(), p_info: info, p_game: G.gameRecord() });
      G.saveGame();
      toast(T('saved'));
    } catch (e) { toast(T('save-failed')); }
    btnSave.disabled = false;
  }
  btnSave.onclick = saveNow;

  /* ---------- the two tabs of the New game box ---------- */
  function show(which) {
    const saved = which === 'saved';
    $('#tabNewGame').setAttribute('aria-selected', String(!saved));
    $('#tabSavedGames').setAttribute('aria-selected', String(saved));
    $('#newForm').hidden = saved;
    $('#savedPane').hidden = !saved;
    if (saved) refresh();
  }
  $('#tabNewGame').onclick = () => show('new');
  $('#tabSavedGames').onclick = () => show('saved');
  $('#btnSavedClose').onclick = () => $('#newDlg').close();

  /* ---------- the list ---------- */
  let seq = 0;
  async function refresh() {
    const n = ++seq, list = $('#savedList'), msg = $('#savedMsg');
    list.textContent = ''; msg.textContent = T('loading');
    try {
      const rows = await rpc('gocoach_list', { p_owner: owner() });
      if (n !== seq) return;
      msg.textContent = rows.length ? '' : T('empty');
      for (const r of rows) list.append(row(r));
    } catch (e) { if (n === seq) msg.textContent = T('list-failed'); }
  }
  const span = (cls, text) => Object.assign(document.createElement('span'), { className: cls, textContent: text });
  function act(text, fn) {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'act', textContent: text });
    b.onclick = fn;
    return b;
  }
  function row(r) {
    const el = document.createElement('div');
    el.className = 'saveRow';
    const open = Object.assign(document.createElement('button'), { type: 'button', className: 'nm' });
    open.append(span('link', r.name));
    const i = r.info || {};
    if (i.size) open.append(span('meta', i.moves === 1 ? T('meta-one', { size: i.size }) : T('meta', { size: i.size, moves: i.moves || 0 })));
    open.onclick = () => openGame(r.id);
    el.append(open, act(T('rename'), () => rename(el, r)), act(T('delete'), () => remove(el, r)));
    return el;
  }

  /* Rename in place: type the new name, Enter or tap away to keep it, Escape to cancel. */
  function rename(el, r) {
    const inp = Object.assign(document.createElement('input'), { type: 'text', maxLength: 80, value: r.name });
    inp.setAttribute('aria-label', T('name-aria'));
    el.textContent = ''; el.append(inp); inp.focus(); inp.select();
    let done = false;
    const finish = async keep => {
      if (done) return;
      done = true;
      const v = inp.value.trim();
      if (keep && v && v !== r.name) {
        try { await rpc('gocoach_rename', { p_owner: owner(), p_id: r.id, p_name: v }); r.name = v; }
        catch (e) { $('#savedMsg').textContent = T('action-failed'); }
      }
      el.replaceWith(row(r));
    };
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
    });
    inp.addEventListener('blur', () => finish(true));
  }

  async function remove(el, r) {
    if (!confirm(T('delete-confirm', { name: r.name }))) return;
    try { await rpc('gocoach_delete', { p_owner: owner(), p_id: r.id }); }
    catch (e) { $('#savedMsg').textContent = T('action-failed'); return; }
    if (Play.cloudId === r.id) { Play.cloudId = null; G.saveGame(); } /* the game on the board is no longer a saved one */
    el.remove();
    if (!$('#savedList').children.length) $('#savedMsg').textContent = T('empty');
  }

  /* Open a saved game: it goes into the place where this device keeps the current game, then the app restores it as it does at start-up. */
  async function openGame(id) {
    if (Play.s && Play.phase === 'play' && !Play.over && Play.s.moves.length && !confirm(T('load-confirm'))) return;
    const msg = $('#savedMsg');
    msg.textContent = T('loading');
    let rec = null;
    try { rec = await rpc('gocoach_load', { p_owner: owner(), p_id: id }); if (rec) E.deserialize(rec.s); } catch (e) { rec = null; }
    if (!rec || !rec.s) { msg.textContent = T('load-failed'); return; }
    rec.cloudId = id;
    store(KEY.game, rec);
    $('#newDlg').close();
    if (G.kifu && G.kifu.on) G.exitKifu(true);
    G.newChatSession(); /* a different game is a new session, as with New */
    if (G.restoreGame()) toast(T('opened'));
  }

  G.newTabs = { show };
})();
