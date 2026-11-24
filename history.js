/* World of Go — reads the history article (and the other whole pages) from docs/text/<language>/pages, such as history.md.
   The article itself lives in that Markdown file, so it can be edited and extended without touching the code. This file only turns that Markdown into a page
   that page.js can draw, and checks it for mistakes. No DOM here: test.js runs it in Node, and deploy.bat runs the tests before every deploy.
   Format: "# title", the first paragraph is the introduction, "## heading", "### smaller heading", "- " bullets, "> " a quotation,
   [n] citations, **bold**, _italics_ (or *italics*), <!-- comments -->, and a "## References" section with lines "n. Title | Publisher | https://link". */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GoHistory = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Bold, italics and citations inside a line of text, as pieces for page.js to draw:
     { t: 'text', text }, { t: 'cite', n, text }, { t: 'b', parts } or { t: 'i', parts }. Underscores and stars count only at the edges
     of a word, so names such as Go_(game) are left alone. */
  const INLINE = /(\*\*(?=\S)[^*]*?\S\*\*|(?<![\w*])\*(?=\S)[^*]*?\S\*(?![\w*])|(?<![\w_])_(?=\S)[^_]*?\S_(?![\w_])|\[\d+\])/;
  function inline(text) {
    const out = [];
    String(text).split(INLINE).forEach((part, k) => {
      if (!part) return;
      if (k % 2 === 0) out.push({ t: 'text', text: part });
      else if (part[0] === '[') out.push({ t: 'cite', n: +part.slice(1, -1), text: part });
      else if (part.startsWith('**')) out.push({ t: 'b', parts: inline(part.slice(2, -2)) });
      else out.push({ t: 'i', parts: inline(part.slice(1, -1)) });
    });
    return out;
  }

  /* Markdown text -> { title, blocks, refs }. A block is { t: 'lead' | 'p' | 'quote' | 'h' | 'h3', text }, { t: 'ul', items } or { t: 'refs', items }. */
  function parse(md) {
    const lines = String(md).replace(/<!--[\s\S]*?-->/g, '').replace(/\r\n?/g, '\n').split('\n');
    const page = { title: 'A history of Go', blocks: [], refs: [] };
    let para = [], list = [], quote = [], refsMode = false, sawSection = false;
    const flushPara = () => { if (para.length) { page.blocks.push({ t: sawSection ? 'p' : 'lead', text: para.join(' ') }); para = []; } };
    const flushList = () => { if (list.length) { page.blocks.push({ t: 'ul', items: list }); list = []; } };
    const flushQuote = () => { if (quote.length) { page.blocks.push({ t: 'quote', text: quote.join(' ') }); quote = []; } };
    const flush = () => { flushPara(); flushList(); flushQuote(); };
    for (const raw of lines) {
      const line = raw.trim();
      let m;
      if (!line) { flush(); continue; }
      if ((m = /^#\s+(.+)$/.exec(line))) { flush(); page.title = m[1]; continue; }
      if ((m = /^##\s+(.+)$/.exec(line))) {
        flush(); sawSection = true;
        refsMode = /^references?$/i.test(m[1]);
        page.blocks.push({ t: 'h', text: m[1] });
        if (refsMode) page.blocks.push({ t: 'refs', items: page.refs });
        continue;
      }
      if ((m = /^###\s+(.+)$/.exec(line))) { flush(); page.blocks.push({ t: 'h3', text: m[1] }); continue; }
      if (refsMode && (m = /^(\d+)\.\s+(.+)$/.exec(line))) {
        const [title, by, url] = m[2].split('|').map(s => s.trim());
        page.refs.push({ n: +m[1], title: title || '', by: by || '', url: url || '' });
        continue;
      }
      if ((m = /^>\s?(.*)$/.exec(line))) { flushPara(); flushList(); if (m[1]) quote.push(m[1]); continue; }
      if ((m = /^[-*]\s+(.+)$/.exec(line))) { flushPara(); flushQuote(); list.push(m[1]); continue; }
      flushList(); flushQuote();
      para.push(line);
    }
    flush();
    return page;
  }

  /* Mistakes in a page, as plain sentences. An empty list means it is fine. */
  function problems(page) {
    const out = [], nums = new Set(page.refs.map(r => r.n)), cited = new Set();
    if (nums.size !== page.refs.length) out.push('Two references share the same number.');
    const scan = text => {
      for (const m of String(text).matchAll(/\[(\d+)\]/g)) {
        cited.add(+m[1]);
        if (!nums.has(+m[1])) out.push(`[${m[1]}] has no matching reference.`);
      }
    };
    for (const b of page.blocks) {
      if (b.t === 'p' || b.t === 'lead' || b.t === 'quote') scan(b.text);
      else if (b.t === 'ul') b.items.forEach(scan);
    }
    for (const r of page.refs) {
      if (!cited.has(r.n)) out.push(`Reference ${r.n} is never cited in the text.`);
      if (!/^https:\/\/\S+$/.test(r.url)) out.push(`Reference ${r.n} needs an https link.`);
      if (!r.title || !r.by) out.push(`Reference ${r.n} needs a title and a publisher.`);
    }
    return out;
  }

  return { parse, problems, inline };
});
