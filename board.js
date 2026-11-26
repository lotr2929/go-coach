/* Go Coach — board drawing and tapping */
(() => {
  'use strict';
  const { E, LETTERS } = window.GC;

  /* ---------- board view ---------- */
  class BoardView {
    constructor(canvas, onTap) {
      this.cv = canvas; this.ctx = canvas.getContext('2d'); this.onTap = onTap;
      this.n = 9; this.board = new Int8Array(81);
      this.coords = true; this.libs = false;
      this.last = -1; this.ko = -1; this.own = null; this.marks = {}; this.hint = []; this.terr = null; this.dead = null;
      this.ghost = -1; this.ghostColor = 1; this.hover = -1; this.hoverColor = 0; this.shapes = null; this.markColor = 0;
      this.shapeHover = 0; this.badges = []; /* the shape whose number the mouse is over, and where the numbers are drawn */
      this.W = 0; this.dpr = 1; this.cell = 1; this.pad = 1;
      canvas.addEventListener('click', e => {
        /* A tap on a shape's number shows (or hides) that shape's explanation instead of playing a move: for phones, which have no hover. */
        const label = this.badgeAt(e);
        if (label) { this.shapeHover = this.shapeHover === label ? 0 : label; this.draw(); if (this.onShapeHover) this.onShapeHover(this.shapeHover, e.clientX, e.clientY); return; }
        const i = this.pointAt(e); if (i >= 0 && this.onTap) this.onTap(i);
      });
      canvas.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse' || !(this.hoverColor || this.own || this.shapes)) return;
        const i = this.pointAt(e), label = this.badgeAt(e);
        /* Over a shape's number: that shape is drawn strongly and its explanation pops up (shapesui.js). */
        if (label !== this.shapeHover) {
          this.shapeHover = label; this.draw();
          if (this.onShapeHover) this.onShapeHover(label, e.clientX, e.clientY);
          if (!label && this.onHover) this.onHover(i, e.clientX, e.clientY); /* back to the note about the point */
        }
        if (label) { if (this.hover >= 0) { this.hover = -1; this.draw(); } return; } /* no ghost stone under a number */
        if (i !== this.hover && (this.hoverColor || this.own)) { this.hover = i; this.draw(); if (this.onHover) this.onHover(i, e.clientX, e.clientY); }
      });
      canvas.addEventListener('pointerleave', () => {
        if (this.hover >= 0 || this.shapeHover) { this.hover = -1; this.shapeHover = 0; this.draw(); }
        if (this.onShapeHover) this.onShapeHover(0);
        if (this.onHover) this.onHover(-1);
      });
      if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
      window.addEventListener('resize', () => this.resize());
    }
    set(props) { Object.assign(this, props); this.draw(); }
    resize() {
      const w = this.cv.parentElement.clientWidth;
      if (!w) return;
      this.dpr = Math.min(window.devicePixelRatio || 1, 3);
      this.W = w;
      this.cv.width = Math.round(w * this.dpr); this.cv.height = Math.round(w * this.dpr);
      this.draw();
    }
    /* The number of the shape whose numbered circle is under the mouse, or 0. */
    badgeAt(e) {
      const r = this.cv.getBoundingClientRect();
      if (!r.width || !this.shapes) return 0;
      const k = this.W / r.width, x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k;
      for (let j = this.badges.length - 1; j >= 0; j--) { const b = this.badges[j]; if (Math.hypot(x - b.x, y - b.y) <= b.r * 1.15) return b.label; }
      return 0;
    }
    pointAt(e) {
      const r = this.cv.getBoundingClientRect();
      if (!r.width || !this.cell) return -1;
      const k = this.W / r.width;
      const gx = Math.round((e.clientX - r.left) * k / this.cell - this.pad);
      const gy = Math.round((e.clientY - r.top) * k / this.cell - this.pad);
      if (gx < 0 || gy < 0 || gx >= this.n || gy >= this.n) return -1;
      return gy * this.n + gx;
    }
    /* Where point i sits on the screen, so a note can be placed beside it. */
    clientPos(i) {
      const r = this.cv.getBoundingClientRect(), k = r.width / (this.W || 1);
      return { x: r.left + (this.pad + (i % this.n)) * this.cell * k, y: r.top + (this.pad + ((i / this.n) | 0)) * this.cell * k };
    }
    stone(x, y, color, alpha, faded) {
      const ctx = this.ctx, r = this.cell * 0.47;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.arc(x + r * .07, y + r * .1, r, 0, 7); ctx.fill();
      const g = ctx.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
      if (color === 1) { g.addColorStop(0, '#5b5f61'); g.addColorStop(1, '#0d1011'); }
      else { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d6d2c6'); }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      if (faded) {
        ctx.strokeStyle = color === 1 ? '#fff' : '#000'; ctx.lineWidth = 2; ctx.globalAlpha = .8;
        const d = r * .4;
        ctx.beginPath(); ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d); ctx.moveTo(x + d, y - d); ctx.lineTo(x - d, y + d); ctx.stroke();
      }
      ctx.restore();
    }
    /* Each shape: { pts, rgb, dashed, label, move }. A rounded box around its points, filled lightly (top = false) or
       outlined and numbered (top = true). A shape that could be made is dashed, with a dashed ring on the move that makes it. */
    /* Shapes are drawn light, with a border clear of the stones (stones have radius .47 of a cell), so overlapping shapes stay
       readable. The shape whose number the mouse is over is drawn strongly, on top, and the others fade further. */
    drawShapes(px, cell, top) {
      const ctx = this.ctx, n = this.n, hov = this.shapeHover;
      if (top) this.badges = [];
      const order = this.shapes.map((sh, k) => [sh, k]).sort((a, b) => (a[0].label === hov) - (b[0].label === hov));
      for (const [sh, k] of order) {
        const on = !!hov && sh.label === hov, dim = !!hov && !on;
        const xs = sh.pts.map(p => p % n), ys = sh.pts.map(p => (p / n) | 0), m = cell * (.62 - (k % 3) * .05);
        const x0 = px(Math.min(...xs)) - m, y0 = px(Math.min(...ys)) - m, w = px(Math.max(...xs)) + m - x0, h = px(Math.max(...ys)) + m - y0;
        ctx.save();
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y0, w, h, cell * .3) : ctx.rect(x0, y0, w, h);
        if (!top) { ctx.fillStyle = `rgba(${sh.rgb},${on ? .3 : dim ? .03 : sh.dashed ? .05 : .09})`; ctx.fill(); ctx.restore(); continue; }
        ctx.strokeStyle = `rgba(${sh.rgb},${on ? .95 : dim ? .12 : .4})`; ctx.lineWidth = on ? Math.max(2.5, cell * .07) : Math.max(1.5, cell * .035);
        if (sh.dashed) ctx.setLineDash([cell * .16, cell * .12]);
        ctx.stroke();
        if (sh.move >= 0) { ctx.beginPath(); ctx.arc(px(sh.move % n), px((sh.move / n) | 0), cell * .3, 0, 7); ctx.stroke(); }
        ctx.setLineDash([]);
        const r = cell * .2, bx = x0 + r * .6, by = y0 + r * .6;
        ctx.globalAlpha = dim ? .35 : 1;
        ctx.fillStyle = `rgb(${sh.rgb})`; ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(cell * .26) + 'px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(sh.label), bx, by + 1);
        ctx.restore();
        this.badges.push({ x: bx, y: by, r, label: sh.label });
      }
    }
    draw() {
      const W = this.W;
      if (!W || !this.ctx) return;
      const ctx = this.ctx, n = this.n, dpr = this.dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, W);
      const pad = this.coords ? 1.0 : 0.7, cell = W / (n - 1 + 2 * pad);
      this.cell = cell; this.pad = pad;
      const px = v => (pad + v) * cell;
      // wood
      const bg = ctx.createLinearGradient(0, 0, W, W);
      bg.addColorStop(0, '#edcd92'); bg.addColorStop(1, '#dfb470'); /* a lighter, cleaner wood (redesign, 25 Nov 2026) */
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, W);
      ctx.save(); ctx.globalAlpha = .05; ctx.strokeStyle = '#5a3a10'; ctx.lineWidth = 1;
      for (let k = 0; k < 26; k++) {
        const y = (k + .5) * W / 26;
        ctx.beginPath(); ctx.moveTo(0, y);
        ctx.bezierCurveTo(W * .3, y + W * .01 * Math.sin(k), W * .6, y - W * .012 * Math.cos(k * 1.7), W, y + W * .006 * Math.sin(k * 2.3));
        ctx.stroke();
      }
      ctx.restore();
      // grid
      ctx.strokeStyle = '#33220c'; ctx.lineWidth = Math.max(1, cell * .035);
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        ctx.moveTo(px(0), px(i)); ctx.lineTo(px(n - 1), px(i));
        ctx.moveTo(px(i), px(0)); ctx.lineTo(px(i), px(n - 1));
      }
      ctx.stroke();
      ctx.fillStyle = '#33220c';
      for (const [x, y] of E.stars(n)) { ctx.beginPath(); ctx.arc(px(x), px(y), cell * .09, 0, 7); ctx.fill(); }
      if (this.coords) {
        ctx.fillStyle = 'rgba(51,34,12,.75)';
        ctx.font = Math.round(cell * .36) + 'px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const o = (pad - 0.55) * cell;
        for (let i = 0; i < n; i++) {
          ctx.fillText(LETTERS[i], px(i), o); ctx.fillText(LETTERS[i], px(i), W - o);
          ctx.fillText(String(n - i), o, px(i)); ctx.fillText(String(n - i), W - o, px(i));
        }
      }
      // territory
      if (this.terr) {
        for (let i = 0; i < n * n; i++) {
          const t = this.terr[i];
          if (!t || this.board[i] && !(this.dead && this.dead.has(i))) continue;
          const x = px(i % n), y = px((i / n) | 0), h = cell * .16;
          ctx.fillStyle = t === 1 ? '#111' : '#fff'; ctx.strokeStyle = t === 1 ? '#fff' : '#111'; ctx.lineWidth = 1;
          ctx.fillRect(x - h, y - h, h * 2, h * 2); ctx.strokeRect(x - h, y - h, h * 2, h * 2);
        }
      }
      // ownership estimate
      if (this.own) {
        for (let i = 0; i < n * n; i++) {
          const o = this.own[i];
          if (this.board[i] || Math.abs(o) < .15) continue;
          const x = px(i % n), y = px((i / n) | 0), h = cell * (.1 + .14 * Math.abs(o));
          ctx.globalAlpha = Math.min(.8, .25 + Math.abs(o) * .6);
          ctx.fillStyle = o > 0 ? '#111' : '#fff'; ctx.strokeStyle = o > 0 ? '#fff' : '#111'; ctx.lineWidth = 1;
          ctx.fillRect(x - h, y - h, h * 2, h * 2); ctx.strokeRect(x - h, y - h, h * 2, h * 2);
          ctx.globalAlpha = 1;
        }
      }
      // liberties
      if (this.libs) {
        for (const gr of E.allGroups(n, this.board)) {
          const atari = gr.libs.length === 1;
          ctx.fillStyle = atari ? 'rgba(214,60,40,.95)' : 'rgba(30,150,80,.85)';
          for (const l of gr.libs) { ctx.beginPath(); ctx.arc(px(l % n), px((l / n) | 0), cell * (atari ? .14 : .1), 0, 7); ctx.fill(); }
        }
      }
      // shapes (shapesui.js): a light colour behind the stones; borders and numbers go on top of them
      if (this.shapes) this.drawShapes(px, cell, false);
      // stones
      for (let i = 0; i < n * n; i++) {
        const c = this.board[i];
        if (c) this.stone(px(i % n), px((i / n) | 0), c, this.dead && this.dead.has(i) ? .55 : 1, this.dead && this.dead.has(i));
      }
      // last move & ko
      if (this.last >= 0 && this.board[this.last]) {
        ctx.strokeStyle = this.board[this.last] === 1 ? '#fff' : '#111'; ctx.lineWidth = Math.max(2, cell * .07);
        ctx.beginPath(); ctx.arc(px(this.last % n), px((this.last / n) | 0), cell * .2, 0, 7); ctx.stroke();
      }
      if (this.ko >= 0) {
        const x = px(this.ko % n), y = px((this.ko / n) | 0), h = cell * .17;
        ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 2; ctx.strokeRect(x - h, y - h, h * 2, h * 2);
      }
      if (this.shapes) this.drawShapes(px, cell, true);
      // marks
      for (const k of Object.keys(this.marks)) {
        const i = +k, x = px(i % n), y = px((i / n) | 0);
        /* A suggested move (A to E) on an empty point looks like the stone it would be: white letter on black for Black, and the
           other way round for White. markColor is the side to move (0: the plain light disc). */
        const as = !this.board[i] && /^[A-E]$/.test(this.marks[k]) ? this.markColor : 0;
        if (!this.board[i]) {
          ctx.fillStyle = as === 1 ? '#111' : as === 2 ? '#fff' : 'rgba(255,255,255,.8)';
          ctx.beginPath(); ctx.arc(x, y, cell * .3, 0, 7); ctx.fill();
          if (as === 2) { ctx.strokeStyle = '#111'; ctx.lineWidth = Math.max(1, cell * .03); ctx.stroke(); }
        }
        ctx.fillStyle = as === 1 || this.board[i] === 1 ? '#fff' : as === 2 ? '#111' : '#33220c';
        ctx.font = 'bold ' + Math.round(cell * .42) + 'px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.marks[k], x, y + 1);
      }
      // hint
      for (const i of this.hint) {
        const x = px(i % n), y = px((i / n) | 0);
        ctx.fillStyle = 'rgba(40,120,200,.22)'; ctx.beginPath(); ctx.arc(x, y, cell * .45, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(30,100,190,.95)'; ctx.lineWidth = Math.max(2, cell * .08); ctx.stroke();
      }
      // ghost
      const gi = this.ghost >= 0 ? this.ghost : (this.hoverColor && this.hover >= 0 && !this.board[this.hover] ? this.hover : -1);
      if (gi >= 0 && !this.board[gi]) this.stone(px(gi % n), px((gi / n) | 0), this.ghost >= 0 ? this.ghostColor : this.hoverColor, .5, false);
    }
  }

  window.GC.BoardView = BoardView;
})();
