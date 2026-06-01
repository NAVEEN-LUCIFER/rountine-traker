# Routine Tracker — Design & Build Doc

A personal, single-user, mobile-first habit/routine tracker. Local-only PWA. No backend, no login, no accounts, no cloud. Your data lives in your phone's IndexedDB. Calm, low-friction, one-tap.

The guiding rule for v1: **the simplest thing that is actually useful every day.** Everything below is scoped so you can ship in an evening and live in it for months before deciding what to add.

---

## 1. Product Requirements Document (PRD)

**Problem.** You have a detailed daily routine and clear growth goals (SDE → AI Engineering, gym consistency, sleep, less doom scrolling). Existing trackers are either too heavy (forms, setup, guilt streaks) or too dumb (single checkbox). You stop using them within a week. You need something that takes <60 seconds a day, never shames you, and surfaces honest weekly signal.

**Goal.** Track adherence, energy, sleep, gym, learning, relationships, skin/hair care, and doom scrolling with near-zero friction, and turn that into a weekly review you actually read.

**Non-goals (v1).** No multi-device sync, no social features, no notifications/push, no AI chat, no analytics backend, no auth. These are explicitly deferred to keep maintenance near zero.

**Target user.** Exactly one person: you. This is the single most important design constraint — it lets us skip auth, accounts, and a server entirely.

**Success metrics (judge it after 4 weeks).**
- You open it ≥5 days/week without forcing yourself.
- A full day's logging takes under 60 seconds.
- You read the Sunday review and it changes one thing the next week.

**Core design principles.**
- **One tap per habit.** Tap = done. Tap again = undone. No save buttons.
- **Optional everything.** A blank field is never an error. Partial days are normal days.
- **No guilt.** No red, no "you broke your streak!", no shame copy. Streaks are shown gently and a missed day doesn't reset to zero with a slap — it just shows the gap.
- **Minimum Viable Day (MVD) mode.** A one-tap "I'm wiped today" switch that collapses the day to 5 essentials so a tired day still feels like a win.
- **Honest, not motivational-poster.** The weekly review states what happened plainly and suggests exactly one adjustment.

---

## 2. Database Schema

Single-user, so the model is deliberately flat. One row per day, keyed by date. IndexedDB via Dexie.

### Table: `days` (primary key: `date` = `"YYYY-MM-DD"`)

| Field | Type | Notes |
|---|---|---|
| `date` | string | `YYYY-MM-DD`, primary key |
| `mvd` | boolean | Minimum Viable Day mode on/off |
| `tasks` | object | map of `routineTaskId -> true` for completed checklist items |
| `energyMorning` | number\|null | 1–5 |
| `energyAfternoon` | number\|null | 1–5 |
| `energyNight` | number\|null | 1–5 |
| `bedtime` | string\|null | `"HH:MM"` (when you went to sleep, belongs to this date's night) |
| `wakeTime` | string\|null | `"HH:MM"` |
| `sleepQuality` | number\|null | 1–5 |
| `gymStatus` | string\|null | `"done"` \| `"skipped"` \| `"rest"` |
| `gymSkipReason` | string\|null | free text, only if skipped |
| `learnAI` | number | minutes, default 0 |
| `learnSystemDesign` | number | minutes, default 0 |
| `learnDSA` | number | minutes, default 0 |
| `learnReading` | number | minutes, default 0 |
| `calledLovedOnes` | boolean | default false |
| `skincareMorning` | boolean | default false |
| `skincareNight` | boolean | default false |
| `doomMinutes` | number | minutes, default 0 |
| `doomTrigger` | string\|null | e.g. "post-lunch slump", "bored in meeting" |
| `doomReplacement` | string\|null | what you did instead, e.g. "walked", "read" |
| `note` | string\|null | optional one-line journal |
| `updatedAt` | number | epoch ms |

That's it. No `users`, no `habits` table, no joins. Routine *definitions* (the checklist items and their times) are static config in code, not in the DB — they rarely change and don't need to be editable in v1. Sleep duration, completion %, streaks, and trends are all **derived** from `days` at read time, never stored.

### Why one row per day
- Logging a value = `db.days.put({...existing, field: value})`. Trivially simple.
- A day either exists (you touched it) or doesn't (untouched). No nulls to seed.
- Trends = `db.days.where('date').between(start, end)`.

---

## 3. User Flows

**First open.** App loads straight to Today for the current date. No onboarding, no signup. Empty state shows the day's routine checklist and a hint: "Tap anything to log it."

**Logging during the day (the 90% flow).**
1. Open app → lands on Today.
2. Tap routine items as you complete them (gym, breakfast, growth block…).
3. Tap energy faces at morning/afternoon/night when you think of it.
4. Bump learning minutes with quick +15 / +30 chips after a study block.
5. Toggle gym, called-loved-ones, skincare with one tap.
6. If you doom-scrolled, optionally log minutes + a trigger + what you'll do instead.
   Each tap writes immediately. There is no "submit."

**Tired day.** Tap **MVD** in the header → checklist collapses to 5 essentials (gym/walk, work, 20–40 min learning OR reading, talk to loved ones, sleep by 10:30). Reduces decision load; the rest is hidden, not failed.

**Logging sleep.** On the Today screen, set last night's bedtime + this morning's wake time + a quality face. Duration is computed.

**Checking progress.** Tap Dashboard → see today's completion %, sleep duration, gym consistency, learning minutes this week, doom-scroll trend, energy trend.

**Sunday review.** Tap Review (or it auto-surfaces a banner on Sundays) → generated summary: what went well, what slipped, main reason for misses, one adjustment, recommended focus.

**Editing the past.** A date stepper at the top of Today lets you go back a day to fill something in. Same screen, same one-tap interactions.

---

## 4. UI / Wireframe Structure

Three tabs (bottom nav, thumb-reachable): **Today · Dashboard · Review**.

```
┌─────────────────────────────┐
│  ‹  Mon, Jun 1        [MVD]  │  header: date stepper + MVD toggle
│  Day 73% complete  ▓▓▓▓░░    │  gentle progress bar
├─────────────────────────────┤
│  ROUTINE                    │
│  ◻ 5:30 Wake                │  one-tap rows; checked = filled circle
│  ◼ 6:15 Gym                 │
│  ◻ 9:15 Breakfast           │
│  ◻ 21:30 Growth: AI Eng     │  ← label changes by weekday
│  ◻ 22:00 DSA                │
├─────────────────────────────┤
│  ENERGY   🌅 😐  ☀ —  🌙 —   │  3 slots, 5-face scale each
├─────────────────────────────┤
│  SLEEP    bed 22:35 wake 5:30│
│           quality ●●●○○  6h55│  duration auto
├─────────────────────────────┤
│  GYM   [Done] Skipped  Rest │  segmented; reason field if skipped
├─────────────────────────────┤
│  LEARNING (min)             │
│  AI 30  +15 +30   SysD 0 ...│  number + quick-add chips
│  DSA 20  Reading 15         │
├─────────────────────────────┤
│  CARE  ◼ called  ◼ skin AM  │
│        ◻ skin PM            │
├─────────────────────────────┤
│  DOOM SCROLL                │
│  18 min  trigger:[slump  ]  │
│  instead:[walked         ] │
└─────────────────────────────┘
   [ Today ] [ Dashboard ] [ Review ]
```

**Dashboard** is a vertical stack of small "stat cards": Today completion ring, Sleep (7-day avg + last night), Gym consistency (last 7 / 30 days as dots), Learning minutes this week (stacked bar by category), Doom-scroll trend (7-day sparkline, lower = better, shown neutrally), Energy trend (7-day line averaged across slots).

**Review** is a single scrollable card with five short sections plus the week's headline numbers.

**Visual language.** Soft off-white/ink dark theme, lots of whitespace, rounded cards, one accent color (calm teal/green), system font. No charts library — tiny inline SVG/CSS bars keep it fast and dependency-free.

---

## 5. MVP Feature List (build this first)

1. Today screen with date stepper.
2. Routine checklist with weekday-aware growth block, one-tap toggle.
3. Day completion %.
4. Energy: morning/afternoon/night, 1–5.
5. Sleep: bedtime, wake, quality, derived duration.
6. Gym: done/skipped/rest + skip reason.
7. Learning minutes: AI, System Design, DSA, Reading with quick-add chips.
8. Relationship toggle (called loved ones).
9. Skincare morning/night toggles.
10. Doom scrolling: minutes + trigger + replacement.
11. MVD mode (collapses to 5 essentials).
12. Dashboard with the cards listed above.
13. Weekly Review generator (heuristic, client-side).
14. Local persistence (IndexedDB) + installable PWA.
15. Gentle streaks (current streak per key habit, no reset-shaming copy).

## 6. Nice-to-Haves (later, only if you still use it)

- Local notifications / reminders (needs a service-worker push or a scheduled local notification; browser support is fiddly — defer).
- Export / import JSON (cheap and worth doing early as a backup; included as a stretch).
- Optional cloud sync (Supabase) if you want it on multiple devices.
- Configurable routine (edit times/items in-app instead of in code).
- Apple Health / Google Fit sleep import.
- "On this day last month" reflections.
- LLM-written weekly review (paste your week's JSON into a model) — keep it optional and offline-first.
- Mood/journal search.
- Charts library (Recharts) if the hand-rolled visuals stop being enough.

## 7. Implementation Plan

**Phase 0 — scaffold (done in this deliverable).** Vite + React PWA, CSS theme, Dexie schema, routine config, stats + weekly-review helpers, three screens.

**Phase 1 — live on it (week 1–2).** Just use it daily. Resist adding features. Note real friction.

**Phase 2 — backup.** Add JSON export/import (a few lines) so you never fear losing data. Optionally wire a nightly export reminder.

**Phase 3 — only if earned.** Add the single most-wanted nice-to-have from your real usage notes. Probably reminders or sync. Do not batch-add.

**Deploy.** `npm run build` → drop `dist/` on Vercel/Netlify/GitHub Pages (all free, static). Open on phone, "Add to Home Screen" → it behaves like a native app and works offline.

## 8. Step-by-Step Build Instructions

See `README.md` in this folder for copy-paste commands. Short version:

```bash
cd routine-tracker
npm install
npm run dev        # open the printed localhost URL on your laptop
# on your phone (same wifi): npm run dev -- --host, then open the network URL
npm run build      # produces dist/ for deployment
```

## 9. Code Scaffold

Delivered alongside this doc as a working Vite + React project. Key files:
`src/db/db.js` (Dexie), `src/db/routine.js` (routine config + weekday logic), `src/lib/stats.js` (derived metrics + streaks), `src/lib/weeklyReview.js` (review generator), `src/pages/{Today,Dashboard,Review}.jsx`, `src/App.jsx`, `src/styles.css`.

## 10. Making It Actually Useful Long-Term

- **Protect the 60-second rule.** Every feature you add must not slow daily logging. If it does, it goes behind a tap or gets cut.
- **Back up early.** Add JSON export in week one. Local-only data is one cleared-cache away from gone.
- **Let the weekly review drive change, not the daily screen.** Daily is for capture; weekly is for thinking. Don't add analytics you'll only stare at.
- **Track leading indicators, not vanity.** Sleep and energy predict everything else — when they dip, expect gym/learning to dip too. The dashboard pairs them so you see the cause.
- **Keep doom-scroll logging blameless.** The point of logging the *trigger* and *replacement* is to learn your patterns (post-lunch slump → 5-min walk), not to punish minutes. Celebrate replacements, don't just count minutes.
- **Make MVD a real escape hatch.** Using MVD mode is a success state, not a failure. It's what keeps a hard week from becoming a quit-the-app week.
- **Review the routine config quarterly.** Your schedule will change (new job rhythm, travel). Edit `routine.js` rather than fighting a stale checklist.
- **Don't chase streak perfection.** Streaks are a nudge, not the product. The goal is a good *average week*, not an unbroken chain.
