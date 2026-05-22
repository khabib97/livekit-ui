'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

interface InviteInfo {
  company_name: string
  email: string
}

function InviteContent() {
  const params = useSearchParams()
  const token = params.get('token') ?? ''

  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) { setLoadError('Invalid invitation link.'); return }
    fetch(`/api/v1/invite/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.company_name) setInfo(d)
        else setLoadError(d.detail ?? 'Invitation not found or expired.')
      })
      .catch(() => setLoadError('Could not load invitation.'))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/invite/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        const detail = data.detail
        if (Array.isArray(detail)) throw new Error(detail.map((d: { msg: string }) => d.msg).join(', '))
        throw new Error(detail ?? 'Failed to accept invitation')
      }
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadError) {
    return (
      <div style={page}>
        <div style={{ ...card, textAlign: 'center' }}>
          <h1 style={{ ...heading, color: '#f87171' }}>Invalid Invitation</h1>
          <p style={muted}>{loadError}</p>
        </div>
      </div>
    )
  }

  if (!info) {
    return <div style={page}><p style={{ color: '#888' }}>Loading…</p></div>
  }

  if (done) {
    return (
      <div style={page}>
        <div style={{ ...card, textAlign: 'center' }}>
          <h1 style={{ ...heading, color: '#4ade80' }}>Welcome!</h1>
          <p style={muted}>Your account has been created. You can now sign in.</p>
          <a href="/login" style={link}>Sign in</a>
        </div>
      </div>
    )
  }

  return (
    <div style={page}>
      <div style={card}>
        <h1 style={heading}>Join {info.company_name}</h1>
        <p style={muted}>You were invited as <strong style={{ color: '#d1d5db' }}>{info.email}</strong>. Set up your account below.</p>

        <form onSubmit={handleSubmit} style={formStyle}>
          <input
            placeholder="Your full name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
            style={input}
          />
          <input
            type="password"
            placeholder="Password (min 10 chars, 1 uppercase, 1 digit)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={input}
          />
          {error && <p style={errorStyle}>{error}</p>}
          <button type="submit" disabled={submitting} style={submitBtn}>
            {submitting ? 'Creating account…' : 'Accept Invitation'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#111' }}><p style={{ color: '#888' }}>Loading…</p></div>}>
      <InviteContent />
    </Suspense>
  )
}

const page: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', background: '#111', padding: '2rem',
}
const card: React.CSSProperties = {
  background: '#1e1e1e', borderRadius: '12px', padding: '2rem',
  width: '100%', maxWidth: '400px', border: '1px solid #2a2a2a',
}
const heading: React.CSSProperties = { color: '#fff', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }
const muted: React.CSSProperties = { color: '#9ca3af', fontSize: '0.875rem', margin: '0 0 1.25rem' }
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.75rem' }
const input: React.CSSProperties = {
  padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #333',
  background: '#2a2a2a', color: '#fff', fontSize: '1rem', outline: 'none',
}
const errorStyle: React.CSSProperties = { color: '#f87171', fontSize: '0.875rem', margin: 0 }
const submitBtn: React.CSSProperties = {
  padding: '0.75rem', borderRadius: '8px', border: 'none',
  background: '#2563eb', color: '#fff', fontSize: '1rem', cursor: 'pointer',
}
const link: React.CSSProperties = {
  color: '#60a5fa', textDecoration: 'none', display: 'inline-block', marginTop: '1rem',
}
