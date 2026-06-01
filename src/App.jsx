import { useState } from 'react'
import Today from './pages/Today.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Review from './pages/Review.jsx'
import Login from './pages/Login.jsx'
import { useSync } from './lib/SyncContext.jsx'

export default function App() {
  const [view, setView] = useState('today')
  const { syncEnabled, authReady, session } = useSync()

  // Sync configured but auth still resolving -> brief splash.
  if (syncEnabled && !authReady) {
    return <div className="app"><div className="empty">Loading…</div></div>
  }
  // Sync configured and signed out -> login gate.
  if (syncEnabled && !session) {
    return <Login />
  }

  return (
    <div className="app">
      {view === 'today' && <Today goReview={() => setView('review')} />}
      {view === 'dashboard' && <Dashboard />}
      {view === 'review' && <Review />}

      <nav className="nav">
        <button className={view === 'today' ? 'active' : ''} onClick={() => setView('today')}>
          <span className="ico">☑</span>Today
        </button>
        <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
          <span className="ico">▤</span>Dashboard
        </button>
        <button className={view === 'review' ? 'active' : ''} onClick={() => setView('review')}>
          <span className="ico">✶</span>Review
        </button>
      </nav>
    </div>
  )
}
