import { useSync } from '../lib/SyncContext.jsx'

const LABELS = {
  local: { dot: '#97a0ad', text: 'Local only' },
  syncing: { dot: '#e0b15a', text: 'Syncing…' },
  synced: { dot: '#3ecf9b', text: 'Synced' },
  offline: { dot: '#97a0ad', text: 'Offline' },
  error: { dot: '#e06a5a', text: 'Sync error' },
}

export default function SyncBadge() {
  const { status } = useSync()
  const s = LABELS[status] || LABELS.local
  return (
    <span className="sync-badge" title={s.text}>
      <i style={{ background: s.dot }} />
      {s.text}
    </span>
  )
}
