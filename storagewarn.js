/* Go Coach - when this device's storage is nearly full or full (Boon, 27 Nov 2026). A browser gives the site about 5 MB,
   shared by every account on the device (account.js measures it). At 80% the coach warns once a visit; at 95% Go Coach
   stops keeping progress (account.js pause) and asks what to do: clear this account's chat history, remove another
   account, or carry on without saving. Checked when the app opens and every two minutes. Local only: no network. */
(() => {
  'use strict';
  const G = window.GC, A = window.GoAccount;
  const T = (k, v) => window.GoText.T('storage.' + k, v); /* wording: docs/text/en/storage.md */
  const NEAR = 0.8, FULL = 0.95;
  const pct = u => Math.round(u * 100) + '%';
  let warned = false;

  const dlg = document.createElement('dialog');
  dlg.id = 'storeDlg';
  const h = document.createElement('h2'), note = document.createElement('p');
  const row = document.createElement('div'); row.className = 'row wrap';
  const btn = (label, run) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', run); return b; };
  const list = document.createElement('div'); list.className = 'nameList small'; list.hidden = true;
  dlg.append(h, note, row, list);
  document.body.append(dlg);

  function clearChat() {
    try { localStorage.removeItem('gocoach.chatPast'); } catch (e) { /* storage unavailable */ }
    location.reload(); /* a signed-in player stays signed in for this visit (account.js) */
  }
  function others() {
    list.textContent = '';
    list.append(Object.assign(document.createElement('p'), { textContent: T('remove-head') }));
    for (const a of A.accounts().filter(x => x.name !== A.name())) {
      list.append(btn(a.names.join(', '), () => { if (confirm(T('remove-confirm', { name: a.name }))) { A.remove(a.acct); location.reload(); } }));
    }
    list.hidden = false;
  }
  function carryOn() { dlg.close(); G.say(T('paused')); }
  function ask(u) {
    h.textContent = T('full-title');
    note.textContent = T('full-note', { pct: pct(u) });
    row.textContent = '';
    row.append(btn(T('clear-chat'), clearChat));
    if (A.accounts().some(x => x.name !== A.name())) row.append(btn(T('remove-acct'), others));
    row.append(btn(T('carry-on'), carryOn));
    list.hidden = true;
    dlg.showModal();
  }
  function check() {
    if (A.paused()) return;
    const u = A.usage();
    if (u >= FULL) { A.pause(); ask(u); }
    else if (u >= NEAR && !warned) { warned = true; G.say(T('near', { pct: pct(u) })); }
  }
  setTimeout(check, 1500); /* after the welcome, so the warning is the newest message */
  setInterval(check, 120000);
})();
