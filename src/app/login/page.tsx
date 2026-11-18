"use client"

import { useActionState } from 'react'
import { loginUser } from './actions'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginUser, { error: '' })

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="nav-logo" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>HEMMMS</h1>
          <p className="text-sm">Sign in to your account</p>
        </div>

        {state?.error && (
          <div className="badge danger mb-4" style={{ display: 'block', textAlign: 'center', padding: '0.5rem' }}>
            {state.error}
          </div>
        )}

        <form action={formAction}>
          <label>Username</label>
          <input type="text" name="username" required autoFocus />

          <label>Password</label>
          <input type="password" name="password" required />

          <button type="submit" className="btn btn-primary mt-4" style={{ width: '100%' }} disabled={isPending}>
            {isPending ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
