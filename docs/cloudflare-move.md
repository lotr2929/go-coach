# Moving Go Coach from Vercel to Cloudflare

Boon's decision of 26 Nov 2026 (see `docs/decisions.md`): move before promoting, because Vercel's free plan is for non-commercial use only and Cloudflare's free plan is not.

Nothing in Go Coach needs a build or a server, so it moves as plain files. GitHub stays the meeting point: Cloudflare, like Vercel now, puts `main` live by itself whenever it changes, so "Deploy from the laptop" and "Merge on GitHub" keep working.

## What moving costs (read first)
- **Everything saved on a device belongs to the web address.** On the new address the app starts fresh: no chat history or sessions, the welcome and tour run again, and the private key for cloud saves (`gocoach.owner`) is new, so games saved from the old address do not appear. They are still in Supabase, but only the old key can reach them.
- Today the only real user is Boon, so this costs little now and a lot after promotion. That is why we move first.
- Home-screen installs of the old address keep opening the old address. Remove them and install from the new one.

## Steps

### Boon (about 10 minutes; needs his own account, so Claude cannot do it)
1. **Browser:** go to dash.cloudflare.com and sign up (free). Use the email you want tied to Go Coach.
2. **Browser:** Workers & Pages, then Create, then the **Pages** tab, then **Connect to Git**. Allow Cloudflare to see GitHub and choose the repository `lotr2929/go-coach`.
3. **Browser:** settings for the project:
   - Project name: `go-coach` (the address becomes `go-coach.pages.dev`, or a variation if taken).
   - Production branch: `main`.
   - Framework preset: None. Build command: leave empty. Build output directory: `/`.
4. **Browser:** Save and Deploy. Open the address it gives and tell Claude what it is.

(Cloudflare's menus change often; if a name above differs, pick the nearest one. Cloudflare also offers "Workers" with static files, which needs an extra settings file; Pages needs none, so use Pages.)

### Claude (one small change, then "May I merge on GitHub?")
1. Add `_headers`, Cloudflare's version of `vercel.json`: no caching for `sw.js` (so updates arrive) and the right type for `manifest.webmanifest`.
2. Change "Vercel" to "Cloudflare" in CLAUDE.md rule 7, deploy.bat's messages and decisions.md.
3. Check the new address: the app opens, installs, works offline, Save and Saved games work, and the version number matches.

### Afterwards
- Check every branch gets a Cloudflare preview link (Pages does this by default), so Boon can try changes before merging.
- Keep the Vercel site for a few weeks with a "Go Coach has moved" note or redirect, then delete the Vercel project. Then `vercel.json` can go.
- Optional: a domain of our own later (about A$15–25 a year). If we ever want one, buy it **before** promoting, for the same reason as the move.
