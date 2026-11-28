/* Live Go Board: Go Coach with Claude as the coach. Only in the claude.ai copy (the mock-up), never in Go Coach itself.
   What you type in "Ask your coach" goes to Claude, with the board position; Claude's answers appear in the chat.
   Requests the app itself runs (new game, hint, teach me, the numbered welcome choices...) still go to Go Coach. */
(() => {
  'use strict';
  const G = window.GC, C = window.GoCoach;
  let comments = null, db = null, ok = false, threadId = null;
  try { threadId = localStorage.getItem('lgbThread'); } catch (e) {}
  const toast = m => { if (G.toast) G.toast(m, 4000); };

  function position() {
    try {
      const info = G.lessonInfo ? G.lessonInfo() : null;
      const s = info ? (G.Lesson && G.Lesson.s) : (G.Play && G.Play.s);
      return s ? G.E.toSGF(s, '') : '';
    } catch (e) { return ''; }
  }
  function lastLines() {
    return [...document.querySelectorAll('#chat .chatLog .msg')].slice(-6)
      .map(n => (n.classList.contains('user') ? 'You: ' : 'Coach: ') + (n.textContent || '').trim().slice(0, 300));
  }

  async function sendToClaude(text) {
    if (db) { try { await db.doc('coach/position').set({ sgf: position(), chat: lastLines(), at: new Date().toISOString() }); } catch (e) {} }
    if (threadId) {
      try { await comments.sendToClaude({ threadId, text }); return; }
      catch (e) { if (!e || e.code !== 'not_found') throw e; threadId = null; }
    }
    const anchor = await comments.anchorFor(document.getElementById('chat'));
    const r = await comments.sendToClaude({ anchor, text });
    threadId = r.threadId;
    try { localStorage.setItem('lgbThread', threadId); } catch (e) {}
  }

  /* An app request (it names an action Go Coach runs) stays with Go Coach; anything else goes to Claude. */
  function isAppRequest(q) {
    try { const r = C.reply(q, { n: (G.Play && G.Play.s && G.Play.s.n) || 9 }); return !!(r && r.action); } catch (e) { return false; }
  }
  const local = G.askCoach;
  G.askCoach = q => {
    if (!ok || isAppRequest(q)) return local ? local(q) : false;
    sendToClaude(q).then(() => toast('Sent to Claude. The answer will appear in the chat.'))
      .catch(e => {
        G.chatRecord('coach', e && e.code === 'consent_required'
          ? 'Allow this page to comment for you (the prompt at the top), then ask again.'
          : 'Claude could not be reached just now. Try again, or write in the Claude chat.');
      });
    return true;
  };

  /* Claude's answers: coach/replies holds { items: [{ id, text }] }. Show each new one once. */
  function listen() {
    let seen = null;
    try { const v = localStorage.getItem('lgbSeen'); if (v !== null) seen = +v; } catch (e) {}
    db.doc('coach/replies').onSnapshot(snap => {
      const items = (snap.exists && Array.isArray(snap.data().items)) ? snap.data().items : [];
      const top = items.reduce((m, it) => Math.max(m, +it.id || 0), 0);
      if (seen === null) seen = top; /* first visit: start from now, no replay of old answers */
      for (const it of items) if ((+it.id || 0) > seen && typeof it.text === 'string') G.chatRecord('coach', it.text);
      if (top > seen) { seen = top; try { localStorage.setItem('lgbSeen', String(seen)); } catch (e) {} }
    }, () => {});
  }

  (async () => {
    if (!window.claude) return;
    [comments, db] = await Promise.all([window.claude.use('comments'), window.claude.use('db')]);
    if (db) listen();
    if (!comments) return;
    try { ok = (await comments.canSendToClaude()) === 'available'; } catch (e) { ok = false; }
    const input = document.querySelector('.chatInput');
    if (ok && input) input.placeholder = 'Ask Claude, your coach\u2026';
  })();
})();
