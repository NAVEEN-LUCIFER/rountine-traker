import { useState } from 'react'
import { useSync } from '../lib/SyncContext.jsx'

export default function Login() {
  const { signIn, signUp } = useSync()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
      } else {
        await signUp(email.trim(), password)
        setMsg('Account created. If email confirmation is on, check your inbox, then sign in.')
        setMode('signin')
      }
    } catch (err) {
      setMsg(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app">
      <div style={{ height: 'max(48px, env(safe-area-inset-top))' }} />
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 40 }}>✶</div>
        <h1 style={{ margin: '6px 0 2px', fontSize: 22 }}>Routine</h1>
        <p className="hint">Sign in so your days sync across your phone, tablet and laptop.</p>
      </div>

      <form className="card" onSubmit={submit}>
        <h2>{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
        <div className="field">
          <label>Email</label>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="at least 6 characters"
          />
        </div>
        <button type="submit" className="primary-btn" disabled={busy} style={{ marginTop: 14 }}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
        {msg && <p className="hint" style={{ marginTop: 10, color: 'var(--warn)' }}>{msg}</p>}
        <p className="hint" style={{ marginTop: 14, textAlign: 'center' }}>
          {mode === 'signin' ? 'No account yet?' : 'Already have one?'}{' '}
          <button type="button" className="link-btn" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMsg('') }}>
            {mode === 'signin' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </form>
    </div>
  )
}
