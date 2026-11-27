/* Go Coach - signed out means a clean start (Boon, 27 Nov 2026). This runs first. Until you sign in, the app sees none of the
   account's details on this device (name, grade, streak, solved lessons and puzzles, saved game, chat history): reads find
   nothing, and anything written is kept in memory only and forgotten when the page closes. Signing in reloads the page once with
   the account's own storage in view. The settings, and the count of free puzzles used today, belong to the device and stay as they are.
   window.GCguard: signed (true after signing in), raw (the real storage, for the sign-in box only), signInNext(). */
(() => {
  'use strict';
  const ACCOUNT = /^gocoach\.(user|name|grade|today|streak|done|game|chat|chatPast)$/;
  const proto = Storage.prototype;
  const real = { get: proto.getItem, set: proto.setItem, remove: proto.removeItem };
  const ls = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  const raw = {
    get: k => { try { return real.get.call(ls, k); } catch (e) { return null; } },
    set: (k, v) => { try { real.set.call(ls, k, v); } catch (e) { /* storage unavailable */ } },
    remove: k => { try { real.remove.call(ls, k); } catch (e) { /* storage unavailable */ } }
  };
  let flag = false;
  try { flag = sessionStorage.getItem('gocoach.signin') === '1'; sessionStorage.removeItem('gocoach.signin'); } catch (e) { /* no session storage */ }
  const signed = flag && !!(raw.get('gocoach.user') || '').trim(); /* only a sign-in just made counts: every new page load is signed out */

  if (!signed && ls) {
    const mem = new Map();
    const mine = (self, k) => self === ls && ACCOUNT.test(String(k));
    proto.getItem = function (k) { return mine(this, k) ? (mem.has(String(k)) ? mem.get(String(k)) : null) : real.get.call(this, k); };
    proto.setItem = function (k, v) { if (mine(this, k)) mem.set(String(k), String(v)); else real.set.call(this, k, v); };
    proto.removeItem = function (k) { if (mine(this, k)) mem.delete(String(k)); else real.remove.call(this, k); };
  }
  window.GCguard = {
    signed, raw,
    signInNext() { try { sessionStorage.setItem('gocoach.signin', '1'); } catch (e) { /* the page then opens signed out */ } }
  };
})();
