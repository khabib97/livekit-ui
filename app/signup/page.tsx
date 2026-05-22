'use client'

import { useState } from 'react'

export default function SignupPage() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', company_name: '', subdomain: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/tenant/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        const detail = data.detail
        if (Array.isArray(detail)) {
          throw new Error(detail.map((d: { msg: string }) => d.msg).join(', '))
        }
        throw new Error(detail ?? 'Registration failed')
      }
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={page}>
        <div style={card}>
          <h1 style={heading}>Check your inbox</h1>
          <p style={{ color: '#9ca3af', lineHeight: 1.6 }}>
            We sent a verification link to <strong style={{ color: '#d1d5db' }}>{form.email}</strong>.
            Click the link in the email to verify your address. Once verified, an administrator
            will review and activate your account.
          </p>
          <a href="/login" style={{ ...link, display: 'block', marginTop: '1.5rem' }}>
            Back to sign in
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={page}>
      <div style={{ ...card, maxWidth: '440px' }}>
        <h1 style={heading}>Create your workspace</h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
          Register your company. After email verification an admin will activate your account.
        </p>

        <form onSubmit={handleSubmit} style={formStyle}>
          <label style={labelStyle}>Your name</label>
          <input placeholder="John Smith" value={form.name} onChange={set('name')} required style={input} />

          <label style={labelStyle}>Work email</label>
          <input type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} required style={input} />

          <label style={labelStyle}>Password</label>
          <input type="password" placeholder="Min 10 chars, 1 uppercase, 1 digit" value={form.password} onChange={set('password')} required style={input} />

          <label style={labelStyle}>Company name</label>
          <input placeholder="Acme Inc." value={form.company_name} onChange={set('company_name')} required style={input} />

          <label style={labelStyle}>Subdomain</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              placeholder="acme"
              value={form.subdomain}
              onChange={e => setForm(f => ({ ...f, subdomain: e.target.value.toLowerCase() }))}
              required
              style={{ ...input, flex: 1 }}
            />
            <span style={{ color: '#6b7280', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
              .{typeof window !== 'undefined' ? window.location.hostname.split('.').slice(1).join('.') || 'gomeeting.video' : 'gomeeting.video'}
            </span>
          </div>

          {error && <p style={errorStyle}>{error}</p>}

          <button type="submit" disabled={loading} style={submitBtn}>
            {loading ? 'Submitting…' : 'Register'}
          </button>
        </form>

        <p style={footerText}>
          Already have an account? <a href="/login" style={link}>Sign in</a>
        </p>
      </div>
    </div>
  )
}

const page: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', background: '#111', padding: '2rem',
}
const card: React.CSSProperties = {
  background: '#1e1e1e', borderRadius: '12px', padding: '2rem',
  width: '100%', border: '1px solid #2a2a2a',
}
const heading: React.CSSProperties = {
  color: '#fff', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem',
}
const formStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '0.5rem',
}
const labelStyle: React.CSSProperties = {
  color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.5rem',
}
const input: React.CSSProperties = {
  padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #333',
  background: '#2a2a2a', color: '#fff', fontSize: '1rem', outline: 'none', width: '100%',
  boxSizing: 'border-box',
}
const errorStyle: React.CSSProperties = { color: '#f87171', fontSize: '0.875rem', margin: 0 }
const submitBtn: React.CSSProperties = {
  padding: '0.75rem', borderRadius: '8px', border: 'none',
  background: '#2563eb', color: '#fff', fontSize: '1rem',
  cursor: 'pointer', marginTop: '0.75rem',
}
const footerText: React.CSSProperties = {
  color: '#6b7280', fontSize: '0.875rem', marginTop: '1.25rem', textAlign: 'center',
}
const link: React.CSSProperties = { color: '#60a5fa', textDecoration: 'none' }
