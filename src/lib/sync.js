import { supabase, syncEnabled } from '../db/supabase.js'
import {
  getDirtyDays, markClean, applyRemoteDay, onLocalChange, db,
} from '../db/db.js'

// Offline-first sync engine.
//   - Local writes go to Dexie immediately (dirty=1). We push dirty rows up.
//   - We pull rows changed since a per-user watermark, and subscribe to realtime
//     so other devices' changes arrive live.
//   - Conflict resolution: last-write-wins by `updatedAt` (epoch ms), per day.
//
// Status values: 'local' | 'syncing' | 'synced' | 'offline' | 'error'

let status = syncEnabled ? 'syncing' : 'local'
let userId = null
let channel = null
let unsubLocal = null
let pushTimer = null
const statusListeners = new Set()

function setStatus(s) {
  status = s
  for (const fn of statusListeners) fn(s)
}

export function getStatus() {
  return status
}
export function onStatus(fn) {
  statusListeners.add(fn)
  fn(status)
  return () => statusListeners.delete(fn)
}

function watermarkKey(uid) {
  return `rt:lastPull:${uid}`
}
function getWatermark(uid) {
  return Number(localStorage.getItem(watermarkKey(uid)) || 0)
}
function setWatermark(uid, v) {
  localStorage.setItem(watermarkKey(uid), String(v))
}

// Strip local-only fields before sending to the server.
function toRemoteData(row) {
  const { dirty, updatedAt, date, ...data } = row
  return data
}
function fromRemoteRow(r) {
  // r = { date, data, updated_at }
  return { ...r.data, date: r.date, updatedAt: Number(r.updated_at) }
}

export async function startSync(session) {
  if (!syncEnabled || !session?.user) return
  userId = session.user.id
  setStatus('syncing')
  try {
    await pullAll()
    await pushDirty()
    subscribeRealtime()
    unsubLocal = onLocalChange(schedulePush)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', () => setStatus('offline'))
    setStatus(navigator.onLine ? 'synced' : 'offline')
  } catch (e) {
    console.error('sync start failed', e)
    setStatus(navigator.onLine ? 'error' : 'offline')
  }
}

export function stopSync() {
  if (channel) { supabase.removeChannel(channel); channel = null }
  if (unsubLocal) { unsubLocal(); unsubLocal = null }
  window.removeEventListener('online', handleOnline)
  userId = null
  setStatus(syncEnabled ? 'syncing' : 'local')
}

async function handleOnline() {
  if (!userId) return
  setStatus('syncing')
  try {
    await pullAll()
    await pushDirty()
    setStatus('synced')
  } catch {
    setStatus('error')
  }
}

// Pull every row changed since our watermark (first run: everything).
async function pullAll() {
  if (!userId) return
  const since = getWatermark(userId)
  const { data, error } = await supabase
    .from('days')
    .select('date, data, updated_at')
    .gt('updated_at', since)
    .order('updated_at', { ascending: true })
  if (error) throw error
  let maxSeen = since
  for (const r of data) {
    await applyRemoteDay(fromRemoteRow(r))
    maxSeen = Math.max(maxSeen, Number(r.updated_at))
  }
  if (maxSeen > since) setWatermark(userId, maxSeen)
}

function schedulePush() {
  clearTimeout(pushTimer)
  // Debounce: rapid one-tap edits coalesce into one round-trip.
  pushTimer = setTimeout(() => { pushDirty().catch(() => {}) }, 800)
}

async function pushDirty() {
  if (!userId) return
  if (!navigator.onLine) { setStatus('offline'); return }
  const dirty = await getDirtyDays()
  if (dirty.length === 0) {
    setStatus('synced')
    return
  }
  setStatus('syncing')
  const payload = dirty.map((row) => ({
    user_id: userId,
    date: row.date,
    data: toRemoteData(row),
    updated_at: row.updatedAt,
  }))
  const { error } = await supabase.from('days').upsert(payload, { onConflict: 'user_id,date' })
  if (error) { setStatus('error'); throw error }
  // Mark clean only if not edited again since (updatedAt unchanged).
  for (const row of dirty) await markClean(row.date, row.updatedAt)
  // Advance watermark so our own pushes don't echo back as pulls.
  const maxPushed = Math.max(getWatermark(userId), ...dirty.map((d) => d.updatedAt))
  setWatermark(userId, maxPushed)
  setStatus('synced')
}

function subscribeRealtime() {
  if (channel) supabase.removeChannel(channel)
  channel = supabase
    .channel('days-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'days', filter: `user_id=eq.${userId}` },
      async (payload) => {
        const r = payload.new
        if (!r || !r.date) return
        const applied = await applyRemoteDay(fromRemoteRow(r))
        if (applied) setWatermark(userId, Math.max(getWatermark(userId), Number(r.updated_at)))
      }
    )
    .subscribe()
}

// Called on sign-out to forget this device's view of the watermark.
export function resetWatermark(uid) {
  if (uid) localStorage.removeItem(watermarkKey(uid))
}
