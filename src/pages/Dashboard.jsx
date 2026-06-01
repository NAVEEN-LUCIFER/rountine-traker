import { useLiveQuery } from 'dexie-react-hooks'
import { getRange, getDay } from '../db/db.js'
import { todayKey, lastNDays, weekKeys, addDays, sleepMinutes, fmtDuration, prettyDate } from '../lib/date.js'
import { summarize, byKey, dayEnergy, dayCompletion } from '../lib/stats.js'
import SyncBadge from '../components/SyncBadge.jsx'

export default function Dashboard() {
  const t = todayKey()
  const rows = useLiveQuery(() => getRange(addDays(t, -29), t), [t], [])
  const today = useLiveQuery(() => getDay(t), [t], null)

  const byk = byKey(rows || [])
  const last7 = lastNDays(t, 7)
  const last30 = lastNDays(t, 30)
  const week = weekKeys(t)

  const week7 = summarize(last7.map((k) => byk[k]).filter(Boolean))
  const thisWeek = summarize(week.map((k) => byk[k]).filter(Boolean))
  const lastNight = today ? sleepMinutes(today.bedtime, today.wakeTime) : null

  return (
    <>
      <header className="header">
        <div className="header-row">
          <div>
            <div className="date">Dashboard</div>
            <div className="sub">last 7 days</div>
          </div>
          <SyncBadge />
        </div>
      </header>

      {/* Today completion */}
      <section className="card">
        <h2>Today</h2>
        <div className="ring-wrap">
          <Ring pct={today ? dayCompletion(today) : 0} />
          <div>
            <div className="stat-sub">{today && today.mvd ? 'Minimum viable day' : 'Routine complete'}</div>
            <div className="stat-sub" style={{ marginTop: 4 }}>{prettyDate(t)}</div>
          </div>
        </div>
      </section>

      {/* Sleep */}
      <section className="card">
        <h2>Sleep</h2>
        <div className="row-between">
          <div>
            <div className="stat-num">{fmtDuration(week7.avgSleep)}</div>
            <div className="stat-sub">7-day average</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="stat-num">{fmtDuration(lastNight)}</div>
            <div className="stat-sub">last night</div>
          </div>
        </div>
        <Spark values={last7.map((k) => sleepMinutes(byk[k]?.bedtime, byk[k]?.wakeTime))} target={7 * 60} unit="h" toDisplay={(v) => (v / 60)} />
      </section>

      {/* Gym consistency */}
      <section className="card">
        <h2>Gym — last 7 days</h2>
        <div className="dots">
          {last7.map((k) => {
            const st = byk[k]?.gymStatus
            const cls = st === 'done' ? 'done' : st === 'skipped' ? 'skip' : st === 'rest' ? 'rest' : ''
            const wd = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(`${k}T00:00:00`).getDay()]
            return <span key={k} className={`dot-day ${cls}`}>{wd}</span>
          })}
        </div>
        <div className="stat-sub" style={{ marginTop: 10 }}>
          {week7.gymDone} done · {week7.gymSkipped} skipped · {week7.gymRest} rest (30-day: {summarize(last30.map((k)=>byk[k]).filter(Boolean)).gymDone} sessions)
        </div>
      </section>

      {/* Learning this week */}
      <section className="card">
        <h2>Learning this week (min)</h2>
        <LearnBars week={week} byk={byk} />
        <div className="stat-sub" style={{ marginTop: 10 }}>Total {thisWeek.learn.total} min</div>
      </section>

      {/* Doom scrolling */}
      <section className="card">
        <h2>Doom scrolling — 7 days</h2>
        <div className="stat-num">{week7.doomTotal}<span style={{ fontSize: 16, color: 'var(--muted)' }}> min</span></div>
        <div className="stat-sub">lower is calmer — shown without judgment</div>
        <Spark values={last7.map((k) => byk[k]?.doomMinutes ?? null)} invert unit="m" toDisplay={(v) => v} />
      </section>

      {/* Energy trend */}
      <section className="card">
        <h2>Energy — 7 days</h2>
        <Spark values={last7.map((k) => (byk[k] ? dayEnergy(byk[k]) : null))} max={5} unit="" toDisplay={(v) => v} />
        <div className="stat-sub" style={{ marginTop: 8 }}>average across morning / afternoon / night</div>
      </section>

      <div style={{ height: 8 }} />
    </>
  )
}

function Ring({ pct }) {
  const r = 30, c = 2 * Math.PI * r
  const off = c * (1 - pct / 100)
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--accent)" strokeWidth="8"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform="rotate(-90 40 40)" />
      <text x="40" y="46" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text)">{pct}%</text>
    </svg>
  )
}

function LearnBars({ week, byk }) {
  // Stacked bars per day across the week.
  const cats = [
    ['ai', 'learnAI'], ['sd', 'learnSystemDesign'], ['dsa', 'learnDSA'], ['read', 'learnReading'],
  ]
  const totals = week.map((k) => {
    const d = byk[k] || {}
    return cats.reduce((a, [, f]) => a + (d[f] || 0), 0)
  })
  const maxT = Math.max(60, ...totals)
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  return (
    <>
      <div className="bars">
        {week.map((k, i) => {
          const d = byk[k] || {}
          return (
            <div className="bar-col" key={k}>
              <div style={{ width: '100%', maxWidth: 26, display: 'flex', flexDirection: 'column-reverse', height: '100%', justifyContent: 'flex-start' }}>
                {cats.map(([cls, f]) => {
                  const v = d[f] || 0
                  if (!v) return null
                  return <div key={cls} className={`bar stack-${cls}`} style={{ height: `${(v / maxT) * 100}%`, borderRadius: 0 }} />
                })}
              </div>
              <span className="bar-label">{dayLabels[i]}</span>
            </div>
          )
        })}
      </div>
      <div className="legend">
        <span><i style={{ background: '#3ecf9b' }} />AI</span>
        <span><i style={{ background: '#6aa9ff' }} />Sys Design</span>
        <span><i style={{ background: '#c79bff' }} />DSA</span>
        <span><i style={{ background: '#e0b15a' }} />Reading</span>
      </div>
    </>
  )
}

// Simple SVG sparkline. `invert` shades higher as warmer (for doom scroll).
function Spark({ values, max, target, unit, toDisplay, invert }) {
  const nums = values.map((v) => (v == null ? null : toDisplay(v)))
  const present = nums.filter((v) => v != null)
  const top = max || Math.max(target ? target / 60 : 0, ...present, 1)
  const w = 280, h = 50, pad = 4
  const step = present.length > 1 ? (w - pad * 2) / (values.length - 1) : 0
  const pts = nums.map((v, i) => {
    const x = pad + i * step
    const y = v == null ? null : h - pad - (v / top) * (h - pad * 2)
    return { x, y }
  })
  const line = pts.filter((p) => p.y != null).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const color = invert ? 'var(--warn)' : 'var(--accent)'
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {target && (
        <line x1={pad} x2={w - pad} y1={h - pad - (target / 60 / top) * (h - pad * 2)} y2={h - pad - (target / 60 / top) * (h - pad * 2)} stroke="var(--line)" strokeDasharray="3 3" />
      )}
      {line && <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map((p, i) => p.y != null && <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />)}
    </svg>
  )
}
