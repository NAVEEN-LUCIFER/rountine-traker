import { useState } from 'react'
import { useSync } from '../lib/SyncContext.jsx'

// Calm, branded sign-in matching the app theme.
// Three ways in: Google OAuth, magic link (passwordless email), or email+password.
export default function Login() {
  const { signIn, signUp, signInWithGoogle, signInWithMagicLink } = useSync()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'magic'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgKind, setMsgKind] = useState('err') // 'err' | 'ok'

  function say(text, kind = 'err') {
    setMsg(text)
    setMsgKind(kind)
  }

  async function handleEmailSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
      } else if (mode === 'signup') {
        await signUp(email.trim(), password)
        say('Account created. If confirmation is on, check your inbox, then sign in.', 'ok')
        setMode('signin')
      } else if (mode === 'magic') {
        await signInWithMagicLink(email.trim())
        say('Magic link sent — check your email and tap it to sign in.', 'ok')
      }
    } catch (err) {
      say(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setBusy(true)
    setMsg('')
    try {
      await signInWithGoogle() // redirects away to Google
    } catch (err) {
      say(err.message || 'Google sign-in failed.')
      setBusy(false)
    }
  }

  const title = mode === 'signup' ? 'Create your account' : mode === 'magic' ? 'Sign in with a link' : 'Welcome back'

  return (
    <div className="app login-wrap">
      <style>{`
        .login-wrap { display: flex; flex-direction: column; justify-content: center; min-height: 100dvh; }
        .login-hero { text-align: center; margin-bottom: 22px; }
        .login-mark {
          width: 64px; height: 64px; margin: 0 auto 14px; border-radius: 20px;
          display: grid; place-items: center; font-size: 30px;
          background: var(--accent-soft); border: 1px solid var(--accent); color: var(--accent);
        }
        .login-hero h1 { margin: 0 0 4px; font-size: 24px; font-weight: 700; }
        .login-hero p { margin: 0; color: var(--muted); font-size: 14px; }
        .oauth-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
          background: #fff; color: #1f1f1f; border: none; border-radius: 12px;
          padding: 12px; font-size: 15px; font-weight: 600; cursor: pointer;
        }
        .oauth-btn:disabled { opacity: .6; cursor: default; }
        .divider { display: flex; align-items: center; gap: 12px; color: var(--muted); font-size: 12px; margin: 16px 0; }
        .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: var(--line); }
        .login-toggle-row { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; gap: 8px; flex-wrap: wrap; }
        .login-msg { margin-top: 12px; font-size: 13px; }
        .login-msg.ok { color: var(--accent); }
        .login-msg.err { color: var(--warn); }
      `}</style>

      <div className="login-hero">
        <div className="login-mark">✶</div>
        <h1>{title}</h1>
        <p>Your routine, synced across all your devices.</p>
      </div>

      <div className="card">
        <button className="oauth-btn" onClick={handleGoogle} disabled={busy}>
          <GoogleIcon /> Continue with Google
        </button>

        <div className="divider">or</div>

        <form onSubmit={handleEmailSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {mode !== 'magic' && (
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
          )}

          <button type="submit" className="primary-btn" disabled={busy} style={{ marginTop: 14 }}>
            {busy
              ? 'Please wait…'
              : mode === 'signin'
                ? 'Sign in'
                : mode === 'signup'
                  ? 'Create account'
                  : 'Email me a magic link'}
          </button>
        </form>

        {msg && <p className={`login-msg ${msgKind}`}>{msg}</p>}

        <div className="login-toggle-row">
          {mode === 'magic' ? (
            <button type="button" className="link-btn" onClick={() => { setMode('signin'); setMsg('') }}>
              Use a password instead
            </button>
          ) : (
            <button type="button" className="link-btn" onClick={() => { setMode('magic'); setMsg('') }}>
              Email me a magic link
            </button>
          )}
          <button
            type="button"
            className="link-btn"
            onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMsg('') }}
          >
            {mode === 'signup' ? 'Have an account? Sign in' : 'New here? Create account'}
          </button>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  )
}
