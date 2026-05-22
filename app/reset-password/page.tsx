'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useBranding } from '@/lib/branding'

function ResetPasswordContent() {
  const params = useSearchParams()
  const token = params.get('token')
  const branding = useBranding()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const primaryColor = branding?.primary_color ?? '#2563eb'

  useEffect(() => {
    if (!token) setError('Invalid or missing reset link. Please request a new one.')
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? 'Reset failed. The link may have expired.')
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={page}>
      <div style={card}>
        {branding?.logo_url && (
          <img src={branding.logo_url} alt={branding.name} style={logoStyle} />
        )}

        {done ? (
          <>
            <h1 style={{ ...heading, color: '#4ade80' }}>Password updated</h1>
            <p style={body}>Your password has been changed. You can now sign in with your new password.</p>
            <a href="/login" style={{ ...link, display: 'inline-block', marginTop: '1.25rem' }}>
              Sign in
            </a>
          </>
        ) : (
          <>
            <h1 style={heading}>Set new password</h1>
            <p style={body}>Choose a strong password — at least 10 characters with one uppercase letter and one digit.</p>

            <form onSubmit={handleSubmit} style={form}>
              <label style={label}>New password</label>
              <input
                type="password"
                placeholder="Min 10 chars, 1 uppercase, 1 digit"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoFocus
                disabled={!token}
                style={input}
              />

              <label style={label}>Confirm password</label>
              <input
                type="password"
                placeholder="Repeat your new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                disabled={!token}
                style={input}
              />

              {error && <p style={errStyle}>{error}</p>}

              <button
                type="submit"
                disabled={loading || !token}
                style={{ ...btn, background: !token ? '#374151' : primaryColor, cursor: loading || !token ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Saving…' : 'Set new password'}
              </button>
            </form>

            <p style={footer}>
              <a href="/forgot-password" style={link}>Request a new link</a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={page}><p style={{ color: '#888' }}>Loading…</p></div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}

const page: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', background: '#111', padding: '1.5rem',
}
const card: React.CSSProperties = {
  background: '#1e1e1e', borderRadius: '12px', padding: '2rem',
  width: '100%', maxWidth: '400px', border: '1px solid #2a2a2a',
}
const logoStyle: React.CSSProperties = { maxHeight: 40, maxWidth: 160, objectFit: 'contain', borderRadius: 4, marginBottom: '1.25rem', display: 'block' }
const heading: React.CSSProperties = { color: '#fff', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.5rem' }
const body: React.CSSProperties = { color: '#9ca3af', fontSize: '0.875rem', lineHeight: 1.6, margin: '0.25rem 0' }
const form: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1.25rem' }
const label: React.CSSProperties = { color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }
const input: React.CSSProperties = {
  padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #333',
  background: '#2a2a2a', color: '#fff', fontSize: '1rem', outline: 'none',
}
const errStyle: React.CSSProperties = { color: '#f87171', fontSize: '0.875rem', margin: 0 }
const btn: React.CSSProperties = {
  padding: '0.75rem', borderRadius: '8px', border: 'none',
  color: '#fff', fontSize: '1rem', fontWeight: 500, marginTop: '0.25rem',
}
const footer: React.CSSProperties = { color: '#6b7280', fontSize: '0.875rem', marginTop: '1.25rem', textAlign: 'center' }
const link: React.CSSProperties = { color: '#60a5fa', textDecoration: 'none' }
