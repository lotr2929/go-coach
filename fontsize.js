/* World of Go — Text size setting (Settings > Text size).
   Scales all text by changing the page's root font size through the --fs variable (see style.css).
   The choice is kept on this device only. */
(() => {
  'use strict';
  const KEY = 'gocoach.fontscale';
  const MIN = 0.8, MAX = 1.6, STEP = 0.05;
  const clamp = v => +Math.min(MAX, Math.max(MIN, Math.round(v / STEP) * STEP)).toFixed(2);
  const read = () => {
    try { const v = parseFloat(localStorage.getItem(KEY)); return v > 0 ? clamp(v) : 1; } catch (e) { return 1; }
  };
  const save = v => { try { localStorage.setItem(KEY, String(v)); } catch (e) { /* storage unavailable */ } };
  const apply = v => {
    document.documentElement.style.setProperty('--fs', String(v));
    window.dispatchEvent(new Event('resize')); /* lets the board re-measure its space */
  };

  let scale = read();
  apply(scale);

  /* ---------- the slider, at the top of Settings ---------- */
  const heading = document.querySelector('#setDlg h2');
  if (!heading) return;
  const wrap = document.createElement('div');
  wrap.className = 'opt';
  const lbl = document.createElement('span');
  lbl.className = 'lbl';
  const row = document.createElement('div');
  row.className = 'row';
  row.style.alignItems = 'center';
  row.style.marginTop = '0';
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(MIN); slider.max = String(MAX); slider.step = String(STEP);
  slider.style.flex = '1';
  slider.setAttribute('aria-label', 'Text size');
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Reset';

  const show = () => {
    slider.value = String(scale);
    lbl.textContent = 'Text size: ' + Math.round(scale * 100) + '%';
  };
  const set = v => { scale = clamp(v); save(scale); apply(scale); show(); };

  slider.addEventListener('input', () => set(parseFloat(slider.value)));
  reset.addEventListener('click', () => set(1));
  row.append(slider, reset);
  wrap.append(lbl, row);
  heading.after(wrap);
  show();
})();
