'use client'

import { useState, useEffect } from 'react'

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(window.atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

export default function StaffLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('staff_access_token')
    if (!token) return
    const payload = parseJwt(token)
    const user = (payload as any)?.context?.user
    if (!user?.staff_role) return
    redirectByRole(user.staff_role)
  }, [])

  function redirectByRole(role: string) {
    if (role === 'superadmin') window.location.href = '/admin/tenants'
    else if (role === 'ops') window.location.href = '/ops/tenants'
    else window.location.href = '/support/tenants'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? 'Login failed')
      localStorage.setItem('staff_access_token', data.access_token)
      localStorage.setItem('staff_refresh_token', data.refresh_token)

      const payload = parseJwt(data.access_token)
      const user = (payload as any)?.context?.user
      redirectByRole(user?.staff_role ?? 'support')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={page}>
      <div style={card}>
        <div style={logo}>⚙️</div>
        <h1 style={heading}>Staff Portal</h1>
        <p style={sub}>Sign in with your staff account</p>

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
          <button type="submit" disabled={loading} style={{ ...btn, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

const page: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', background: '#0f0f0f',
}
const card: React.CSSProperties = {
  background: '#1a1a1a', borderRadius: '12px', padding: '2.5rem 2rem',
  width: '100%', maxWidth: '360px', border: '1px solid #2a2a2a', textAlign: 'center',
}
const logo: React.CSSProperties = { fontSize: '2.5rem', marginBottom: '0.5rem' }
const heading: React.CSSProperties = { color: '#fff', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem' }
const sub: React.CSSProperties = { color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1.5rem' }
const form: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }
const input: React.CSSProperties = {
  padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #333',
  background: '#242424', color: '#fff', fontSize: '1rem', outline: 'none', width: '100%', boxSizing: 'border-box',
}
const errorStyle: React.CSSProperties = { color: '#f87171', fontSize: '0.875rem', margin: 0 }
const btn: React.CSSProperties = {
  padding: '0.75rem', borderRadius: '8px', border: 'none',
  background: '#7c3aed', color: '#fff', fontSize: '1rem', fontWeight: 600,
}
