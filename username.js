/* Go Coach - sign in, and the player's name at the top right before the envelope.
   Until accounts exist, signing in means typing your name; it is kept on this device only (Boon, 27 Nov 2026).
   Signed out the board always starts fresh (main.js asks G.signedIn); signed in, the game you left is restored. */
(() => {
  'use strict';
  const KEY = 'gocoach.user';
  const OLD = 'gocoach.name'; /* the name box that Settings used to have: offered as the first suggestion */
  const T = k => window.GoText.T('app.' + k);
  const get = k => { try { return (localStorage.getItem(k) || '').trim(); } catch (e) { return ''; } };
  const put = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } };
  const read = () => get(KEY);

  /* ---------- the header: the name once signed in, "Sign in" before ---------- */
  const head = document.querySelector('header');
  const tag = document.createElement('button');
  tag.type = 'button'; tag.className = 'userName';
  const show = () => { tag.textContent = read() || T('sign-in'); tag.classList.toggle('out', !read()); };
  if (head) head.insertBefore(tag, document.getElementById('btnFlag') || document.getElementById('btnSettings'));

  /* ---------- the box that opens from it ---------- */
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
  cancel.textContent = T('cancel');
  row.append(go, out, cancel);
  form.append(h, note, box, row);
  dlg.append(form);
  document.body.append(dlg);

  const open = () => {
    const name = read();
    h.textContent = T(name ? 'signed-in-as' : 'sign-in-title') + (name ? ' ' + name : '');
    note.textContent = T('sign-in-note');
    box.hidden = !!name; go.hidden = !!name; out.hidden = !name;
    out.textContent = T('sign-out'); go.textContent = T('sign-in');
    box.placeholder = T('name-hint');
    box.value = get(OLD);
    dlg.showModal();
    if (!name) box.focus();
  };
  tag.addEventListener('click', open);
  form.addEventListener('submit', e => {
    const how = e.submitter && e.submitter.value;
    if (how === 'go' && box.value.trim()) { put(KEY, box.value.trim()); put(OLD, ''); }
    else if (how === 'out') put(KEY, '');
    show();
  });
  box.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go.click(); } });
  show();
  window.GC.userName = read;
  window.GC.signedIn = () => !!read();
})();
