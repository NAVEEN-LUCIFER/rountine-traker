import Dexie from 'dexie'

// Single-user local cache. One row per day keyed by "YYYY-MM-DD".
// When Supabase sync is on, this is the offline-first cache; the `dirty` index
// tracks rows that still need to be pushed to the server.
export const db = new Dexie('routine-tracker')

db.version(1).stores({
  days: 'date',
})

// v2 adds indexes used by the sync engine.
db.version(2).stores({
  days: 'date, dirty, updatedAt',
})

export function emptyDay(date) {
  return {
    date,
    mvd: false,
    tasks: {},
    energyMorning: null,
    energyAfternoon: null,
    energyNight: null,
    bedtime: null,
    wakeTime: null,
    sleepQuality: null,
    gymStatus: null,
    gymSkipReason: null,
    learnAI: 0,
    learnSystemDesign: 0,
    learnDSA: 0,
    learnReading: 0,
    calledLovedOnes: false,
    skincareMorning: false,
    skincareNight: false,
    doomMinutes: 0,
    doomTrigger: null,
    doomReplacement: null,
    note: null,
    updatedAt: Date.now(),
    dirty: 0,
  }
}

export async function getDay(date) {
  const row = await db.days.get(date)
  return row || emptyDay(date)
}

// Local edit: merge fields, stamp updatedAt, mark dirty so the sync engine
// pushes it. Returns the new row.
export async function patchDay(date, patch) {
  const current = await getDay(date)
  const next = { ...current, ...patch, date, updatedAt: Date.now(), dirty: 1 }
  await db.days.put(next)
  // Fire-and-forget push; harmless when sync is disabled.
  notifyLocalChange()
  return next
}

export async function getRange(startDate, endDate) {
  return db.days.where('date').between(startDate, endDate, true, true).toArray()
}

// ---- Sync helpers (used by lib/sync.js) ----

export async function getDirtyDays() {
  return db.days.where('dirty').equals(1).toArray()
}

export async function markClean(date, updatedAt) {
  const row = await db.days.get(date)
  if (row && row.updatedAt === updatedAt) {
    await db.days.update(date, { dirty: 0 })
  }
}

// Apply a row coming FROM the server. Last-write-wins by updatedAt: only
// overwrite local if the remote is newer. Written as clean (dirty: 0).
export async function applyRemoteDay(remote) {
  const local = await db.days.get(remote.date)
  if (!local || remote.updatedAt > local.updatedAt) {
    await db.days.put({ ...remote, dirty: 0 })
    return true
  }
  return false
}

export async function clearAllDays() {
  await db.days.clear()
}

// ---- Backup ----

export async function exportAll() {
  const rows = await db.days.toArray()
  const clean = rows.map(({ dirty, ...r }) => r)
  return JSON.stringify({ app: 'routine-tracker', version: 2, exportedAt: Date.now(), days: clean }, null, 2)
}

export async function importAll(json) {
  const data = JSON.parse(json)
  if (!data || !Array.isArray(data.days)) throw new Error('Invalid backup file')
  // Imported rows are treated as local edits so they get pushed to sync too.
  const rows = data.days.map((d) => ({ ...d, dirty: 1 }))
  await db.days.bulkPut(rows)
  notifyLocalChange()
  return rows.length
}

// ---- tiny event bus so the sync engine can react to local writes ----

const listeners = new Set()
export function onLocalChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
function notifyLocalChange() {
  for (const fn of listeners) fn()
}
