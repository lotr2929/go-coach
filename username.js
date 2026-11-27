/* Go Coach - sign in, and the player's name at the top right before the envelope.
   Signing in is only typing a name; account.js keeps each name's data apart on this device and wipes a guest's at the next
   open (Boon, 27 Nov 2026). Every time the website or app opens you are signed out and start fresh. Signed out, the grade and
   streak are hidden. */
(() => {
  'use strict';
  const G = window.GC;
  const A = window.GoAccount;
  const T = k => window.GoText.T('app.' + k);
  const name = () => A.name();
  const signed = A.signedIn();

  /* ---------- the header: the name once signed in, "Sign in" before ---------- */
  const head = document.querySelector('header');
  const tag = document.createElement('button');
  tag.type = 'button'; tag.className = 'userName';
  if (head) head.insertBefore(tag, document.getElementById('btnFlag') || document.getElementById('btnSettings'));

  /* ---------- Settings (Name): the name in brackets, tap it to change it ---------- */
  const acct = document.getElementById('acctTag');
  const edit = document.createElement('input');
  edit.type = 'text'; edit.className = 'nameInput nameEdit'; edit.maxLength = 30; edit.autocomplete = 'nickname'; edit.hidden = true;
  const chip = document.createElement('button');
  chip.type = 'button'; chip.className = 'acctName';
  if (acct) acct.append(document.createTextNode(' ('), chip, edit, document.createTextNode(')'));

  const show = () => {
    tag.textContent = signed ? name() : T('sign-in');
    tag.classList.toggle('out', !signed);
    chip.textContent = name() || T('sign-in');
    document.documentElement.classList.toggle('signedOut', !signed);
  };
  const rename = () => { /* the same account under a new name */
    const v = edit.value.trim();
    edit.hidden = true; chip.hidden = false;
    if (v && v !== name() && !A.rename(v)) G.toast(T('name-taken'));
    show();
  };
  chip.addEventListener('click', () => { if (!signed) { const s = document.getElementById('setDlg'); if (s && s.open) s.close(); return open(); } edit.value = name(); chip.hidden = true; edit.hidden = false; edit.focus(); edit.select(); });
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

  const open = () => {
    h.textContent = signed ? T('signed-in-as') + ' ' + name() : T('sign-in-title');
    note.textContent = T('sign-in-note');
    box.hidden = signed; go.hidden = signed; out.hidden = !signed;
    out.textContent = T('sign-out'); go.textContent = T('sign-in'); cancel.textContent = T('cancel');
    box.placeholder = T('name-hint');
    box.value = '';
    dlg.showModal();
    if (!signed) { box.focus(); box.select(); }
  };
  tag.addEventListener('click', open);
  form.addEventListener('submit', e => {
    const how = e.submitter && e.submitter.value;
    if (how === 'go' && box.value.trim()) A.signIn(box.value); /* the page reloads with the account's data */
    else if (how === 'out') A.signOut();
  });
  box.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go.click(); } });

  /* ---------- Clear Account (Settings): removes this account from the device, then starts again ---------- */
  const clear = document.getElementById('btnClearAcct');
  if (clear) clear.addEventListener('click', () => { if (confirm(T('clear-confirm'))) A.clear(); });

  show();
  G.userName = () => name();
  G.signedIn = () => signed;
})();
