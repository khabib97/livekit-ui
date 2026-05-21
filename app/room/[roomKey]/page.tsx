'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'
import MeetingRoom from '@/components/MeetingRoom'

// Extract the leading subdomain from the current hostname.
// "acme.gomeeting.video" → "acme"
// "gomeeting.video"      → ""  (no subdomain — direct domain access)
function getSubdomain(): string {
  if (typeof window === 'undefined') return ''
  const parts = window.location.hostname.split('.')
  return parts.length >= 3 ? parts[0] : ''
}

function RoomContent({ roomKey }: { roomKey: string }) {
  const params = useSearchParams()
  const initialToken = params.get('token')

  const [token, setToken] = useState<string | null>(initialToken)
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // True when a management access token is present in localStorage (logged-in user).
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('access_token'))
  }, [])

  if (token) {
    return <MeetingRoom token={token} />
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const subdomain = getSubdomain()
    const accessToken = localStorage.getItem('access_token')

    if (!accessToken && !name.trim()) {
      setError('Please enter your name.')
      return
    }

    setJoining(true)
    setError(null)

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const body: Record<string, string> = { subdomain, room_key: roomKey }
      if (!accessToken) body['name'] = name.trim()

      const res = await fetch('/api/v1/meeting/join', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? `Error ${res.status}`)
      setToken(data.token)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join. Please try again.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#111',
    }}>
      <form onSubmit={handleJoin} style={{
        background: '#1e1e1e', padding: '2rem', borderRadius: '12px',
        display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '320px',
      }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
          Join Meeting
        </h2>

        {isLoggedIn ? (
          <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.875rem' }}>
            You&apos;re joining as a registered user.
          </p>
        ) : (
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={joining}
            required
            autoFocus
            style={{
              padding: '0.75rem 1rem', borderRadius: '8px',
              border: '1px solid #333', background: '#2a2a2a',
              color: '#fff', fontSize: '1rem', outline: 'none',
            }}
          />
        )}

        {error && (
          <p style={{ color: '#f87171', margin: 0, fontSize: '0.875rem' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={joining || (!isLoggedIn && !name.trim())}
          style={{
            padding: '0.75rem', borderRadius: '8px', border: 'none',
            background: joining || (!isLoggedIn && !name.trim()) ? '#374151' : '#2563eb',
            color: '#fff', fontSize: '1rem',
            cursor: joining || (!isLoggedIn && !name.trim()) ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {joining ? 'Joining…' : 'Join'}
        </button>
      </form>
    </div>
  )
}

export default function RoomPage({ params }: { params: { roomKey: string } }) {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#111',
      }}>
        <p style={{ color: '#888' }}>Loading…</p>
      </div>
    }>
      <RoomContent roomKey={params.roomKey} />
    </Suspense>
  )
}
