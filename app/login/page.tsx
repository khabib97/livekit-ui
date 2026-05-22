'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/api'
import { useBranding } from '@/lib/branding'

export default function LoginPage() {
  const branding = useBranding()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const user = getCurrentUser()
    if (user) { window.location.href = '/dashboard' }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? 'Login failed')
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)

      window.location.href = '/dashboard'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const primaryColor = branding?.primary_color ?? '#2563eb'

  return (
    <div style={page}>
      <div style={card}>
        {branding ? (
          <>
            {branding.logo_url && (
              <img src={branding.logo_url} alt={branding.name} style={{ maxHeight: 48, marginBottom: '1rem', borderRadius: 4 }} />
            )}
            <h1 style={{ ...heading, color: '#fff' }}>Sign in to {branding.name}</h1>
          </>
        ) : (
          <h1 style={heading}>Sign in</h1>
        )}

        <form onSubmit={handleSubmit} style={form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            style={input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={input}
          />
          {error && <p style={errorStyle}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ ...btnBase, background: primaryColor, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {!branding && (
          <p style={footer}>
            Want to create a workspace?{' '}
            <a href="/signup" style={link}>Register your company</a>
          </p>
        )}
      </div>
    </div>
  )
}

const page: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', background: '#111',
}
const card: React.CSSProperties = {
  background: '#1e1e1e', borderRadius: '12px', padding: '2rem',
  width: '100%', maxWidth: '380px', border: '1px solid #2a2a2a',
}
const heading: React.CSSProperties = {
  color: '#fff', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1.5rem',
}
const form: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.75rem' }
const input: React.CSSProperties = {
  padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #333',
  background: '#2a2a2a', color: '#fff', fontSize: '1rem', outline: 'none',
}
const errorStyle: React.CSSProperties = { color: '#f87171', fontSize: '0.875rem', margin: 0 }
const btnBase: React.CSSProperties = {
  padding: '0.75rem', borderRadius: '8px', border: 'none',
  color: '#fff', fontSize: '1rem', fontWeight: 500,
}
const footer: React.CSSProperties = {
  color: '#6b7280', fontSize: '0.875rem', marginTop: '1.25rem', textAlign: 'center',
}
const link: React.CSSProperties = { color: '#60a5fa', textDecoration: 'none' }
