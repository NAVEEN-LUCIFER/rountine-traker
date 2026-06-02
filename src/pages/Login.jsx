import { useState } from 'react'
import { useSync } from '../lib/SyncContext.jsx'

// Sleek dark sign-in: pill toggle, glassy inputs, aurora glow.
// Auth methods: email+password, magic link (passwordless), Google OAuth.
export default function Login() {
  const { signIn, signUp, signInWithGoogle, signInWithMagicLink } = useSync()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'magic'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgKind, setMsgKind] = useState('err')

  const say = (text, kind = 'err') => { setMsg(text); setMsgKind(kind) }
  const switchMode = (m) => { setMode(m); setMsg('') }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true); setMsg('')
    try {
      if (mode === 'signin') await signIn(email.trim(), password)
      else if (mode === 'signup') {
        await signUp(email.trim(), password)
        say('Account created. If confirmation is on, check your inbox, then sign in.', 'ok')
        setMode('signin')
      } else {
        await signInWithMagicLink(email.trim())
        say('Magic link sent — check your email and tap it to sign in.', 'ok')
      }
    } catch (err) {
      say(err.message || 'Something went wrong.')
    } finally { setBusy(false) }
  }

  async function handleGoogle() {
    setBusy(true); setMsg('')
    try { await signInWithGoogle() }
    catch (err) { say(err.message || 'Google sign-in failed.'); setBusy(false) }
  }

  const heading = mode === 'signup' ? 'Create your account' : mode === 'magic' ? 'Sign in with a link' : 'Welcome back'
  const cta = busy ? 'Please wait…'
    : mode === 'signup' ? 'Create account'
      : mode === 'magic' ? 'Email me a magic link'
        : 'Sign in'

  return (
    <div className="app login2">
      <style>{`
        .login2 { position: relative; display: flex; flex-direction: column; justify-content: center; min-height: 100dvh; overflow: hidden; }
        .login2 .aurora {
          position: fixed; inset: -20% -10% auto -10%; height: 70vh; z-index: 0; pointer-events: none;
          background:
            radial-gradient(40% 50% at 20% 30%, rgba(62,207,155,.22), transparent 70%),
            radial-gradient(45% 55% at 80% 20%, rgba(106,169,255,.20), transparent 70%),
            radial-gradient(40% 50% at 60% 70%, rgba(199,155,255,.16), transparent 70%);
          filter: blur(30px);
        }
        .auth-card {
          position: relative; z-index: 1;
          background: rgba(23,26,33,.72);
          backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 24px; padding: 22px;
          box-shadow: 0 30px 80px rgba(0,0,0,.45);
        }
        .seg-pill { display: inline-flex; background: var(--surface-2); border-radius: 999px; padding: 4px; margin-bottom: 18px; }
        .seg-pill button { border: none; background: none; color: var(--muted); font-size: 14px; font-weight: 600; padding: 8px 18px; border-radius: 999px; cursor: pointer; }
        .seg-pill button.on { background: var(--bg); color: var(--text); box-shadow: 0 1px 4px rgba(0,0,0,.4); }
        .auth-card h1 { margin: 0 0 18px; font-size: 22px; font-weight: 700; letter-spacing: -.01em; }
        .in-wrap { position: relative; margin-bottom: 12px; }
        .in-wrap svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--muted); }
        .login2 input {
          width: 100%; box-sizing: border-box;
          background: rgba(255,255,255,.04);
          border: 1px solid var(--line); border-radius: 12px;
          color: var(--text); font-size: 15px; font-family: inherit;
          padding: 13px 14px 13px 42px;
        }
        .login2 input::placeholder { color: var(--muted); }
        .login2 input:focus { outline: none; border-color: var(--accent); background: rgba(62,207,155,.06); }
        .cta { width: 100%; margin-top: 4px; background: var(--accent); color: #08231a; border: none; border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 700; cursor: pointer; }
        .cta:disabled { opacity: .6; cursor: default; }
        .divider2 { display: flex; align-items: center; gap: 12px; color: var(--muted); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; margin: 18px 0; }
        .divider2::before, .divider2::after { content: ""; flex: 1; height: 1px; background: var(--line); }
        .oauth-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; background: rgba(255,255,255,.05); color: var(--text); border: 1px solid var(--line); border-radius: 12px; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .oauth-btn:hover { background: rgba(255,255,255,.09); }
        .oauth-btn:disabled { opacity: .6; cursor: default; }
        .auth-foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
        .auth-msg { margin: 12px 0 0; font-size: 13px; }
        .auth-msg.ok { color: var(--accent); } .auth-msg.err { color: var(--warn); }
        .terms { margin: 16px 0 0; text-align: center; color: var(--muted); font-size: 11px; line-height: 1.5; }
      `}</style>

      <div className="aurora" />

      <div className="auth-card">
        <div className="seg-pill">
          <button className={mode === 'signup' ? 'on' : ''} onClick={() => switchMode('signup')}>Sign up</button>
          <button className={mode !== 'signup' ? 'on' : ''} onClick={() => switchMode('signin')}>Sign in</button>
        </div>

        <h1>{heading}</h1>

        <form onSubmit={handleSubmit}>
          <div className="in-wrap">
            <MailIcon />
            <input type="email" autoComplete="email" required placeholder="Enter your email"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          {mode !== 'magic' && (
            <div className="in-wrap">
              <LockIcon />
              <input type="password" required minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder="Password (min 6 characters)"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}

          <button type="submit" className="cta" disabled={busy}>{cta}</button>
        </form>

        {msg && <p className={`auth-msg ${msgKind}`}>{msg}</p>}

        <div className="divider2">or continue with</div>

        <button className="oauth-btn" onClick={handleGoogle} disabled={busy}>
          <GoogleIcon /> Google
        </button>

        <div className="auth-foot">
          {mode === 'magic'
            ? <button type="button" className="link-btn" onClick={() => switchMode('signin')}>Use a password instead</button>
            : <button type="button" className="link-btn" onClick={() => switchMode('magic')}>Email me a magic link</button>}
        </div>

        <p className="terms">Private to you — your data syncs across your own devices.</p>
      </div>
    </div>
  )
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
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
