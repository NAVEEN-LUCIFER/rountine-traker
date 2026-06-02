import { sleepMinutes, fmtDuration } from './date.js'
import { summarize, dayEnergy, totalLearning, workStats } from './stats.js'

// Generate a calm, blameless weekly review from a week's worth of day rows.
// Pure heuristics, fully offline. Returns a structured object the UI renders.
//
// Tone rules baked in: state facts plainly, surface ONE adjustment, never shame.
export function weeklyReview(weekRows) {
  const rows = weekRows.filter(Boolean)
  const s = summarize(rows)
  const logged = rows.length

  const went = []
  const slipped = []

  // --- Gym ---
  if (s.gymDone >= 4) went.push(`Gym ${s.gymDone} days — consistency is holding.`)
  else if (s.gymDone + s.gymRest >= 4) went.push(`Showed up for movement/recovery ${s.gymDone + s.gymRest} days.`)
  else if (logged >= 3) slipped.push(`Gym happened ${s.gymDone} day${s.gymDone === 1 ? '' : 's'} this week.`)

  // --- Sleep ---
  if (s.avgSleep != null) {
    if (s.avgSleep >= 7 * 60) went.push(`Averaged ${fmtDuration(s.avgSleep)} of sleep.`)
    else if (s.avgSleep < 6.5 * 60) slipped.push(`Sleep averaged ${fmtDuration(s.avgSleep)} — below your recovery target.`)
  }

  // --- Learning ---
  const L = s.learn
  if (L.total >= 180) went.push(`${L.total} min of focused learning across all tracks.`)
  const tracks = [
    ['AI Engineering', L.ai],
    ['System Design', L.systemDesign],
    ['DSA', L.dsa],
    ['Reading', L.reading],
  ]
  const laggard = tracks.reduce((min, t) => (t[1] < min[1] ? t : min), tracks[0])
  const leader = tracks.reduce((max, t) => (t[1] > max[1] ? t : max), tracks[0])
  if (leader[1] > 0) went.push(`Most learning time went to ${leader[0]} (${leader[1]} min).`)
  if (L.total > 0 && laggard[1] === 0) slipped.push(`No time logged on ${laggard[0]} this week.`)

  // --- Relationships ---
  if (s.calledDays >= 4) went.push(`Stayed connected — talked to loved ones ${s.calledDays} days.`)
  else if (logged >= 3 && s.calledDays <= 1) slipped.push(`Connected with loved ones ${s.calledDays} day${s.calledDays === 1 ? '' : 's'}.`)

  // --- Doom scrolling ---
  if (s.doomTotal > 0) {
    const perDay = Math.round(s.doomTotal / Math.max(logged, 1))
    if (perDay <= 15) went.push(`Doom scrolling stayed low (~${perDay} min/day).`)
    else slipped.push(`Doom scrolling ~${perDay} min/day.`)
  }

  // --- Work shipped ---
  const work = workStats(rows)
  if (work.done > 0) {
    went.push(`Shipped ${work.done} work task${work.done === 1 ? '' : 's'} across ${work.activeDays} day${work.activeDays === 1 ? '' : 's'}.`)
  }

  // --- Main reason for misses (most common skip reason / doom trigger) ---
  const reason = topReason(rows)

  // --- One adjustment + recommended focus ---
  const adjustment = pickAdjustment({ s, L, laggard, reason })
  const focus = pickFocus({ L, laggard, s })

  if (went.length === 0) went.push('You showed up and logged the week — that itself counts.')
  if (slipped.length === 0) slipped.push('Nothing notable slipped. Steady week.')

  return {
    logged,
    numbers: {
      completionDays: rows.length,
      gym: `${s.gymDone}/7`,
      sleep: s.avgSleep != null ? fmtDuration(s.avgSleep) : '—',
      learning: `${L.total}m`,
      doom: `${s.doomTotal}m`,
      work: `${work.done}`,
    },
    went,
    slipped,
    reason,
    adjustment,
    focus,
  }
}

function topReason(rows) {
  const counts = {}
  for (const d of rows) {
    if (d.gymStatus === 'skipped' && d.gymSkipReason) bump(counts, d.gymSkipReason.trim().toLowerCase())
    if (d.doomMinutes > 20 && d.doomTrigger) bump(counts, d.doomTrigger.trim().toLowerCase())
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (!entries.length) return 'No clear single cause — misses were scattered.'
  const [text, n] = entries[0]
  return `Most common driver of misses: "${text}" (${n}×).`
}

function bump(o, k) { o[k] = (o[k] || 0) + 1 }

function pickAdjustment({ s, L, laggard, reason }) {
  if (s.avgSleep != null && s.avgSleep < 6.5 * 60) {
    return 'Pull bedtime 20 min earlier this week. Sleep is the lever that moves gym and focus.'
  }
  if (s.gymDone < 3) {
    return 'Pre-commit gym for 3 specific mornings and lay out kit the night before — lower the morning decision cost.'
  }
  if (L.total > 0 && laggard[1] === 0) {
    return `Protect one 30-min block for ${laggard[0]} on a fixed day so it stops getting skipped.`
  }
  if (s.doomTotal > 120) {
    return 'When the post-lunch slump hits, default to a 5-min walk before the phone — log the replacement, not the minutes.'
  }
  return 'Keep the current rhythm. If anything, add one small thing rather than overhauling.'
}

function pickFocus({ L, laggard, s }) {
  // Bias toward the stated goals: SDE strength + AI Engineering transition.
  if (laggard[0] === 'AI Engineering' && laggard[1] === 0) {
    return 'AI Engineering — it is your transition goal; even 20 min/day compounds.'
  }
  if (s.avgSleep != null && s.avgSleep < 6.5 * 60) {
    return 'Recovery first: sleep + gym. Skills land better on a rested brain.'
  }
  if (L.dsa < 60) return 'DSA reps — short daily sets keep interview muscles warm.'
  return 'Steady progress on AI Engineering while holding gym + sleep.'
}
