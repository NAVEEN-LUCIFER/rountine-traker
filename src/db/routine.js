import { dow } from '../lib/date.js'

// Static routine definition. Edit this file to change your schedule — it is not
// stored in the DB on purpose (rarely changes, no need for an editor in v1).
//
// `days`: optional array of weekday numbers (0=Sun..6=Sat) the item applies to.
//   Omit to mean "every day".
// `mvd`: true if the item belongs to Minimum Viable Day mode (the 5 essentials).
// `growth`: special block whose label depends on the weekday (see growthFocus).

// Mon/Wed/Fri -> AI Engineering, Tue/Thu -> System Design, Weekend -> DSA + projects.
export function growthFocus(key) {
  const d = dow(key)
  if (d === 1 || d === 3 || d === 5) return 'AI Engineering'
  if (d === 2 || d === 4) return 'System Design'
  return 'DSA + projects'
}

const BASE = [
  { id: 'wake', time: '5:30', label: 'Wake up', mvd: false },
  { id: 'leave', time: '5:50', label: 'Brush, water, change, leave', mvd: false },
  { id: 'cycle_gym', time: '6:10', label: 'Cycle to gym', mvd: false },
  { id: 'gym', time: '6:15', label: 'Gym', mvd: true },
  { id: 'cycle_home', time: '7:30', label: 'Cycle home', mvd: false },
  { id: 'ready', time: '7:45', label: 'Shower, skin/hair care, pack', mvd: false },
  { id: 'commute_am', time: '8:45', label: 'Cab + audiobook/podcast', mvd: false },
  { id: 'breakfast', time: '9:15', label: 'Breakfast at office', mvd: false },
  { id: 'work', time: '9:00', label: 'Office work (SDE)', mvd: true },
  { id: 'home', time: '20:30', label: 'Reach home', mvd: false },
  { id: 'loved_ones', time: '20:30', label: 'Talk to loved ones', mvd: true },
  { id: 'skin_pm', time: '21:00', label: 'Night skin + hair care', mvd: false },
  { id: 'growth', time: '21:30', label: 'Growth block', mvd: true, growth: true },
  { id: 'dsa', time: '22:00', label: 'DSA', mvd: false },
  { id: 'sleep', time: '22:30', label: 'Sleep by 10:30 PM', mvd: true },
]

// Return the routine items for a given date. When `mvdOnly` is true, only the
// 5 essentials are returned, and the learning-OR-reading essential is folded in
// via the growth block label.
export function routineFor(key, mvdOnly) {
  let items = BASE
  if (mvdOnly) items = items.filter((i) => i.mvd)
  return items.map((i) => ({
    ...i,
    label: i.growth ? `Growth: ${growthFocus(key)}` : i.label,
    sublabel: i.growth ? (mvdOnly ? '20–40 min learning or reading' : null) : null,
  }))
}

export const ALL_TASK_IDS = BASE.map((i) => i.id)
export const MVD_TASK_IDS = BASE.filter((i) => i.mvd).map((i) => i.id)
