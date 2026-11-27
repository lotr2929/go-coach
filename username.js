/* Go Coach - sign in, and the player's name at the top right before the envelope.
   Until real accounts exist this device holds ONE account: its name (kept here), with the grade, streak and solved lessons.
   Signing in is only typing the name, and it lasts until the page is closed or reloaded: every time the website or app opens,
   you are signed out and the board and chat start new (Boon, 27 Nov 2026). Signed out, the grade and streak are hidden. */
(() => {
  'use strict';
  const G = window.GC;
  const KEY = 'gocoach.user';
  const OLD = 'gocoach.name'; /* the name box that Settings used to have: offered as the first suggestion */
  /* what belongs to the account and goes with "Clear Account"; saved games in the cloud and the settings stay */
  const OWN = [KEY, OLD, 'gocoach.grade', 'gocoach.today', 'gocoach.streak', 'gocoach.done'];
  const T = k => window.GoText.T('app.' + k);
  const get = k => { try { return (localStorage.getItem(k) || '').trim(); } catch (e) { return ''; } };
  const put = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } };
  const name = () => get(KEY) || get(OLD);
  let signed = false; /* in memory only: a new page load is always signed out */

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
    if (v && v !== name()) { put(KEY, v); put(OLD, ''); }
    show();
  };
  chip.addEventListener('click', () => { edit.value = name(); chip.hidden = true; edit.hidden = false; edit.focus(); edit.select(); });
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
    box.value = name();
    dlg.showModal();
    if (!signed) { box.focus(); box.select(); }
  };
  tag.addEventListener('click', open);
  form.addEventListener('submit', e => {
    const how = e.submitter && e.submitter.value;
    if (how === 'go' && box.value.trim()) {
      put(KEY, box.value.trim()); put(OLD, ''); signed = true; show();
      if (G.resumeAfterSignIn) G.resumeAfterSignIn(); /* main.js: the game you left comes back */
      if (G.grade && G.grade.paint) G.grade.paint();
    } else if (how === 'out') { signed = false; show(); }
  });
  box.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go.click(); } });

  /* ---------- Clear Account (Settings): wipes this device's account, then starts again ---------- */
  const clear = document.getElementById('btnClearAcct');
  if (clear) clear.addEventListener('click', () => {
    if (!confirm(T('clear-confirm'))) return;
    for (const k of OWN) put(k, '');
    location.reload();
  });

  show();
  G.userName = () => (signed ? name() : '');
  G.signedIn = () => signed;
})();
