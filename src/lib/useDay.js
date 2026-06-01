import { useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getDay, patchDay, emptyDay } from '../db/db.js'

// Live-load a single day's record. useLiveQuery re-runs whenever the underlying
// Dexie data changes — including writes made by the sync engine when a remote
// device updates the same day — so the UI stays in lockstep automatically.
export function useDay(dateKey) {
  const day = useLiveQuery(() => getDay(dateKey), [dateKey])
  const loaded = day !== undefined

  const update = useCallback(
    (patch) => { patchDay(dateKey, patch) },
    [dateKey]
  )

  const toggleTask = useCallback(
    async (taskId) => {
      const current = await getDay(dateKey)
      const tasks = { ...current.tasks }
      if (tasks[taskId]) delete tasks[taskId]
      else tasks[taskId] = true
      await patchDay(dateKey, { tasks })
    },
    [dateKey]
  )

  return { day: day || emptyDay(dateKey), loaded, update, toggleTask }
}
