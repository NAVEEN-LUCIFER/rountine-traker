import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getRange, exportAll, importAll } from '../db/db.js'
import { todayKey, weekKeys, monthRange, monthLabel, prettyDate } from '../lib/date.js'
import { weeklyReview } from '../lib/weeklyReview.js'
import { workStats } from '../lib/stats.js'
import { useSync } from '../lib/SyncContext.jsx'
import SyncBadge from '../components/SyncBadge.jsx'

export default function Review() {
  const t = todayKey()
  const week = weekKeys(t)
  const [mStart, mEnd] = monthRange(t)
  const fileRef = useRef(null)
  const [msg, setMsg] = useState('')
  const { syncEnabled, user, signOut } = useSync()

  const rows = useLiveQuery(() => getRange(week[0], week[6]), [t], null)
  const monthRows = useLiveQuery(() => getRange(mStart, mEnd), [t], [])
  const review = rows ? weeklyReview(rows) : null
  const workMonth = workStats(monthRows || [])

  async function doExport() {
    const json = await exportAll()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `routine-backup-${t}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function doImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const n = await importAll(text)
      setMsg(`Imported ${n} days.`)
    } catch (err) {
      setMsg(`Import failed: ${err.message}`)
    }
  }

  return (
    <>
      <header className="header">
        <div className="header-row">
          <div>
            <div className="date">Weekly review</div>
            <div className="sub">{prettyDate(week[0])} – {prettyDate(week[6])}</div>
          </div>
          <SyncBadge />
        </div>
      </header>

      {!review ? (
        <div className="empty">Loading…</div>
      ) : (
        <>
          <section className="card">
            <div className="review-numbers">
              <div className="n"><b>{review.numbers.gym}</b><small>gym</small></div>
              <div className="n"><b>{review.numbers.sleep}</b><small>avg sleep</small></div>
              <div className="n"><b>{review.numbers.learning}</b><small>learning</small></div>
              <div className="n"><b>{review.numbers.work}</b><small>work shipped</small></div>
              <div className="n"><b>{review.numbers.doom}</b><small>doom</small></div>
              <div className="n"><b>{review.numbers.completionDays}</b><small>days logged</small></div>
            </div>

            <div className="review-section">
              <div className="t">What went well</div>
              <div className="b">{review.went.map((w, i) => <div key={i}>• {w}</div>)}</div>
            </div>
            <div className="review-section">
              <div className="t warn">What slipped</div>
              <div className="b">{review.slipped.map((w, i) => <div key={i}>• {w}</div>)}</div>
            </div>
            <div className="review-section">
              <div className="t">Main reason for misses</div>
              <div className="b">{review.reason}</div>
            </div>
            <div className="review-section">
              <div className="t">One adjustment for next week</div>
              <div className="b">{review.adjustment}</div>
            </div>
            <div className="review-section">
              <div className="t">Recommended focus</div>
              <div className="b">{review.focus}</div>
            </div>
          </section>

          <section className="card">
            <h2>{monthLabel(t)} so far</h2>
            <div className="row-between">
              <div>
                <div className="stat-num">{workMonth.done}</div>
                <div className="stat-sub">work tasks shipped this month</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="stat-num">{workMonth.activeDays}</div>
                <div className="stat-sub">active days</div>
              </div>
            </div>
            {workMonth.bestDay.date && (
              <div className="stat-sub" style={{ marginTop: 10 }}>
                Best day: {prettyDate(workMonth.bestDay.date)} — {workMonth.bestDay.count} shipped.
              </div>
            )}
          </section>

          <section className="card">
            <h2>Backup</h2>
            <p className="hint" style={{ marginBottom: 10 }}>
              {syncEnabled
                ? 'Your days sync to the cloud and across your devices. Export is a handy extra offline copy.'
                : 'Your data lives only on this device. Export a copy now and then so you never lose it.'}
            </p>
            <div className="seg">
              <button onClick={doExport}>Export JSON</button>
              <button onClick={() => fileRef.current?.click()}>Import JSON</button>
            </div>
            <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={doImport} />
            {msg && <p className="hint" style={{ marginTop: 10, color: 'var(--accent)' }}>{msg}</p>}
          </section>

          {syncEnabled && (
            <section className="card">
              <h2>Account</h2>
              <div className="row-between">
                <div>
                  <div style={{ fontSize: 14 }}>{user?.email}</div>
                  <div className="stat-sub">Signed in — syncing across devices</div>
                </div>
                <button className="ghost-btn" onClick={() => signOut()}>Sign out</button>
              </div>
            </section>
          )}
        </>
      )}

      <div style={{ height: 8 }} />
    </>
  )
}
