// Date helpers working in local time, keyed as "YYYY-MM-DD".

export function toKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey() {
  return toKey(new Date())
}

export function addDays(key, n) {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

// 0 = Sunday ... 6 = Saturday
export function dow(key) {
  return fromKey(key).getDay()
}

export function isSunday(key) {
  return dow(key) === 0
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function prettyDate(key) {
  const d = fromKey(key)
  return `${WEEKDAY[d.getDay()]}, ${MONTH[d.getMonth()]} ${d.getDate()}`
}

export function relativeLabel(key) {
  const t = todayKey()
  if (key === t) return 'Today'
  if (key === addDays(t, -1)) return 'Yesterday'
  if (key === addDays(t, 1)) return 'Tomorrow'
  return ''
}

// Last `n` day-keys ending at (and including) `endKey`, oldest first.
export function lastNDays(endKey, n) {
  const out = []
  for (let i = n - 1; i >= 0; i--) out.push(addDays(endKey, -i))
  return out
}

// The 7 keys of the week (Mon..Sun) that `key` falls in. Week starts Monday.
export function weekKeys(key) {
  const d = fromKey(key)
  const day = d.getDay() // 0 Sun..6 Sat
  const offsetToMonday = day === 0 ? -6 : 1 - day
  const monday = addDays(toKey(d), offsetToMonday)
  return lastNDays(addDays(monday, 6), 7)
}

// Sleep duration in minutes given bedtime + wakeTime "HH:MM".
// Assumes bedtime is the night before wake (handles crossing midnight).
export function sleepMinutes(bedtime, wakeTime) {
  if (!bedtime || !wakeTime) return null
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  let bed = bh * 60 + bm
  let wake = wh * 60 + wm
  // If wake is "after" bedtime numerically and bedtime is in the evening,
  // assume sleep crossed midnight.
  if (wake <= bed) wake += 24 * 60
  const mins = wake - bed
  // Guard against absurd values.
  return mins > 0 && mins < 20 * 60 ? mins : null
}

export function fmtDuration(mins) {
  if (mins == null) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h${m ? ` ${m}m` : ''}`
}
