/* Go Coach — the move tree under the game buttons in the side panel (like the one in SmartGo).
   Every move of your own game is a dot, in order from left to right. When you undo and play something else, the new
   moves branch off below, so earlier tries stay in the record. Tap any dot to go back to the position after that move.
   The tree is kept with the saved game (play.js, Play.tree). It is a record, not help, so it shows in silent Play mode too. */
(() => {
  'use strict';
  const G = window.GC;
  const { $, E } = G;
  const box = $('#moveTree');
  const STEP = 22, ROW = 22, TOP = 14, R = 7;
  const T = (k, v) => window.GoText.T('play.' + k, v); /* wording: docs/text/en/play.md */

  /* Add a game's moves to the tree, following existing branches where the moves are the same. */
  function add(root, moves) {
    let node = root;
    for (const m of moves) {
      let next = node.k.find(x => x.i === m.i);
      if (!next) { next = { i: m.i, c: m.c, k: [] }; node.k.push(next); }
      node = next;
    }
    return root;
  }
  const fresh = moves => add({ k: [] }, moves || []);

  /* Where each dot goes: column = move number; a node's first branch stays on its row, later ones get new rows below. */
  function layout(root) {
    const items = [];
    let rows = 0;
    (function walk(node, depth, row, parent) {
      node.k.forEach((child, j) => {
        const r = j === 0 ? row : ++rows;
        items.push({ node: child, d: depth + 1, r, parent });
        walk(child, depth + 1, r, items.length - 1);
      });
    })(root, 0, 0, -1);
    return { items, rows: rows + 1 };
  }
  const pathOf = (items, k) => { const p = []; for (; k >= 0; k = items[k].parent) p.unshift({ i: items[k].node.i }); return p; };

  let items = [];
  function render() {
    const P = G.Play, s = P && P.s;
    if (!s || !P.tree) { box.hidden = true; return; }
    box.hidden = $('#controls').hidden || !P.tree.k.length; /* nothing to show until the first move is played */
    if (box.hidden) return;
    const L = layout(P.tree), x = d => 10 + d * STEP, y = r => TOP + 8 + r * ROW;
    items = L.items;
    /* the nodes on the current line, so the rest can be drawn fainter */
    const on = new Set();
    let node = P.tree, cur = null;
    for (const m of s.moves) { node = node && node.k.find(c => c.i === m.i); if (!node) break; on.add(node); cur = node; }
    const maxD = items.reduce((a, it) => Math.max(a, it.d), 0);
    const w = x(maxD) + 14, h = y(L.rows - 1) + 12;
    let lines = '', dots = '', nums = '';
    for (let d = 10; d <= maxD; d += 10) nums += `<text x="${x(d)}" y="10" text-anchor="middle">${d}</text>`;
    items.forEach((it, k) => {
      const p = it.parent >= 0 ? items[it.parent] : { d: 0, r: 0 };
      const faint = on.has(it.node) ? '' : ' off';
      lines += `<path class="ln${faint}" d="M${x(p.d)} ${y(p.r)} V${y(it.r)} H${x(it.d)}"/>`;
      const pass = it.node.i < 0, tip = T('tree-move', { num: it.d, point: pass ? T('tree-pass') : E.coord(s.n, it.node.i) });
      dots += `<g data-k="${k}" class="${faint}"><title>${tip}</title><circle class="hit" cx="${x(it.d)}" cy="${y(it.r)}" r="11"/>` +
        `<circle class="${it.node.c === 1 ? 'b' : 'w'}${pass ? ' pass' : ''}${it.node === cur ? ' cur' : ''}" cx="${x(it.d)}" cy="${y(it.r)}" r="${pass ? R - 3 : R}"/></g>`;
    });
    const start = `<g data-k="-1"><title>${T('tree-start')}</title><circle class="hit" cx="${x(0)}" cy="${y(0)}" r="11"/><rect class="start${cur ? '' : ' cur'}" x="${x(0) - 5}" y="${y(0) - 5}" width="10" height="10"/></g>`;
    box.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${nums}${lines}${start}${dots}</svg>`;
    box.classList.toggle('idle', P.phase !== 'play');
    /* keep the current move in view */
    const cx = x(cur ? s.moves.length : 0);
    if (cx < box.scrollLeft + 20 || cx > box.scrollLeft + box.clientWidth - 20) box.scrollLeft = Math.max(0, cx - box.clientWidth / 2);
  }

  box.addEventListener('click', e => {
    const g = e.target.closest('[data-k]');
    if (!g || !G.jumpTo) return;
    const k = +g.getAttribute('data-k');
    G.jumpTo(k < 0 ? [] : pathOf(items, k));
  });
  new MutationObserver(render).observe($('#controls'), { attributes: true, attributeFilter: ['hidden'] });

  G.Tree = { add, fresh, layout };
  G.renderTree = render;
})();
