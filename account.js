/* Go Coach - accounts on this device (Boon, 27 Nov 2026). Loaded before util.js, so it runs before anything reads storage.
   Everything the app keeps under a 'gocoach.' name (settings, game, chat and its history, grade, streak, lessons done, the
   private key for cloud saves and messages) belongs to whoever is playing. The app opens fresh every time, as a guest:
   - A guest's data is wiped at the next open, so nothing is kept between visits.
   - Signing in with a name brings back that name's data. A name not used before becomes a new account and keeps what the
     guest has done so far (not puzzles, lesson ticks or grade: those are recorded only when signed in). Several names can share a device. There is no password: this is not yet a real account.
   - While signed in, the data stays where the app reads it; at the next open it is put away under the name ('gcacct/').
   Signing in, out or clearing reloads the page, so every part of the app reads the right data. A reload after signing in
   stays signed in for that visit (sessionStorage); closing the app or tab ends it.
   Kept for the device, not the player: the usage-log switch and its anonymous device number (telemetry.js). */
(() => {
  'use strict';
  const OWN = 'gocoach.', VAULT = 'gcacct/', LIVE = 'gcacct:live', VER = 'gcacct:v', SESS = 'gcacct:session', JUST = 'gcacct:just';
  const DEVICE = new Set(['gocoach.telemetry']);
  const NAME = 'gocoach.user', OLDNAME = 'gocoach.name';
  const ls = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  const ss = (() => { try { return window.sessionStorage; } catch (e) { return null; } })();
  const get = (s, k) => { try { return s ? s.getItem(k) : null; } catch (e) { return null; } };
  const set = (s, k, v) => { try { if (!s) return; if (v === null || v === undefined) s.removeItem(k); else s.setItem(k, v); } catch (e) { /* storage full or unavailable */ } };
  const keys = () => { const out = []; try { for (let i = 0; ls && i < ls.length; i++) out.push(ls.key(i)); } catch (e) { /* unavailable */ } return out; };
  const id = name => String(name || '').trim().toLowerCase();
  const pre = acct => VAULT + encodeURIComponent(acct) + '/';
  const liveKeys = () => keys().filter(k => k.startsWith(OWN) && !DEVICE.has(k));
  /* Moves one value, removing the old copy first so a full storage still has room for it. */
  function move(from, to) {
    const v = get(ls, from);
    if (v === null) return;
    set(ls, from, null);
    try { ls.setItem(to, v); } catch (e) { set(ls, from, v); }
  }
  const wipeLive = () => liveKeys().forEach(k => set(ls, k, null));
  const stash = acct => { const p = pre(acct); keys().filter(k => k.startsWith(p)).forEach(k => set(ls, k, null)); liveKeys().forEach(k => move(k, p + k.slice(OWN.length))); };
  const unstash = acct => { const p = pre(acct); keys().filter(k => k.startsWith(p)).forEach(k => move(k, OWN + k.slice(p.length))); };
  const exists = acct => !!acct && keys().some(k => k.startsWith(pre(acct)));

  /* ---------- at every open ---------- */
  if (ls && get(ls, VER) !== '1') { /* first run of this version: an existing named player keeps their data as an account */
    const n = id(get(ls, NAME) || get(ls, OLDNAME));
    if (n && !get(ls, LIVE)) set(ls, LIVE, n);
    set(ls, VER, '1');
  }
  let current = get(ls, LIVE) || '';
  const justIn = !!current && get(ss, JUST) === current;
  set(ss, JUST, null);
  if (current && get(ss, SESS) === current) { /* a reload during a signed-in visit: stay signed in */ }
  else {
    if (current) stash(current); else wipeLive();
    current = '';
    set(ls, LIVE, null); set(ss, SESS, null);
  }

  /* ---------- signing in and out ---------- */
  const enter = acct => { set(ls, LIVE, acct); set(ss, SESS, acct); set(ss, JUST, acct); location.reload(); };
  function signIn(name) {
    const n = String(name || '').trim(), acct = id(n);
    if (!acct || acct === current) return;
    if (current) stash(current);
    if (exists(acct)) { wipeLive(); unstash(acct); } /* the guest's visit is dropped; the account comes back */
    if (!get(ls, NAME)) set(ls, NAME, n); /* a returning account keeps its own spelling of the name */
    set(ls, OLDNAME, null);
    enter(acct);
  }
  function signOut() {
    if (current) stash(current); else wipeLive();
    set(ls, LIVE, null); set(ss, SESS, null);
    location.reload();
  }
  /* The same account under a new name; false when another account already has that name. */
  function rename(name) {
    const n = String(name || '').trim(), acct = id(n);
    if (!current || !acct) return false;
    if (acct !== current && exists(acct)) return false;
    set(ls, NAME, n); set(ls, OLDNAME, null);
    if (acct !== current) { current = acct; set(ls, LIVE, acct); set(ss, SESS, acct); }
    return true;
  }
  /* Clear Account: removes the signed-in account (or the guest's visit) from this device, then starts again. */
  function clear() {
    if (current) keys().filter(k => k.startsWith(pre(current))).forEach(k => set(ls, k, null));
    wipeLive();
    set(ls, LIVE, null); set(ss, SESS, null);
    location.reload();
  }

  window.GoAccount = {
    signedIn: () => !!current,
    name: () => (current ? (get(ls, NAME) || '').trim() : ''),
    justSignedIn: () => justIn, /* this page load came straight from signing in: carry on where the player was */
    signIn, signOut, rename, clear
  };
})();
