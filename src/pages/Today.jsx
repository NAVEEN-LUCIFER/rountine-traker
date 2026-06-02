import { useEffect, useState } from 'react'
import { useDay } from '../lib/useDay.js'
import { routineFor } from '../db/routine.js'
import { dayCompletion, workDoneCount } from '../lib/stats.js'
import { carryOverWork, newWorkId } from '../db/db.js'
import {
  todayKey, addDays, prettyDate, relativeLabel, isSunday,
  sleepMinutes, fmtDuration,
} from '../lib/date.js'
import SyncBadge from '../components/SyncBadge.jsx'

const ENERGY_FACES = ['😴', '😕', '😐', '🙂', '⚡']

export default function Today({ goReview }) {
  const [dateKey, setDateKey] = useState(todayKey())
  const { day, update, toggleTask } = useDay(dateKey)

  const items = routineFor(dateKey, day.mvd)
  const pct = dayCompletion(day)
  const sleep = sleepMinutes(day.bedtime, day.wakeTime)
  const isToday = dateKey === todayKey()

  // Roll unfinished work tasks forward into today, once.
  useEffect(() => {
    if (dateKey === todayKey()) carryOverWork(dateKey)
  }, [dateKey])

  return (
    <>
      <header className="header">
        <div className="header-row">
          <div className="date-nav">
            <button className="icon-btn" onClick={() => setDateKey((k) => addDays(k, -1))} aria-label="Previous day">‹</button>
            <div>
              <div className="date">{prettyDate(dateKey)}</div>
              <div className="sub">{relativeLabel(dateKey) || dateKey}</div>
            </div>
            <button
              className="icon-btn"
              onClick={() => setDateKey((k) => addDays(k, 1))}
              disabled={isToday}
              style={{ opacity: isToday ? 0.35 : 1 }}
              aria-label="Next day"
            >›</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <button className={`mvd-toggle ${day.mvd ? 'on' : ''}`} onClick={() => update({ mvd: !day.mvd })}>
              {day.mvd ? '✓ Min day' : 'Min day'}
            </button>
            <SyncBadge />
          </div>
        </div>

        <div className="progress-wrap">
          <div className="progress-label">
            <span>{day.mvd ? 'Minimum viable day' : 'Day progress'}</span>
            <span>{pct}%</span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        </div>
      </header>

      {isToday && isSunday(dateKey) && (
        <div className="banner" onClick={goReview}>✶ It's Sunday — your weekly review is ready. Tap to read it.</div>
      )}

      {day.mvd && (
        <p className="hint" style={{ marginTop: 12 }}>
          Tired day mode: just the essentials. Doing these is a full win.
        </p>
      )}

      {/* ROUTINE */}
      <section className="card">
        <h2>Routine</h2>
        {items.map((it) => {
          const done = !!day.tasks[it.id]
          return (
            <div key={it.id} className={`routine-row ${done ? 'done' : ''}`} onClick={() => toggleTask(it.id)}>
              <span className={`check ${done ? 'on' : ''}`} />
              <span className="routine-time">{it.time}</span>
              <span className="routine-label">
                {it.label}
                {it.sublabel && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{it.sublabel}</div>}
              </span>
              {it.growth && <span className="tag">growth</span>}
            </div>
          )
        })}
      </section>

      {/* WORK TODAY */}
      <WorkToday day={day} update={update} />

      {/* ENERGY */}
      <section className="card">
        <h2>Energy</h2>
        <Scale label="Morning" value={day.energyMorning} onPick={(v) => update({ energyMorning: v })} />
        <Scale label="Afternoon" value={day.energyAfternoon} onPick={(v) => update({ energyAfternoon: v })} />
        <Scale label="Night" value={day.energyNight} onPick={(v) => update({ energyNight: v })} />
      </section>

      {/* SLEEP */}
      <section className="card">
        <h2>Sleep</h2>
        <div className="time-row">
          <div className="field">
            <label>Bedtime</label>
            <input type="time" value={day.bedtime || ''} onChange={(e) => update({ bedtime: e.target.value || null })} />
          </div>
          <div className="field">
            <label>Wake</label>
            <input type="time" value={day.wakeTime || ''} onChange={(e) => update({ wakeTime: e.target.value || null })} />
          </div>
        </div>
        <div className="row-between" style={{ marginTop: 12 }}>
          <span className="stat-sub">Duration</span>
          <strong>{fmtDuration(sleep)}</strong>
        </div>
        <div className="scale-row" style={{ marginTop: 10 }}>
          <span className="lbl">Quality</span>
          <Faces value={day.sleepQuality} onPick={(v) => update({ sleepQuality: v })} faces={['😣', '😕', '😐', '🙂', '😌']} />
        </div>
      </section>

      {/* GYM */}
      <section className="card">
        <h2>Gym</h2>
        <div className="seg">
          {[['done', 'Done'], ['skipped', 'Skipped'], ['rest', 'Rest day']].map(([v, lbl]) => (
            <button
              key={v}
              className={`${day.gymStatus === v ? 'active' : ''} ${v === 'skipped' ? 'warn' : ''}`}
              onClick={() => update({ gymStatus: day.gymStatus === v ? null : v })}
            >{lbl}</button>
          ))}
        </div>
        {day.gymStatus === 'skipped' && (
          <div className="field">
            <label>What got in the way? (no judgment)</label>
            <input
              type="text"
              placeholder="e.g. slept in, sore, busy morning"
              value={day.gymSkipReason || ''}
              onChange={(e) => update({ gymSkipReason: e.target.value || null })}
            />
          </div>
        )}
      </section>

      {/* LEARNING */}
      <section className="card">
        <h2>Learning (minutes)</h2>
        <Learn name="AI Engineering" field="learnAI" day={day} update={update} />
        <Learn name="System Design" field="learnSystemDesign" day={day} update={update} />
        <Learn name="DSA" field="learnDSA" day={day} update={update} />
        <Learn name="Reading" field="learnReading" day={day} update={update} />
      </section>

      {/* DOOM SCROLLING */}
      <section className="card">
        <h2>Doom scrolling</h2>
        <div className="learn-row" style={{ borderTop: 'none', paddingTop: 0 }}>
          <span className="name">Minutes</span>
          <button className="chip minus" onClick={() => update({ doomMinutes: Math.max(0, (day.doomMinutes || 0) - 10) })}>−10</button>
          <button className="chip" onClick={() => update({ doomMinutes: (day.doomMinutes || 0) + 10 })}>+10</button>
          <button className="chip" onClick={() => update({ doomMinutes: (day.doomMinutes || 0) + 30 })}>+30</button>
          <span className="mins">{day.doomMinutes || 0}<span className="u"> m</span></span>
        </div>
        <div className="field">
          <label>Trigger (optional)</label>
          <input type="text" placeholder="e.g. post-lunch slump, bored" value={day.doomTrigger || ''} onChange={(e) => update({ doomTrigger: e.target.value || null })} />
        </div>
        <div className="field">
          <label>Did instead / will try (the win)</label>
          <input type="text" placeholder="e.g. 5-min walk, read, water" value={day.doomReplacement || ''} onChange={(e) => update({ doomReplacement: e.target.value || null })} />
        </div>
      </section>

      {/* NOTE */}
      <section className="card">
        <h2>One line about today</h2>
        <textarea rows={2} placeholder="optional" value={day.note || ''} onChange={(e) => update({ note: e.target.value || null })} />
      </section>

      <div style={{ height: 8 }} />
    </>
  )
}

function Scale({ label, value, onPick }) {
  return (
    <div className="scale-row">
      <span className="lbl">{label}</span>
      <Faces value={value} onPick={onPick} faces={ENERGY_FACES} />
    </div>
  )
}

function Faces({ value, onPick, faces }) {
  return (
    <div className="scale">
      {faces.map((f, i) => {
        const v = i + 1
        return (
          <button key={v} className={value === v ? 'active' : ''} onClick={() => onPick(value === v ? null : v)}>{f}</button>
        )
      })}
    </div>
  )
}

function Learn({ name, field, day, update }) {
  const val = day[field] || 0
  return (
    <div className="learn-row">
      <span className="name">{name}</span>
      <button className="chip minus" onClick={() => update({ [field]: Math.max(0, val - 15) })}>−15</button>
      <button className="chip" onClick={() => update({ [field]: val + 15 })}>+15</button>
      <button className="chip" onClick={() => update({ [field]: val + 30 })}>+30</button>
      <span className="mins">{val}<span className="u"> m</span></span>
    </div>
  )
}

function WorkToday({ day, update }) {
  const [text, setText] = useState('')
  const work = day.work || []
  const done = work.filter((t) => t.done).length

  function add() {
    const v = text.trim()
    if (!v) return
    update({ work: [...work, { id: newWorkId(), text: v, done: false }] })
    setText('')
  }
  const toggle = (id) => update({ work: work.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })
  const remove = (id) => update({ work: work.filter((t) => t.id !== id) })

  // Open tasks first, completed sink to the bottom.
  const sorted = [...work].sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0))

  return (
    <section className="card">
      <div className="row-between" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Work today</h2>
        <span className="stat-sub">{work.length ? `${done} of ${work.length} done` : 'celebrate what you ship'}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: work.length ? 12 : 0 }}>
        <input
          type="text"
          placeholder="Add a work task…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
        />
        <button
          className="chip"
          style={{ padding: '0 16px', background: 'var(--accent)', color: '#08231a', fontWeight: 700, border: 'none' }}
          onClick={add}
        >Add</button>
      </div>

      {sorted.map((t) => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 2px', borderTop: '1px solid var(--line)' }}>
          <span className={`check ${t.done ? 'on' : ''}`} onClick={() => toggle(t.id)} style={{ cursor: 'pointer' }} />
          <span
            onClick={() => toggle(t.id)}
            style={{ flex: 1, cursor: 'pointer', color: t.done ? 'var(--muted)' : 'var(--text)', textDecoration: t.done ? 'line-through' : 'none', textDecorationColor: 'var(--line)' }}
          >{t.text}</span>
          <button
            onClick={() => remove(t.id)}
            aria-label="Remove task"
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
          >×</button>
        </div>
      ))}
    </section>
  )
}
