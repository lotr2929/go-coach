/* Go Coach - saved games, kept on this device (Boon, 26 Nov 2026; replaces the cloud saves of 25 Nov, kept in _retired/ for when accounts exist).
   The Save button keeps the game you are playing. The "Saved games" tab of the New game box lists those games (named by date and time
   until you rename them), opens, renames, exports and deletes them, and imports a game from an SGF file. Nothing leaves the device.
   A saved game is stored as a game record (board before the first move, then the moves; the shape sgf.js reads and writes) and is
   replayed on the engine when opened, so it stays small and exports as SGF directly. */
(() => {
  'use strict';
  const G = window.GC;
  const { E, $, KEY, load, store, toast, Play, settings } = G;
  const SGF = window.GoSGF;
  const T = (k, v) => window.GoText.T('save.' + k, v); /* wording: docs/text/en/save.md */
  const SAVES = 'gocoach.saves';
  const stampNow = () => new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- the list on this device ---------- */
  const all = () => load(SAVES, []);
  /* Writes the list; false when the device's storage is full (or unavailable). */
  function keep(list) {
    try { localStorage.setItem(SAVES, JSON.stringify(list)); return true; } catch (e) { return false; }
  }

  /* ---------- the Save button ---------- */
  const btnSave = $('#btnSave');
  function saveNow() {
    if (!Play.s) return toast(T('no-game'));
    G.saveGame(); /* brings the move tree up to date */
    const list = all();
    const item = { name: stampNow(), info: { size: Play.s.n, moves: Play.s.moves.length },
      game: { human: Play.human, level: Play.level, over: Play.over, guided: !!Play.guided, both: !!Play.both, tree: Play.tree, g: SGF.fromState(Play.s) } };
    /* Saving again overwrites the same saved game (and keeps its name); a game that is not saved yet gets a new one named by date and time. */
    const at = Play.savedId ? list.findIndex(x => x.id === Play.savedId) : -1;
    if (at >= 0) { item.id = list[at].id; item.name = list[at].name; list[at] = item; }
    else { item.id = newId(); list.unshift(item); }
    if (!keep(list)) return toast(T('save-full'), 4000);
    Play.savedId = item.id;
    G.saveGame();
    toast(T('saved'));
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

  /* ---------- the list on screen ---------- */
  const msg = text => { $('#savedMsg').textContent = text || ''; };
  function refresh(note) {
    const list = all(), box = $('#savedList');
    box.textContent = '';
    for (const r of list) box.append(row(r));
    msg(note || (list.length ? '' : T('empty')));
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
    el.append(open, act(T('rename'), () => rename(el, r)), act(T('export'), () => exportGame(r)), act(T('delete'), () => remove(el, r)));
    return el;
  }
  /* Changes one saved game in the list (by id); false if storage refused it. */
  function update(id, fn) {
    const list = all(), k = list.findIndex(x => x.id === id);
    if (k < 0) return true;
    fn(list, k);
    return keep(list);
  }

  /* Rename in place: type the new name, Enter or tap away to keep it, Escape to cancel. */
  function rename(el, r) {
    const inp = Object.assign(document.createElement('input'), { type: 'text', maxLength: 80, value: r.name });
    inp.setAttribute('aria-label', T('name-aria'));
    el.textContent = ''; el.append(inp); inp.focus(); inp.select();
    let done = false;
    const finish = keepIt => {
      if (done) return;
      done = true;
      const v = inp.value.trim();
      if (keepIt && v && v !== r.name) {
        if (update(r.id, (list, k) => { list[k].name = v; })) r.name = v; else msg(T('save-full'));
      }
      el.replaceWith(row(r));
    };
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
    });
    inp.addEventListener('blur', () => finish(true));
  }

  function remove(el, r) {
    if (!confirm(T('delete-confirm', { name: r.name }))) return;
    update(r.id, (list, k) => { list.splice(k, 1); });
    if (Play.savedId === r.id) { Play.savedId = null; G.saveGame(); } /* the game on the board is no longer a saved one */
    el.remove();
    if (!$('#savedList').children.length) msg(T('empty'));
  }

  /* Open a saved game: it goes into the place where this device keeps the current game, then the app restores it as it does at start-up. */
  function openGame(id) {
    const r = all().find(x => x.id === id);
    if (!r) return refresh();
    if (Play.s && Play.phase === 'play' && !Play.over && Play.s.moves.length && !confirm(T('load-confirm'))) return;
    const { s, ok } = SGF.toState(E, r.game.g);
    const rec = Object.assign({}, r.game, { s: E.serialize(s), savedId: id });
    delete rec.g;
    store(KEY.game, rec);
    $('#newDlg').close();
    if (G.kifu && G.kifu.on) G.exitKifu(true);
    G.newChatSession(); /* a different game is a new session, as with New */
    if (G.restoreGame()) toast(ok ? T('opened') : T('opened-part'));
  }

  /* ---------- export and import (SGF files) ---------- */
  function exportGame(r) {
    const g = r.game.g;
    const file = (r.name.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'go-game') + '.sgf';
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([SGF.toSGF(g)], { type: 'application/x-go-sgf' })), download: file });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    msg(T('exported', { file }));
  }
  const picker = $('#importFile');
  $('#btnImport').onclick = () => { picker.value = ''; picker.click(); };
  picker.onchange = async () => {
    const f = picker.files && picker.files[0];
    if (!f) return;
    let g = null;
    try { g = SGF.parse(await f.text()); } catch (e) { g = null; }
    if (!g || g.n < 5 || g.n > 19) return msg(T('import-failed'));
    const { s, ok } = SGF.toState(E, g);
    g.moves = g.moves.slice(0, s.moves.length); /* keep only the moves the engine accepted */
    const name = f.name.replace(/\.sgf$/i, '').trim() || stampNow();
    const item = { id: newId(), name, info: { size: g.n, moves: g.moves.length },
      game: { human: s.turn, level: settings.level, over: !!g.info.RE, guided: false, both: false, tree: null, g } };
    const list = all();
    list.unshift(item);
    if (!keep(list)) return msg(T('save-full'));
    refresh(ok ? T('imported', { name }) : T('imported-part', { name, moves: g.moves.length }));
  };

  G.newTabs = { show };
})();
