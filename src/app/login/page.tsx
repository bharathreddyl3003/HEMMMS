"use client"

import { useState, useActionState } from 'react'
import { loginUser } from './actions'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginUser, { error: '' })
  const [showPassword, setShowPassword] = useState(false)

  return (
    <main style={{
      minBlockSize: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2rem',
        borderTop: '2px solid rgba(56, 189, 248, 0.55)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            margin: '0 auto 0.85rem',
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.22), rgba(245, 158, 11, 0.18))',
            border: '1px solid rgba(56, 189, 248, 0.45)',
            color: '#38bdf8',
            boxShadow: '0 0 24px rgba(56, 189, 248, 0.22)'
          }} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h1 className="nav-logo" style={{ fontSize: '2.1rem', marginBottom: '0.3rem' }}>HEMMMS</h1>
          <p className="text-sm" style={{ margin: 0 }}>
            Heavy Earth Moving Machinery Telemetry &amp; Maintenance
          </p>
        </div>

        {state?.error && (
          <div role="alert" className="badge danger mb-4" style={{ display: 'block', textAlign: 'center', padding: '0.6rem', textTransform: 'none' }}>
            {state.error}
          </div>
        )}

        <form action={formAction}>
          <div>
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              name="username"
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="next"
              required
              autoFocus
              placeholder="Enter operator or admin ID"
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.38rem' }}>
              <label htmlFor="login-password" style={{ margin: 0 }}>Password</label>
              <button
                type="button"
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(prev => !prev)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0.15rem 0.35rem'
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              enterKeyHint="done"
              required
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary mt-2"
            style={{ width: '100%', minBlockSize: '44px', fontSize: '0.95rem' }}
            disabled={isPending}
          >
            {isPending ? 'Signing in...' : 'Sign In to Fleet Command'}
          </button>
        </form>
      </div>
    </main>
  )
}
