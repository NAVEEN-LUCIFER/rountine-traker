thirdParty_BKP_master# Routine Tracker

A calm, low-friction, **single-user** routine & progress tracker. Mobile-first PWA.

It runs in two modes:

- **Local-only** (no setup): data lives in the browser's IndexedDB on each device, no login.
- **Synced** (add a free Supabase project): your days sync across phone, tablet and laptop in real time, with email/password login. Still offline-first — it works without a connection and catches up when you're back online.

Built with Vite + React + Dexie + Supabase. See `DESIGN.md` for the full PRD, schema, flows, and roadmap.

## Run it

```bash
cd routine-tracker
npm install
npm run dev
```

Open the printed `http://localhost:5173` on your laptop.

**On your phone (same Wi-Fi):**

```bash
npm run dev -- --host
```

then open the `Network:` URL it prints (e.g. `http://192.168.x.x:5173`) on your phone.

## Turn on cross-device sync (Supabase)

Without this, each device keeps its own separate data. With it, phone + tablet + laptop all share one dataset and update live. It's free.

1. Create a project at [supabase.com](https://supabase.com) (free tier is plenty).
2. In the dashboard, open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and run it. This creates the `days` table, row-level security (so only you can read your rows), and enables realtime.
3. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.
4. In this folder, copy `.env.example` to `.env` and paste them in:

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```

5. Restart `npm run dev`. The app now shows a sign-in screen. **Create one account** and use the same email/password on every device — they'll all sync.

Notes:
- New Supabase projects have email confirmation **on** by default. Either confirm via the email it sends, or turn it off under **Authentication → Providers → Email** for a frictionless personal setup.
- The `anon` key is safe to ship in a client app — row-level security is what protects your data, and it only ever exposes rows where `user_id = your id`.
- Leave `.env` blank/absent and the app simply runs in local-only mode. `.env` is gitignored.

The little dot in the header shows sync state: **Synced**, **Syncing…**, **Offline**, **Local only**, or **Sync error**.

## Install as an app (offline, home-screen icon)

```bash
npm run build      # outputs static files to dist/
npm run preview    # serves dist/ locally to test the production build
```

Deploy `dist/` to any static host (all free):

- **Vercel:** `npx vercel deploy dist --prod` (or drag the folder into the dashboard)
- **Netlify:** drag `dist/` onto app.netlify.com/drop
- **GitHub Pages:** push `dist/` to a `gh-pages` branch

If you're using sync, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in your host's dashboard (Vercel/Netlify) so the production build picks them up.

Then on your phone: open the deployed URL → browser menu → **Add to Home Screen**. It now opens fullscreen and works offline (service worker caches the app shell).

## Make it yours

- **Change your schedule:** edit `src/db/routine.js` (times, labels, which items count toward Minimum Viable Day, and the weekday → growth-topic mapping in `growthFocus`).
- **Change the look:** colors live as CSS variables at the top of `src/styles.css`.
- **Tune the weekly review tone/logic:** `src/lib/weeklyReview.js`.

## Back up your data

Local-only data is one cleared-cache away from gone. In the app: **Review → Backup → Export JSON** every week or two. Import the same file on a new device to restore.

## Project layout

```
supabase/
  schema.sql          run once in Supabase to create the synced table + RLS
src/
  main.jsx            entry, SyncProvider, service-worker registration
  App.jsx             auth gate + 3-tab shell (Today / Dashboard / Review)
  styles.css          calm dark theme (CSS variables)
  components/
    SyncBadge.jsx     header dot showing sync state
  db/
    db.js             Dexie cache, getDay/patchDay, dirty-tracking, export/import
    routine.js        your routine definition + weekday growth logic
    supabase.js       Supabase client (null in local-only mode)
  lib/
    date.js           date keys, sleep math, week math
    useDay.js         live (auto-updating) hook for a single day
    stats.js          derived metrics + gentle streaks
    weeklyReview.js   heuristic Sunday review generator
    sync.js           offline-first push/pull/realtime engine (last-write-wins)
    SyncContext.jsx   session + sync status + sign in/up/out
  pages/
    Today.jsx         the daily logging screen
    Dashboard.jsx     trends & stat cards
    Review.jsx        weekly review + backup + account
    Login.jsx         email/password sign-in (only when sync is on)
```

In local-only mode: no tracking, no network calls, no accounts. With sync on: the only network traffic is to your own Supabase project, protected by row-level security.
