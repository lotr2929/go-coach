/* World of Go — the page viewer: shows an article (such as the history of Go) in the board window.
   A page is { title, blocks }. A block is { t: 'lead' | 'p' | 'h', text } or { t: 'refs', items: [{ n, title, by, url }] }.
   A number in square brackets in the text, such as [3], becomes a link that jumps to reference 3.
   The board is only hidden while a page is open; closing the page draws whatever was on the board before. */
(() => {
  'use strict';
  const G = window.GC;
  const { $ } = G;
  const wrap = document.querySelector('.boardWrap');
  const panel = document.querySelector('aside.panel');
  const root = document.createElement('article');
  root.className = 'pageView';
  root.setAttribute('aria-label', 'Reading page');
  wrap.append(root);
  let open = false;

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  function jump(n) {
    const t = root.querySelector('#ref-' + n);
    if (!t) return;
    t.scrollIntoView({ block: 'center', behavior: 'smooth' });
    t.classList.add('flash');
    setTimeout(() => t.classList.remove('flash'), 1800);
  }
  /* Text with [n] markers: each marker becomes a link to reference n. */
  function fill(parent, text) {
    String(text).split(/(\[\d+\])/).forEach(part => {
      const m = /^\[(\d+)\]$/.exec(part);
      if (!m) { if (part) parent.append(document.createTextNode(part)); return; }
      const a = el('a', 'cite', part);
      a.href = '#ref-' + m[1];
      a.addEventListener('click', e => { e.preventDefault(); jump(m[1]); });
      parent.append(a);
    });
  }
  function host(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }
  function refs(items) {
    const ol = el('ol', 'refs');
    for (const r of items) {
      const li = el('li');
      li.id = 'ref-' + r.n; li.value = r.n;
      if (/^https:\/\//.test(r.url)) {
        const a = el('a', null, r.title);
        a.href = r.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        li.append(a);
      } else li.append(document.createTextNode(r.title));
      li.append(document.createTextNode(r.by ? ', ' + r.by + '. ' : '. '));
      if (/^https:\/\//.test(r.url)) li.append(el('span', 'host', host(r.url)));
      ol.append(li);
    }
    return ol;
  }
  const BLOCKS = {
    lead: b => { const p = el('p', 'lead'); fill(p, b.text); return p; },
    h: b => { const h = el('h2', null, b.text); if (b.id) h.id = b.id; return h; },
    h3: b => el('h3', null, b.text),
    p: b => { const p = el('p'); fill(p, b.text); return p; },
    ul: b => { const ul = el('ul'); for (const item of b.items) { const li = el('li'); fill(li, item); ul.append(li); } return ul; },
    refs: b => refs(b.items),
    /* A jump list: each item scrolls the page to the heading with that id. */
    toc: b => {
      const nav = el('nav', 'toc');
      for (const it of b.items) {
        const a = el('a', null, it.text);
        a.href = '#' + it.id;
        a.addEventListener('click', e => { e.preventDefault(); const target = root.querySelector('#' + it.id); if (target) target.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
        nav.append(a);
      }
      return nav;
    },
    /* A card per item (title, a line of details, a note). The block's onPick function is called with the item that was tapped. */
    cards: b => {
      const box = el('div', 'cards');
      for (const it of b.items) {
        const c = el('button', 'card');
        c.type = 'button';
        c.append(el('span', 'cardTitle', it.title), el('span', 'cardMeta', it.meta), el('span', 'cardNote', it.note));
        c.addEventListener('click', () => { if (b.onPick) b.onPick(it); });
        box.append(c);
      }
      return box;
    }
  };

  function showPage(page) {
    root.textContent = '';
    const head = el('div', 'pageHead');
    const close = el('button', 'pageClose primary', '← Back to the board');
    close.type = 'button';
    close.addEventListener('click', closePage);
    head.append(close);
    const body = el('div', 'pageBody');
    body.append(el('h1', null, page.title));
    for (const b of page.blocks) { const f = BLOCKS[b.t]; if (f) body.append(f(b)); }
    root.append(head, body);
    wrap.classList.add('paged');
    open = true;
    root.scrollTop = 0;
    $('#whoTurn').textContent = page.title;
  }
  function closePage() {
    if (!open) return;
    open = false;
    wrap.classList.remove('paged');
    G.playView.resize();
    G.renderPlay();
  }

  /* Any button in the side panel (except the chat's own Send and Clear) is about the board, so the page gives way to it. */
  panel.addEventListener('click', e => {
    if (open && e.target.closest('button') && !e.target.closest('.chatForm')) closePage();
  }, true);
  document.addEventListener('keydown', e => { if (open && e.key === 'Escape') closePage(); });

  Object.assign(G, { showPage, closePage, pageOpen: () => open });
})();
