/* Go Coach - messages (Boon, 26 Nov 2026): the envelope at the top right.
   A player writes a message (with the board position and the last chat lines if they wish); Claude reads them once a day and
   replies; replies appear here, and the envelope shows how many are waiting to be opened.
   Like cloudsave.js there is no sign-in yet: the device's private key (gocoach.owner) is its address, and the table
   (gocoach_messages) can only be reached through four functions that check it (docs/supabase/gocoach_messages.sql).
   This file is the fourth network exception (CLAUDE.md rule 2). */
(() => {
  'use strict';
  const G = window.GC;
  const { E, $, Play, toast } = G;
  const T = (k, v) => window.GoText.T('messages.' + k, v); /* wording: docs/text/en/messages.md */
  const URL_ = 'https://dlbstuzzfmjawffzhdys.supabase.co/rest/v1/rpc/';
  const KEY_ = 'sb_publishable_nNgdP3DRemXTabvn1ji6zg_xjf1Qbmo'; /* public key: it can only call the four functions */
  const owner = () => G.ownerKey();

  async function rpc(fn, args) {
    const r = await fetch(URL_ + fn, { method: 'POST', headers: { apikey: KEY_, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
    const text = await r.text();
    if (!r.ok) throw new Error(text || 'HTTP ' + r.status);
    return text ? JSON.parse(text) : null;
  }
  const el = (tag, props, kids) => { const n = Object.assign(document.createElement(tag), props || {}); if (kids) n.append(...kids); return n; };

  /* ---------- the envelope, with the number of unread replies ---------- */
  const head = document.querySelector('header');
  const btn = el('button', { id: 'btnFlag', className: 'icon', type: 'button' });
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12"/><path d="M3 6l9 7 9-7"/></svg>';
  const badge = el('span', { className: 'msgBadge' });
  btn.append(badge);
  if (head) head.insertBefore(btn, $('#btnSettings'));
  function setCount(n) {
    badge.textContent = n > 0 ? (n > 9 ? '9+' : String(n)) : '';
    btn.title = n > 0 ? T('button-unread', { count: n }) : T('button');
    btn.setAttribute('aria-label', btn.title);
  }
  setCount(0);
  async function checkUnread() {
    if (!navigator.onLine || document.visibilityState !== 'visible') return;
    try { setCount(await rpc('gocoach_msg_unread', { p_owner: owner() })); } catch (e) { /* try again later */ }
  }

  /* ---------- the Messages box ---------- */
  const list = el('div', { className: 'msgList' });
  const note = el('p', { className: 'small msgNote' });
  const box = el('textarea', { className: 'msgWrite', rows: 3, maxLength: 2000, placeholder: T('write-hint') });
  box.setAttribute('aria-label', T('write-aria'));
  const attach = el('input', { type: 'checkbox', checked: true });
  const sendBtn = el('button', { type: 'button', className: 'primary', textContent: T('send') });
  const closeBtn = el('button', { type: 'button', textContent: T('close') });
  const dlg = el('dialog', { id: 'msgDlg' }, [
    el('h2', { textContent: T('title') }),
    el('p', { className: 'small', textContent: T('intro') }),
    list, note, box,
    el('label', { className: 'switch' }, [attach, el('span', { textContent: T('attach') })]),
    el('div', { className: 'row end' }, [closeBtn, sendBtn])
  ]);
  document.body.append(dlg);
  closeBtn.onclick = () => dlg.close();

  const when = t => new Date(t).toLocaleString(document.documentElement.lang || 'en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  function show(rows) {
    list.textContent = '';
    note.textContent = rows.length ? '' : T('empty');
    for (const r of rows) {
      list.append(el('div', { className: 'msgItem ' + r.sender }, [
        el('div', { className: 'msgWho', textContent: (r.sender === 'coach' ? T('coach') : T('you')) + ' · ' + when(r.created_at) }),
        el('div', { className: 'msgBody', textContent: r.body })
      ]));
    }
    list.scrollTop = list.scrollHeight;
  }
  let seq = 0;
  async function refresh() {
    const n = ++seq;
    note.textContent = T('loading');
    try {
      const rows = await rpc('gocoach_msg_list', { p_owner: owner() });
      if (n !== seq) return;
      show(rows || []);
      if ((rows || []).some(r => r.sender === 'coach' && !r.read_at)) { await rpc('gocoach_msg_seen', { p_owner: owner() }); setCount(0); }
    } catch (e) { if (n === seq) note.textContent = T('list-failed'); }
  }
  btn.onclick = () => { dlg.showModal(); refresh(); };

  /* What goes with a message when "Include the board position" is ticked: the game record and the last few chat lines. */
  function position() {
    try {
      const info = G.lessonInfo ? G.lessonInfo() : null;
      const s = info ? (G.Lesson && G.Lesson.s) : (Play && Play.s);
      return s ? E.toSGF(s, '') : null;
    } catch (e) { return null; }
  }
  function chatLines() {
    return [...document.querySelectorAll('#chat .chatLog .now .msg')].slice(-8)
      .map(n => (n.classList.contains('user') ? 'You: ' : 'Coach: ') + (n.textContent || '').trim().slice(0, 300));
  }
  sendBtn.onclick = async () => {
    const body = box.value.trim();
    if (!body) { box.focus(); return; }
    sendBtn.disabled = true;
    try {
      await rpc('gocoach_msg_send', {
        p_owner: owner(), p_name: G.userName ? G.userName() : '', p_body: body,
        p_sgf: attach.checked ? position() : null, p_chat: attach.checked ? chatLines() : null
      });
      box.value = '';
      toast(T('sent'));
      refresh();
    } catch (e) {
      toast(T(/too many/.test(String(e.message)) ? 'too-many' : 'send-failed'));
    } finally { sendBtn.disabled = false; }
  };

  /* Look for new replies when the app opens or comes back into view, and every ten minutes while it is open. */
  checkUnread();
  document.addEventListener('visibilitychange', checkUnread);
  setInterval(checkUnread, 10 * 60 * 1000);
})();
