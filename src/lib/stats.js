import { sleepMinutes } from './date.js'
import { routineFor, ALL_TASK_IDS, MVD_TASK_IDS } from '../db/routine.js'

// Completion % for a single day's record, relative to the items shown
// (full routine, or MVD essentials when MVD mode is on).
export function dayCompletion(day) {
  const ids = (day?.mvd ? MVD_TASK_IDS : ALL_TASK_IDS)
  if (ids.length === 0) return 0
  const done = ids.filter((id) => day?.tasks?.[id]).length
  return Math.round((done / ids.length) * 100)
}

export function totalLearning(day) {
  return (day.learnAI || 0) + (day.learnSystemDesign || 0) + (day.learnDSA || 0) + (day.learnReading || 0)
}

// Aggregate a set of day rows (keyed map or array) into dashboard metrics.
export function summarize(days) {
  const rows = Array.isArray(days) ? days : Object.values(days)
  const present = rows.filter(Boolean)

  const sleepVals = present
    .map((d) => sleepMinutes(d.bedtime, d.wakeTime))
    .filter((v) => v != null)
  const avgSleep = sleepVals.length
    ? Math.round(sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length)
    : null

  const gymDone = present.filter((d) => d.gymStatus === 'done').length
  const gymSkipped = present.filter((d) => d.gymStatus === 'skipped').length
  const gymRest = present.filter((d) => d.gymStatus === 'rest').length

  const learn = {
    ai: sum(present, 'learnAI'),
    systemDesign: sum(present, 'learnSystemDesign'),
    dsa: sum(present, 'learnDSA'),
    reading: sum(present, 'learnReading'),
  }
  learn.total = learn.ai + learn.systemDesign + learn.dsa + learn.reading

  const doomTotal = sum(present, 'doomMinutes')
  const calledDays = present.filter((d) => d.calledLovedOnes).length

  return { avgSleep, gymDone, gymSkipped, gymRest, learn, doomTotal, calledDays, count: present.length }
}

function sum(rows, key) {
  return rows.reduce((a, d) => a + (d[key] || 0), 0)
}

// Average energy across the 3 slots for a day (ignores nulls). Returns null if none.
export function dayEnergy(day) {
  const vals = [day.energyMorning, day.energyAfternoon, day.energyNight].filter((v) => v != null)
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

// Gentle streak: count of consecutive days (ending today) where `pred` holds.
// A day with no record breaks the streak but we never frame it as failure in UI.
export function streak(daysByKey, keys, pred) {
  let n = 0
  for (let i = keys.length - 1; i >= 0; i--) {
    const d = daysByKey[keys[i]]
    if (d && pred(d)) n++
    else break
  }
  return n
}

// Map an array of rows to a key->row lookup.
export function byKey(rows) {
  const m = {}
  for (const r of rows) m[r.date] = r
  return m
}

export { routineFor }
