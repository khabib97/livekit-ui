'use client'

import { useState } from 'react'
import { useBranding } from '@/lib/branding'

export default function ForgotPasswordPage() {
  const branding = useBranding()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const primaryColor = branding?.primary_color ?? '#2563eb'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      // Always show success — backend never reveals whether email exists
      if (!res.ok && res.status !== 200) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail ?? 'Something went wrong. Please try again.')
      }
      setSubmitted(true)
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

        {submitted ? (
          <>
            <h1 style={heading}>Check your inbox</h1>
            <p style={body}>
              If <strong style={{ color: '#d1d5db' }}>{email}</strong> is registered, you'll receive
              a password reset link within a few minutes.
            </p>
            <p style={body}>The link expires in 30 minutes.</p>
            <a href="/login" style={{ ...link, display: 'inline-block', marginTop: '1.25rem' }}>
              Back to sign in
            </a>
          </>
        ) : (
          <>
            <h1 style={heading}>Reset your password</h1>
            <p style={body}>
              Enter your account email and we'll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} style={form}>
              <label style={label}>Email address</label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                style={input}
              />
              {error && <p style={errStyle}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                style={{ ...btn, background: primaryColor, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <p style={footer}>
              Remember it? <a href="/login" style={link}>Sign in</a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

const page: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', background: '#111', padding: '1.5rem',
}
const card: React.CSSProperties = {
  background: '#1e1e1e', borderRadius: '12px', padding: '2rem',
  width: '100%', maxWidth: '380px', border: '1px solid #2a2a2a',
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
