'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function VerifyEmailContent() {
  const params = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No token provided.')
      return
    }
    fetch(`/api/v1/auth/verify-email?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.status?.includes('pending')) {
          setStatus('pending')
        } else {
          setStatus('success')
        }
        setMessage(data.status ?? data.detail ?? 'Done')
      })
      .catch(() => {
        setStatus('error')
        setMessage('Verification failed. The link may have expired.')
      })
  }, [token])

  return (
    <div style={page}>
      <div style={card}>
        {status === 'loading' && <p style={muted}>Verifying…</p>}
        {status === 'success' && (
          <>
            <h1 style={{ ...heading, color: '#4ade80' }}>Email verified</h1>
            <p style={muted}>{message}</p>
            <a href="/login" style={link}>Sign in now</a>
          </>
        )}
        {status === 'pending' && (
          <>
            <h1 style={{ ...heading, color: '#fbbf24' }}>Email verified</h1>
            <p style={muted}>{message}</p>
            <p style={muted}>You will receive an email once your account is approved.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 style={{ ...heading, color: '#f87171' }}>Verification failed</h1>
            <p style={muted}>{message}</p>
            <a href="/signup" style={link}>Back to sign up</a>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div style={page}><p style={{ color: '#888' }}>Loading…</p></div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}

const page: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', background: '#111',
}
const card: React.CSSProperties = {
  background: '#1e1e1e', borderRadius: '12px', padding: '2.5rem',
  border: '1px solid #2a2a2a', maxWidth: '420px', width: '100%', textAlign: 'center',
}
const heading: React.CSSProperties = {
  fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1rem',
}
const muted: React.CSSProperties = { color: '#9ca3af', lineHeight: 1.6, margin: '0.5rem 0' }
const link: React.CSSProperties = {
  color: '#60a5fa', textDecoration: 'none', display: 'inline-block', marginTop: '1rem',
}
