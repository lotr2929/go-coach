/* Go Coach — the player's name (Settings > Your name), shown at the top right before the envelope.
   Kept on this device only until accounts exist. Empty means nothing is shown. */
(() => {
  'use strict';
  const KEY = 'gocoach.name';
  const T = k => window.GoText.T('app.' + k);
  const read = () => { try { return (localStorage.getItem(KEY) || '').trim(); } catch (e) { return ''; } };
  const save = v => { try { localStorage.setItem(KEY, v); } catch (e) { /* storage unavailable */ } };

  /* ---------- the name in the header ---------- */
  const head = document.querySelector('header');
  const tag = document.createElement('span');
  tag.className = 'userName';
  const show = () => { tag.textContent = read(); };
  if (head) head.insertBefore(tag, document.getElementById('btnFlag') || document.getElementById('btnSettings'));

  /* ---------- the box in Settings, under the text size ---------- */
  const heading = document.querySelector('#setDlg h2');
  if (heading) {
    const wrap = document.createElement('div');
    wrap.className = 'opt';
    const lbl = document.createElement('label');
    lbl.className = 'lbl'; lbl.htmlFor = 'setName'; lbl.textContent = T('name-label');
    const box = document.createElement('input');
    box.type = 'text'; box.id = 'setName'; box.className = 'nameInput';
    box.maxLength = 30; box.autocomplete = 'nickname'; box.placeholder = T('name-hint');
    box.value = read();
    box.addEventListener('input', () => { save(box.value.trim()); show(); });
    wrap.append(lbl, box);
    heading.after(wrap);
  }
  show();
  window.GC.userName = read;
})();
