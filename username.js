/* Go Coach - sign in, and the player's name at the top right before the envelope.
   Until real accounts exist this device holds ONE account: its name (kept here), with the grade, streak and solved lessons.
   Signing in is only typing the name. It lasts until the page is closed or reloaded: every time the website or app opens you are signed out,
   and then guard.js shows none of the account's details (a clean start, as for a first visit). Signing in reloads the page once. (Boon, 27 Nov 2026) */
(() => {
  'use strict';
  const G = window.GC, R = window.GCguard.raw, signed = window.GCguard.signed;
  const KEY = 'gocoach.user', OLD = 'gocoach.name'; /* OLD: the name box that Settings used to have, offered as the first suggestion */
  /* what belongs to the account and goes with "Clear Account"; saved games in the cloud and the settings stay */
  const OWN = [KEY, OLD, 'gocoach.grade', 'gocoach.today', 'gocoach.streak', 'gocoach.done', 'gocoach.game', 'gocoach.chat', 'gocoach.chatPast'];
  const T = k => window.GoText.T('app.' + k);
  const name = () => (R.get(KEY) || R.get(OLD) || '').trim();
  const put = (k, v) => { if (v) R.set(k, v); else R.remove(k); };

  /* ---------- the header: the name once signed in, "Sign in" before ---------- */
  const head = document.querySelector('header');
  const tag = document.createElement('button');
  tag.type = 'button'; tag.className = 'userName';
  if (head) head.insertBefore(tag, document.getElementById('btnFlag') || document.getElementById('btnSettings'));

  /* ---------- Settings (Name): the name in brackets, tap it to change it; signed out it says "Sign in" ---------- */
  const acct = document.getElementById('acctTag');
  const edit = document.createElement('input');
  edit.type = 'text'; edit.className = 'nameInput nameEdit'; edit.maxLength = 30; edit.autocomplete = 'nickname'; edit.hidden = true;
  const chip = document.createElement('button');
  chip.type = 'button'; chip.className = 'acctName';
  if (acct) acct.append(document.createTextNode(' ('), chip, edit, document.createTextNode(')'));

  const show = () => {
    tag.textContent = signed ? name() : T('sign-in');
    tag.classList.toggle('out', !signed);
    chip.textContent = signed ? name() : T('sign-in');
    document.documentElement.classList.toggle('signedOut', !signed);
  };
  const rename = () => { /* the same account under a new name */
    const v = edit.value.trim();
    edit.hidden = true; chip.hidden = false;
    if (v && v !== name()) { put(KEY, v); put(OLD, ''); }
    show();
  };
  chip.addEventListener('click', () => {
    if (!signed) { const s = document.getElementById('setDlg'); if (s && s.open) s.close(); return open(); }
    edit.value = name(); chip.hidden = true; edit.hidden = false; edit.focus(); edit.select();
  });
  edit.addEventListener('blur', rename);
  edit.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); edit.blur(); } else if (e.key === 'Escape') { edit.value = name(); edit.blur(); } });

  /* ---------- the box that opens from the header ---------- */
  const dlg = document.createElement('dialog');
  dlg.id = 'signDlg';
  const form = document.createElement('form');
  form.method = 'dialog';
  const h = document.createElement('h2');
  const note = document.createElement('p'); note.className = 'small';
  const box = document.createElement('input');
  box.type = 'text'; box.className = 'nameInput'; box.maxLength = 30; box.autocomplete = 'nickname';
  const row = document.createElement('div'); row.className = 'row end';
  const go = document.createElement('button'); go.type = 'submit'; go.value = 'go'; go.className = 'primary';
  const out = document.createElement('button'); out.type = 'submit'; out.value = 'out';
  const cancel = document.createElement('button'); cancel.type = 'submit'; cancel.value = 'close';
  row.append(go, out, cancel);
  form.append(h, note, box, row);
  dlg.append(form);
  document.body.append(dlg);

  function open() {
    h.textContent = signed ? T('signed-in-as') + ' ' + name() : T('sign-in-title');
    note.textContent = T('sign-in-note');
    box.hidden = signed; go.hidden = signed; out.hidden = !signed;
    out.textContent = T('sign-out'); go.textContent = T('sign-in'); cancel.textContent = T('cancel');
    box.placeholder = T('name-hint');
    box.value = name();
    dlg.showModal();
    if (!signed) { box.focus(); box.select(); }
  }
  tag.addEventListener('click', open);
  form.addEventListener('submit', e => {
    const how = e.submitter && e.submitter.value;
    if (how === 'go' && box.value.trim()) {
      put(KEY, box.value.trim()); put(OLD, '');
      window.GCguard.signInNext(); location.reload(); /* reloaded with the account's details in view (guard.js) */
    } else if (how === 'out') location.reload(); /* a page load is signed out */
  });
  box.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go.click(); } });

  /* ---------- Clear Account (Settings): wipes this device's account, then starts again ---------- */
  const clear = document.getElementById('btnClearAcct');
  if (clear) clear.addEventListener('click', () => {
    if (!confirm(T('clear-confirm'))) return;
    for (const k of OWN) R.remove(k);
    location.reload();
  });

  show();
  G.userName = () => (signed ? name() : '');
  G.signedIn = () => signed;
})();
